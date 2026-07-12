import { addMonths, format } from 'date-fns'
import type {
  AllocationSnapshot,
  AssetClass,
  InflationScenarioPoint,
  InvestmentFrequency,
  ProjectionConfig,
  ProjectionMonthSnapshot,
  ProjectionResult,
  ScenarioComparisonPoint,
  SummaryMetrics,
} from './projection.schema.js'
import { timelinePresetToMonths } from './defaults.js'

interface AssetState {
  id: string
  name: string
  value: number
  invested: number
}

function frequencyToMonthlyMultiplier(frequency: InvestmentFrequency): number {
  switch (frequency) {
    case 'weekly':
      return 52 / 12
    case 'quarterly':
      return 1 / 3
    case 'yearly':
      return 1 / 12
    default:
      return 1
  }
}

function getDurationMonths(config: ProjectionConfig): number {
  const { durationValue, durationUnit } = config.basicSIP
  return durationUnit === 'years' ? durationValue * 12 : durationValue
}

function getHorizonMonths(config: ProjectionConfig): number {
  const durationMonths = getDurationMonths(config)
  return timelinePresetToMonths(
    config.timeline.preset,
    config.timeline.customMonths,
    durationMonths,
  )
}

function getStepUpMultiplier(
  month: number,
  annualIncrementPercent: number,
): number {
  if (month <= 0) return 1
  const completedYears = Math.floor((month - 1) / 12)
  return (1 + annualIncrementPercent / 100) ** completedYears
}

function getMonthlyContribution(
  config: ProjectionConfig,
  asset: AssetClass | null,
  month: number,
): number {
  const { basicSIP, stepUp, existingInvestments, multiAsset } = config

  if (multiAsset.enabled && asset) {
    let contribution = asset.monthlyInvestment
    if (stepUp.enabled) {
      contribution *= getStepUpMultiplier(month, stepUp.annualIncrementPercent)
    }
    return contribution * frequencyToMonthlyMultiplier(basicSIP.frequency)
  }

  let amount = basicSIP.amount
  if (existingInvestments.enabled && existingInvestments.existingMonthly > 0) {
    amount += existingInvestments.existingMonthly
  }

  if (stepUp.enabled) {
    amount *= getStepUpMultiplier(month, stepUp.annualIncrementPercent)
  }

  return amount * frequencyToMonthlyMultiplier(basicSIP.frequency)
}

function getMonthlyReturn(annualReturnPercent: number): number {
  return annualReturnPercent / 100 / 12
}

function buildAssetStates(config: ProjectionConfig): AssetState[] {
  const { multiAsset, existingInvestments } = config

  if (multiAsset.enabled && multiAsset.assetClasses.length > 0) {
    return [...multiAsset.assetClasses]
      .sort((a, b) => a.order - b.order)
      .map((asset) => ({
        id: asset.id,
        name: asset.name,
        value: asset.currentValue,
        invested: asset.currentValue,
      }))
  }

  const startingValue = existingInvestments.enabled
    ? existingInvestments.currentPortfolio
    : 0

  return [
    {
      id: 'portfolio',
      name: 'Portfolio',
      value: startingValue,
      invested: startingValue,
    },
  ]
}

function getAssetReturn(config: ProjectionConfig, assetId: string): number {
  const asset = config.multiAsset.assetClasses.find((a) => a.id === assetId)
  if (asset) {
    return getMonthlyReturn(asset.expectedReturn)
  }
  return getMonthlyReturn(config.basicSIP.annualReturn)
}

function getAssetExpenseRatio(config: ProjectionConfig, assetId: string): number {
  const asset = config.multiAsset.assetClasses.find((a) => a.id === assetId)
  const ratio = asset?.expenseRatio ?? config.advanced.expenseRatio
  return ratio / 100 / 12
}

function applyLumpSums(
  states: AssetState[],
  config: ProjectionConfig,
  month: number,
): void {
  const { existingInvestments, multiAsset } = config
  if (!existingInvestments.enabled) return

  const allLumpSums = [
    ...existingInvestments.lumpSums,
    ...existingInvestments.futureLumpSums,
  ]

  for (const lump of allLumpSums) {
    if (lump.month !== month) continue
    if (multiAsset.enabled) {
      const totalMonthly = states.reduce(
        (sum, s) =>
          sum +
          (config.multiAsset.assetClasses.find((a) => a.id === s.id)
            ?.monthlyInvestment ?? 0),
        0,
      )
      for (const state of states) {
        const asset = config.multiAsset.assetClasses.find((a) => a.id === state.id)
        const share =
          totalMonthly > 0
            ? (asset?.monthlyInvestment ?? 0) / totalMonthly
            : 1 / states.length
        state.value += lump.amount * share
        state.invested += lump.amount * share
      }
    } else {
      states[0]!.value += lump.amount
      states[0]!.invested += lump.amount
    }
  }
}

function applyBonusInvestments(
  states: AssetState[],
  config: ProjectionConfig,
  month: number,
): void {
  for (const bonus of config.advanced.bonusInvestments) {
    if (bonus.month !== month) continue
    if (config.multiAsset.enabled) {
      const perAsset = bonus.amount / states.length
      for (const state of states) {
        state.value += perAsset
        state.invested += perAsset
      }
    } else {
      states[0]!.value += bonus.amount
      states[0]!.invested += bonus.amount
    }
  }
}

function applyWithdrawals(
  states: AssetState[],
  config: ProjectionConfig,
  month: number,
): void {
  for (const withdrawal of config.advanced.withdrawalSchedule) {
    if (withdrawal.month !== month) continue
    let remaining = withdrawal.amount
    for (const state of states) {
      const take = Math.min(state.value, remaining)
      state.value -= take
      remaining -= take
      if (remaining <= 0) break
    }
  }
}

function applyTaxOnGains(
  states: AssetState[],
  config: ProjectionConfig,
): void {
  if (!config.advanced.tax.enabled) return
  for (const state of states) {
    const gains = Math.max(0, state.value - state.invested)
    const tax = gains * (config.advanced.tax.ltcgRate / 100)
    state.value -= tax
  }
}

function computeRealValue(
  nominal: number,
  month: number,
  inflationRate: number,
): number {
  const years = month / 12
  return nominal / (1 + inflationRate / 100) ** years
}

function createMonthLabel(month: number, startDate: Date): string {
  if (month === 0) return 'Today'
  return format(addMonths(startDate, month), 'MMM yyyy')
}

export function projectPortfolio(config: ProjectionConfig): ProjectionResult {
  const startDate = new Date()
  const horizonMonths = getHorizonMonths(config)
  const durationMonths = getDurationMonths(config)
  const projectionMonths = Math.max(horizonMonths, durationMonths)

  const states = buildAssetStates(config)
  const snapshots: ProjectionMonthSnapshot[] = []
  const skipSet = new Set(config.advanced.skipMonths)

  for (let month = 0; month <= projectionMonths; month++) {
    let monthlyContribution = 0

    if (month > 0) {
      for (const state of states) {
        const asset = config.multiAsset.assetClasses.find((a) => a.id === state.id)
        const monthlyReturn = getAssetReturn(config, state.id)
        const expenseRatio = getAssetExpenseRatio(config, state.id)

        if (!skipSet.has(month)) {
          const contribution = getMonthlyContribution(config, asset ?? null, month)
          monthlyContribution += contribution
          state.value = state.value * (1 + monthlyReturn - expenseRatio) + contribution
          state.invested += contribution
        } else {
          state.value = state.value * (1 + monthlyReturn - expenseRatio)
        }
      }

      applyLumpSums(states, config, month)
      applyBonusInvestments(states, config, month)
      applyWithdrawals(states, config, month)

      if (month % 12 === 0 && month > 0) {
        applyTaxOnGains(states, config)
      }
    }

    const totalValue = states.reduce((sum, s) => sum + s.value, 0)
    const totalInvested = states.reduce((sum, s) => sum + s.invested, 0)
    const totalGains = totalValue - totalInvested
    const inflationRate = config.inflation.enabled ? config.inflation.rate : 0

    const assetValues: Record<string, number> = {}
    const assetInvested: Record<string, number> = {}
    for (const state of states) {
      assetValues[state.id] = state.value
      assetInvested[state.id] = state.invested
    }

    snapshots.push({
      month,
      label: createMonthLabel(month, startDate),
      date: addMonths(startDate, month),
      totalValue,
      totalInvested,
      totalGains,
      realValue: computeRealValue(totalValue, month, inflationRate),
      assetValues,
      assetInvested,
      monthlyContribution,
    })
  }

  const summary = computeSummaryMetrics({
    config,
    horizonMonths,
    durationMonths,
    snapshots,
  })

  return {
    config,
    horizonMonths,
    snapshots,
    summary,
  }
}

export function computeSummaryMetrics(input: {
  config: ProjectionConfig
  horizonMonths: number
  durationMonths: number
  snapshots: ProjectionMonthSnapshot[]
}): SummaryMetrics {
  const { config, horizonMonths, durationMonths, snapshots } = input
  const targetMonth = Math.min(horizonMonths || durationMonths, snapshots.length - 1)
  const final = snapshots[targetMonth] ?? snapshots[snapshots.length - 1]!
  const initial = snapshots[0]!

  const totalInvested = final.totalInvested
  const finalCorpus = final.totalValue
  const estimatedReturns = final.totalGains
  const realFinalCorpus = final.realValue
  const inflationImpact = config.inflation.enabled
    ? finalCorpus - realFinalCorpus
    : 0

  const years = targetMonth / 12
  let cagr = 0
  if (years > 0 && totalInvested > 0) {
    cagr = ((finalCorpus / totalInvested) ** (1 / years) - 1) * 100
  } else if (years > 0 && initial.totalValue > 0) {
    cagr = ((finalCorpus / initial.totalValue) ** (1 / years) - 1) * 100
  }

  const wealthMultiplier =
    totalInvested > 0 ? finalCorpus / totalInvested : finalCorpus > 0 ? Infinity : 0

  return {
    totalInvested,
    estimatedReturns,
    finalCorpus,
    realFinalCorpus,
    cagr: Math.round(cagr * 100) / 100,
    wealthMultiplier: Math.round(wealthMultiplier * 10) / 10,
    inflationImpact,
  }
}

export function computeAllocationAtMonth(
  result: ProjectionResult,
  month: number,
): AllocationSnapshot[] {
  const snapshot = result.snapshots[month]
  if (!snapshot) return []

  const { config } = result
  const total = snapshot.totalValue

  if (config.multiAsset.enabled) {
    return config.multiAsset.assetClasses
      .sort((a, b) => a.order - b.order)
      .map((asset) => {
        const value = snapshot.assetValues[asset.id] ?? 0
        return {
          name: asset.name,
          value,
          percentage: total === 0 ? 0 : Math.round((value / total) * 1000) / 10,
        }
      })
      .filter((a) => a.value > 0 || config.multiAsset.enabled)
  }

  return [
    {
      name: 'Invested',
      value: snapshot.totalInvested,
      percentage:
        total === 0
          ? 0
          : Math.round((snapshot.totalInvested / total) * 1000) / 10,
    },
    {
      name: 'Gains',
      value: snapshot.totalGains,
      percentage:
        total === 0 ? 0 : Math.round((snapshot.totalGains / total) * 1000) / 10,
    },
  ]
}

export function compareScenarios(
  results: ProjectionResult[],
): ScenarioComparisonPoint[] {
  if (results.length === 0) return []

  const maxMonths = Math.max(...results.map((r) => r.snapshots.length))
  const points: ScenarioComparisonPoint[] = []

  for (let month = 0; month < maxMonths; month++) {
    const label =
      results[0]?.snapshots[month]?.label ?? `Month ${month}`
    const point: ScenarioComparisonPoint = { month, label }

    for (const result of results) {
      const snapshot = result.snapshots[month]
      const value =
        result.config.inflation.enabled &&
        result.config.inflation.viewMode === 'real'
          ? snapshot?.realValue ?? 0
          : snapshot?.totalValue ?? 0
      point[result.config.id] = value
      point[`${result.config.id}_name`] = result.config.name
    }

    points.push(point)
  }

  return points
}

export function applyInflationScenarios(
  result: ProjectionResult,
  rates: number[],
): InflationScenarioPoint[] {
  return result.snapshots.map((snapshot) => {
    const point: InflationScenarioPoint = {
      month: snapshot.month,
      label: snapshot.label,
      nominal: snapshot.totalValue,
    }
    for (const rate of rates) {
      point[`rate_${rate}`] = computeRealValue(snapshot.totalValue, snapshot.month, rate)
    }
    return point
  })
}

export function getChartSeries(result: ProjectionResult): {
  month: number
  label: string
  total: number
  invested: number
  gains: number
  real: number
  [assetId: string]: number | string
}[] {
  const useReal =
    result.config.inflation.enabled &&
    result.config.inflation.viewMode === 'real'

  return result.snapshots.map((snapshot) => {
    const point: Record<string, number | string> = {
      month: snapshot.month,
      label: snapshot.label,
      total: useReal ? snapshot.realValue : snapshot.totalValue,
      invested: snapshot.totalInvested,
      gains: snapshot.totalGains,
      real: snapshot.realValue,
    }

    for (const [assetId, value] of Object.entries(snapshot.assetValues)) {
      point[assetId] = value
    }

    return point as {
      month: number
      label: string
      total: number
      invested: number
      gains: number
      real: number
      [assetId: string]: number | string
    }
  })
}

/** Standard SIP future value formula for validation */
export function calculateSIPFutureValue(
  monthlyAmount: number,
  annualReturnPercent: number,
  months: number,
): number {
  if (months <= 0) return 0
  const r = annualReturnPercent / 100 / 12
  if (r === 0) return monthlyAmount * months
  return monthlyAmount * (((1 + r) ** months - 1) / r) * (1 + r)
}
