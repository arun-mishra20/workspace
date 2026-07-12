import type { MonteCarloMonthSnapshot } from '../projection.schema.js'
import { gbmMonthlyReturn } from './gbm.js'
import { sampleCorrelatedNormals, sampleStandardNormal } from './rng.js'
import type {
  PathResult,
  PathState,
  ResolvedSimulationAsset,
  SimulationContext,
} from './types.js'

/** Completed investment years — step-up applies only after 12 full months */
export function completedInvestmentYears(month: number): number {
  if (month <= 0) return 0
  return Math.floor((month - 1) / 12)
}

export function stepUpMultiplier(
  month: number,
  annualIncrementPercent: number,
): number {
  const years = completedInvestmentYears(month)
  return (1 + annualIncrementPercent / 100) ** years
}

function totalPortfolioValue(values: Float64Array): number {
  let sum = 0
  for (let i = 0; i < values.length; i++) sum += values[i]!
  return sum
}

function computeTargetWeights(assets: ResolvedSimulationAsset[]): Float64Array {
  const weights = new Float64Array(assets.length)
  let total = 0
  for (let i = 0; i < assets.length; i++) {
    const w = assets[i]!.currentValue + assets[i]!.monthlyInvestment
    weights[i] = w
    total += w
  }
  if (total === 0) {
    const each = assets.length > 0 ? 1 / assets.length : 0
    weights.fill(each)
    return weights
  }
  for (let i = 0; i < weights.length; i++) weights[i] = weights[i]! / total
  return weights
}

export function rebalanceIntervalMonths(
  frequency: 'yearly' | 'half-yearly' | 'quarterly',
): number {
  switch (frequency) {
    case 'quarterly':
      return 3
    case 'half-yearly':
      return 6
    default:
      return 12
  }
}

/** Stage 1: correlated GBM market returns */
function generateMarketReturns(
  ctx: SimulationContext,
  rng: () => number,
  scratchZ: Float64Array,
): Float64Array {
  const n = ctx.assets.length
  const returns = new Float64Array(n)

  for (let i = 0; i < n; i++) {
    scratchZ[i] = sampleStandardNormal(rng)
  }

  const correlatedZ = ctx.correlationEnabled
    ? sampleCorrelatedNormals(ctx.choleskyL, scratchZ)
    : scratchZ

  for (let i = 0; i < n; i++) {
    const asset = ctx.assets[i]!
    returns[i] = gbmMonthlyReturn(asset.drift, asset.sigmaMonthly, correlatedZ[i]!)
  }

  return returns
}

/** Stage 2: grow portfolio by market returns */
function applyInvestmentGrowth(
  state: PathState,
  marketReturns: Float64Array,
): void {
  let weightedReturn = 0
  const total = totalPortfolioValue(state.values)

  for (let i = 0; i < state.values.length; i++) {
    const before = state.values[i]!
    state.values[i] = before * (1 + marketReturns[i]!)
  }

  const after = totalPortfolioValue(state.values)
  state.monthlyReturn = total > 0 ? (after - total) / total : 0
  weightedReturn = state.monthlyReturn
  void weightedReturn
}

/** Stage 3: deduct fees */
function applyFees(state: PathState, ctx: SimulationContext): void {
  if (!ctx.feesEnabled) return

  for (let i = 0; i < state.values.length; i++) {
    const drag =
      ctx.monthlyExpenseDrag[i]! +
      ctx.monthlyAdvisoryDrag[i]! +
      ctx.monthlyBrokerageDrag[i]!
    state.values[i] = state.values[i]! * (1 - drag)
  }

  if (ctx.monthlyMaintenanceDrag > 0) {
    const total = totalPortfolioValue(state.values)
    if (total > 0) {
      const deduction = Math.min(total, ctx.monthlyMaintenanceDrag)
      for (let i = 0; i < state.values.length; i++) {
        const share = state.values[i]! / total
        state.values[i] = state.values[i]! - deduction * share
      }
    }
  }
}

/** Stage 4: advance inflation factor (purchasing power erosion) */
function advanceInflation(state: PathState, ctx: SimulationContext): void {
  if (!ctx.trackInflation || ctx.monthlyInflationRate === 0) return
  state.cumulativeInflationFactor *= 1 + ctx.monthlyInflationRate
}

/** Compute per-asset SIP amounts for this month */
function computeContributions(
  ctx: SimulationContext,
  month: number,
): Float64Array {
  const contributions = new Float64Array(ctx.assets.length)
  const { stepUp } = ctx.config
  const multiplier = stepUp.enabled
    ? stepUpMultiplier(month, stepUp.annualIncrementPercent)
    : 1

  for (let i = 0; i < ctx.assets.length; i++) {
    contributions[i] = ctx.assets[i]!.monthlyInvestment * multiplier
  }

  return contributions
}

/** Stage 5: apply SIP contributions */
function applyContributions(
  state: PathState,
  contributions: Float64Array,
): void {
  let total = 0
  for (let i = 0; i < state.values.length; i++) {
    state.values[i] = state.values[i]! + contributions[i]!
    state.invested[i] = state.invested[i]! + contributions[i]!
    state.costBasis[i] = state.costBasis[i]! + contributions[i]!
    total += contributions[i]!
  }
  state.monthlyContribution = total
}

/** Stage 7: scheduled lump-sum investments */
function applyLumpSums(state: PathState, ctx: SimulationContext, month: number): void {
  const lump = ctx.lumpSumByMonth.get(month)
  if (!lump || lump <= 0) return

  const total = totalPortfolioValue(state.values)
  if (total > 0) {
    for (let i = 0; i < state.values.length; i++) {
      const share = state.values[i]! / total
      state.values[i] = state.values[i]! + lump * share
      state.invested[i] = state.invested[i]! + lump * share
      state.costBasis[i] = state.costBasis[i]! + lump * share
    }
  } else {
    const each = lump / state.values.length
    for (let i = 0; i < state.values.length; i++) {
      state.values[i] = state.values[i]! + each
      state.invested[i] = state.invested[i]! + each
      state.costBasis[i] = state.costBasis[i]! + each
    }
  }
  state.monthlyContribution += lump
}

/** Stage 8: rebalance to target weights */
function applyRebalancing(state: PathState, ctx: SimulationContext): void {
  const total = totalPortfolioValue(state.values)
  if (total <= 0) return

  for (let i = 0; i < state.values.length; i++) {
    state.values[i] = total * ctx.targetWeights[i]!
  }
}

/** Extension point — future tax handlers */
function applyTaxHandlers(state: PathState, ctx: SimulationContext): void {
  if (ctx.taxHandlers.length === 0) return
  const taxCtx = { month: state.month, state, assets: ctx.assets }
  for (const handler of ctx.taxHandlers) {
    handler(taxCtx)
  }
}

function buildSnapshot(
  state: PathState,
  ctx: SimulationContext,
): MonteCarloMonthSnapshot {
  const portfolioValue = totalPortfolioValue(state.values)
  let totalInvested = 0
  for (let i = 0; i < state.invested.length; i++) totalInvested += state.invested[i]!

  const assetBreakdown: Record<string, number> = {}
  const allocation: Record<string, number> = {}
  for (let i = 0; i < ctx.assets.length; i++) {
    const asset = ctx.assets[i]!
    const value = state.values[i]!
    assetBreakdown[asset.id] = value
    allocation[asset.id] =
      portfolioValue > 0
        ? Math.round((value / portfolioValue) * 1000) / 10
        : 0
  }

  const inflationAdjustedValue =
    ctx.trackInflation && state.cumulativeInflationFactor > 0
      ? portfolioValue / state.cumulativeInflationFactor
      : portfolioValue

  return {
    month: state.month,
    totalInvested,
    portfolioValue,
    inflationAdjustedValue,
    portfolioGain: portfolioValue - totalInvested,
    assetBreakdown,
    monthlyContribution: state.monthlyContribution,
    monthlyReturn: state.monthlyReturn,
    allocation,
  }
}

function createInitialState(ctx: SimulationContext): PathState {
  const n = ctx.assets.length
  const values = new Float64Array(n)
  const invested = new Float64Array(n)
  const costBasis = new Float64Array(n)

  for (let i = 0; i < n; i++) {
    values[i] = ctx.assets[i]!.currentValue
    invested[i] = ctx.assets[i]!.currentValue
    costBasis[i] = ctx.assets[i]!.currentValue
  }

  return {
    month: 0,
    values,
    invested,
    costBasis,
    cumulativeInflationFactor: 1,
    monthlyContribution: 0,
    monthlyReturn: 0,
  }
}

/** Run one full simulation path */
export function simulatePath(
  ctx: SimulationContext,
  rng: () => number,
): PathResult {
  const state = createInitialState(ctx)
  const snapshots: MonteCarloMonthSnapshot[] = [
    buildSnapshot(state, ctx),
  ]

  const scratchZ = new Float64Array(ctx.assets.length)
  const { rebalancing } = ctx.config.monteCarlo

  for (let month = 1; month <= ctx.horizonMonths; month++) {
    state.month = month
    state.monthlyContribution = 0
    state.monthlyReturn = 0

    const contributions = computeContributions(ctx, month)

    // Beginning-of-month SIP: invest before growth
    if (ctx.contributionAtBeginning) {
      applyContributions(state, contributions)
    }

    const marketReturns = generateMarketReturns(ctx, rng, scratchZ)
    applyInvestmentGrowth(state, marketReturns)
    applyFees(state, ctx)
    advanceInflation(state, ctx)

    // End-of-month SIP (default)
    if (!ctx.contributionAtBeginning) {
      applyContributions(state, contributions)
    }

    applyLumpSums(state, ctx, month)
    applyTaxHandlers(state, ctx)

    if (
      rebalancing.enabled &&
      month > 0 &&
      month % ctx.rebalanceIntervalMonths === 0
    ) {
      applyRebalancing(state, ctx)
    }

    snapshots.push(buildSnapshot(state, ctx))
  }

  const last = snapshots[snapshots.length - 1]!
  return {
    snapshots,
    finalValue: last.portfolioValue,
    finalRealValue: last.inflationAdjustedValue,
  }
}

export function buildTargetWeights(assets: ResolvedSimulationAsset[]): Float64Array {
  return computeTargetWeights(assets)
}
