import type { MonteCarloResult, ProjectionConfig } from '../projection.schema.js'
import { timelinePresetToMonths } from '../defaults.js'
import { annualToGbmMonthlyParams } from './gbm.js'
import { buildCorrelationMatrix } from './correlation.js'
import { choleskyDecompose } from './rng.js'
import { simulatePath, rebalanceIntervalMonths, buildTargetWeights } from './pipeline.js'
import {
  buildHistogram,
  computePercentileBands,
  formatCompact,
} from './statistics.js'
import {
  classifyAsset,
  resolveAssetVolatility,
} from './volatility.js'
import type {
  ResolvedSimulationAsset,
  SimulationContext,
} from './types.js'
import { resolveAssetsFromConfig } from './types.js'
import { createRng } from './rng.js'

function getDurationMonths(config: ProjectionConfig): number {
  const { durationValue, durationUnit } = config.basicSIP
  return durationUnit === 'years' ? durationValue * 12 : durationValue
}

function resolveSimulationAssets(config: ProjectionConfig): ResolvedSimulationAsset[] {
  const rawAssets = resolveAssetsFromConfig(config)

  return rawAssets.map((asset) => {
    const annualVol = resolveAssetVolatility(asset)
    const { drift, sigmaMonthly } = annualToGbmMonthlyParams(
      asset.expectedReturn,
      annualVol,
    )

    return {
      id: asset.id,
      name: asset.name,
      category: classifyAsset(asset.name),
      currentValue: asset.currentValue,
      monthlyInvestment: asset.monthlyInvestment,
      annualReturnPercent: asset.expectedReturn,
      annualVolPercent: annualVol,
      expenseRatioPercent: asset.expenseRatio ?? config.advanced.expenseRatio,
      drift,
      sigmaMonthly,
    }
  })
}

function buildLumpSumMap(config: ProjectionConfig): Map<number, number> {
  const map = new Map<number, number>()
  const { existingInvestments, advanced } = config

  if (existingInvestments.enabled) {
    for (const lump of [
      ...existingInvestments.lumpSums,
      ...existingInvestments.futureLumpSums,
    ]) {
      map.set(lump.month, (map.get(lump.month) ?? 0) + lump.amount)
    }
  }

  for (const bonus of advanced.bonusInvestments) {
    map.set(bonus.month, (map.get(bonus.month) ?? 0) + bonus.amount)
  }

  return map
}

function buildSimulationContext(config: ProjectionConfig): SimulationContext {
  const assets = resolveSimulationAssets(config)
  const durationMonths = getDurationMonths(config)
  const horizonMonths = timelinePresetToMonths(
    config.timeline.preset,
    config.timeline.customMonths,
    durationMonths,
  )

  const categories = assets.map((a) => a.category)
  const correlationMatrix = buildCorrelationMatrix(categories)
  const choleskyL = choleskyDecompose(correlationMatrix)

  const mc = config.monteCarlo
  const fees = mc.fees
  const feesEnabled =
    fees.enabled &&
    (fees.expenseRatio > 0 ||
      fees.advisoryFee > 0 ||
      fees.brokerage > 0 ||
      fees.annualMaintenance > 0)

  const n = assets.length
  const monthlyExpenseDrag = new Float64Array(n)
  const monthlyAdvisoryDrag = new Float64Array(n)
  const monthlyBrokerageDrag = new Float64Array(n)

  for (let i = 0; i < n; i++) {
    const assetEr = assets[i]!.expenseRatioPercent / 100 / 12
    monthlyExpenseDrag[i] = feesEnabled
      ? assetEr + fees.expenseRatio / 100 / 12
      : assetEr
    monthlyAdvisoryDrag[i] = feesEnabled ? fees.advisoryFee / 100 / 12 : 0
    monthlyBrokerageDrag[i] = feesEnabled ? fees.brokerage / 100 / 12 : 0
  }

  const inflationEnabled = config.inflation.enabled && mc.trackInflation
  const monthlyInflationRate = inflationEnabled
    ? config.inflation.rate / 100 / 12
    : 0

  return {
    config,
    assets,
    horizonMonths,
    targetWeights: buildTargetWeights(assets),
    rebalanceIntervalMonths: rebalanceIntervalMonths(mc.rebalancing.frequency),
    monthlyInflationRate,
    trackInflation: inflationEnabled,
    contributionAtBeginning: mc.contributionTiming === 'beginning',
    correlationEnabled: mc.correlation.enabled && n > 1,
    choleskyL,
    feesEnabled,
    monthlyExpenseDrag,
    monthlyAdvisoryDrag,
    monthlyBrokerageDrag,
    monthlyMaintenanceDrag: feesEnabled ? fees.annualMaintenance / 12 : 0,
    lumpSumByMonth: buildLumpSumMap(config),
    taxHandlers: [],
  }
}

export function runMonteCarloSimulation(
  config: ProjectionConfig,
  options?: { simulations?: number; seed?: number },
): MonteCarloResult {
  const simulations = options?.simulations ?? config.monteCarlo.simulations
  const seed = options?.seed ?? 42
  const ctx = buildSimulationContext(config)

  const nominalPaths: Float64Array[] = []
  const realPaths: Float64Array[] = []
  const finalValues = new Float64Array(simulations)
  let medianPathIndex = 0

  for (let sim = 0; sim < simulations; sim++) {
    const pathRng = createRng(seed + sim)
    const path = simulatePath(ctx, pathRng)
    const nominal = new Float64Array(path.snapshots.length)
    const real = new Float64Array(path.snapshots.length)

    for (let m = 0; m < path.snapshots.length; m++) {
      nominal[m] = path.snapshots[m]!.portfolioValue
      real[m] = path.snapshots[m]!.inflationAdjustedValue
    }

    nominalPaths.push(nominal)
    realPaths.push(real)
    finalValues[sim] = path.finalValue
  }

  const bands = computePercentileBands(nominalPaths, ctx.horizonMonths)
  const realBands = ctx.trackInflation
    ? computePercentileBands(realPaths, ctx.horizonMonths)
    : null

  const medianFinal = bands.p50[bands.p50.length - 1] ?? 0
  let closestDist = Infinity
  for (let i = 0; i < simulations; i++) {
    const dist = Math.abs(finalValues[i]! - medianFinal)
    if (dist < closestDist) {
      closestDist = dist
      medianPathIndex = i
    }
  }

  const target = config.monteCarlo.targetCorpus ?? 50_000_000
  let hits = 0
  for (let i = 0; i < simulations; i++) {
    if (finalValues[i]! >= target) hits++
  }

  const sortedFinals = Float64Array.from(finalValues).sort()
  const histogram = buildHistogram(
    sortedFinals,
    (low, high) => `${formatCompact(low)}-${formatCompact(high)}`,
  )

  const medianPath = simulatePath(ctx, createRng(seed + medianPathIndex)).snapshots

  return {
    simulations,
    bestCase: bands.best,
    averageCase: bands.average,
    worstCase: bands.worst,
    percentile10: bands.p10,
    percentile25: bands.p25,
    percentile50: bands.p50,
    percentile75: bands.p75,
    percentile90: bands.p90,
    percentile95: bands.p95,
    realPercentile10: realBands?.p10,
    realPercentile50: realBands?.p50,
    realPercentile90: realBands?.p90,
    probabilityOfTarget: hits / simulations,
    finalDistribution: histogram,
    medianPath,
  }
}

/** Register a tax handler extension (future use) */
export function createSimulationContext(config: ProjectionConfig): SimulationContext {
  return buildSimulationContext(config)
}

export { completedInvestmentYears, stepUpMultiplier } from './pipeline.js'
