import { addMonths, differenceInCalendarMonths, differenceInDays, format, isAfter, parseISO } from 'date-fns'
import type { InvestmentPlanInput, InvestmentPlanProjection, InvestmentPlanProjectionBundle, InvestmentPlanScenario, InvestmentPlanScenarioKind, InvestmentPlanSnapshot } from './investment-plan.schema.js'

type Bucket = { value: number; invested: number }
type AssetState = { value: number; invested: number; buckets: Record<string, Bucket> }

const round = (value: number) => Math.round(value * 100) / 100

function monthlyRate(annualBps: number): number {
  return (1 + annualBps / 10_000) ** (1 / 12) - 1
}

function xirr(cashFlows: { date: Date; amount: number }[]): number | null {
  if (!cashFlows.some((flow) => flow.amount < 0) || !cashFlows.some((flow) => flow.amount > 0)) return null
  const start = cashFlows[0]!.date
  const npv = (rate: number) => cashFlows.reduce((sum, flow) => sum + flow.amount / (1 + rate) ** (differenceInDays(flow.date, start) / 365), 0)
  let low = -0.9999
  let high = 10
  let lowValue = npv(low)
  let highValue = npv(high)
  while (lowValue * highValue > 0 && high < 1_000) { high *= 2; highValue = npv(high) }
  if (lowValue * highValue > 0) return null
  for (let i = 0; i < 100; i++) {
    const middle = (low + high) / 2
    const value = npv(middle)
    if (Math.abs(value) < 0.01) return middle
    if (lowValue * value <= 0) { high = middle } else { low = middle; lowValue = value }
  }
  return (low + high) / 2
}

function projectScenario(plan: InvestmentPlanInput, scenario: InvestmentPlanScenario, contributionMultiplier = 1): InvestmentPlanProjection {
  const start = parseISO(plan.startDate)
  const inflationBps = Math.max(0, plan.inflationRateBps + scenario.inflationDeltaBps)
  const goalIds = new Set(plan.goals.map((goal) => goal.id))
  const allocations = new Map(plan.assets.map((asset) => [asset.id, plan.goalAllocations.filter((allocation) => allocation.assetId === asset.id)]))
  const states = new Map<string, AssetState>()
  const warnings: string[] = []
  const cashFlows: { date: Date; amount: number }[] = []
  const initialTotal = plan.assets.reduce((sum, asset) => sum + asset.currentValue, 0)
  if (initialTotal > 0) cashFlows.push({ date: start, amount: -initialTotal })
  for (const asset of plan.assets) {
    const buckets: Record<string, Bucket> = { unallocated: { value: asset.currentValue, invested: asset.currentValue } }
    for (const allocation of allocations.get(asset.id) ?? []) {
      const share = allocation.currentValueAllocationBps / 10_000
      buckets[allocation.goalId] = { value: asset.currentValue * share, invested: asset.currentValue * share }
      buckets['unallocated']!.value -= asset.currentValue * share
      buckets['unallocated']!.invested -= asset.currentValue * share
    }
    states.set(asset.id, { value: asset.currentValue, invested: asset.currentValue, buckets })
  }
  const snapshots: InvestmentPlanSnapshot[] = []
  for (let month = 0; month <= plan.projectionHorizonMonths; month++) {
    const date = addMonths(start, month)
    let monthlyContribution = 0
    if (month > 0) {
      for (const asset of plan.assets) {
        const state = states.get(asset.id)!
        const annual = asset.returnBasis === 'real'
          ? ((1 + asset.expectedAnnualReturnBps / 10_000) * (1 + inflationBps / 10_000) - 1) * 10_000
          : asset.expectedAnnualReturnBps
        const scenarioAnnual = asset.growthModel === 'market_return' ? annual + scenario.marketReturnDeltaBps : annual
        const rate = monthlyRate(scenarioAnnual)
        const grow = () => {
          state.value *= 1 + rate
          for (const bucket of Object.values(state.buckets)) bucket.value *= 1 + rate
        }
        const applyContribution = () => {
          const ended = asset.contributionEndDate && isAfter(date, parseISO(asset.contributionEndDate))
          if (ended) return
          const escalation = (1 + asset.annualEscalationBps / 10_000) ** Math.floor((month - 1) / 12)
          const amount = asset.monthlyContribution * escalation * contributionMultiplier
          if (amount <= 0) return
          monthlyContribution += amount
          cashFlows.push({ date, amount: -amount })
          state.value += amount; state.invested += amount
          let allocated = 0
          for (const allocation of allocations.get(asset.id) ?? []) {
            const amountForGoal = amount * allocation.contributionAllocationBps / 10_000
            const bucket = state.buckets[allocation.goalId] ?? { value: 0, invested: 0 }
            bucket.value += amountForGoal; bucket.invested += amountForGoal; state.buckets[allocation.goalId] = bucket; allocated += amountForGoal
          }
          state.buckets['unallocated']!.value += amount - allocated; state.buckets['unallocated']!.invested += amount - allocated
        }
        if (plan.contributionTiming === 'beginning') applyContribution()
        grow()
        if (plan.contributionTiming === 'end') applyContribution()
        for (const event of plan.events.filter((entry) => entry.assetId === asset.id && format(parseISO(entry.effectiveDate), 'yyyy-MM') === format(date, 'yyyy-MM'))) {
          if (event.type === 'investment') {
            state.value += event.amount; state.invested += event.amount; cashFlows.push({ date, amount: -event.amount })
            state.buckets['unallocated']!.value += event.amount; state.buckets['unallocated']!.invested += event.amount
          } else {
            const withdrawal = Math.min(state.value, event.amount)
            if (withdrawal < event.amount) warnings.push(`${asset.name}: withdrawal on ${event.effectiveDate} exceeds projected balance`)
            const ratio = state.value > 0 ? withdrawal / state.value : 0
            state.value -= withdrawal; state.invested *= 1 - ratio; cashFlows.push({ date, amount: withdrawal })
            for (const bucket of Object.values(state.buckets)) { bucket.value *= 1 - ratio; bucket.invested *= 1 - ratio }
          }
        }
      }
    }
    const assetValues = Object.fromEntries(plan.assets.map((asset) => [asset.id, round(states.get(asset.id)!.value)]))
    const totalValue = [...states.values()].reduce((sum, state) => sum + state.value, 0)
    const invested = [...states.values()].reduce((sum, state) => sum + state.invested, 0)
    const goalValues: Record<string, number> = {}
    for (const goalId of goalIds) goalValues[goalId] = round([...states.values()].reduce((sum, state) => sum + (state.buckets[goalId]?.value ?? 0), 0))
    snapshots.push({ month, date: format(date, 'yyyy-MM-dd'), totalValue: round(totalValue), invested: round(invested), gains: round(totalValue - invested), realValue: round(totalValue / (1 + inflationBps / 10_000) ** (month / 12)), monthlyContribution: round(monthlyContribution), assetValues, goalValues })
  }
  const final = snapshots[snapshots.length - 1]!
  cashFlows.push({ date: parseISO(final.date), amount: final.totalValue })
  const goals = plan.goals.map((goal) => {
    const months = Math.max(0, differenceInCalendarMonths(parseISO(goal.targetDate), start))
    const inflation = (goal.inflationRateBps ?? inflationBps) / 10_000
    const todayTarget = goal.type === 'custom' ? goal.targetValueToday! : goal.annualSpendingToday! / (goal.safeWithdrawalRateBps! / 10_000)
    const targetValueNominal = todayTarget * (1 + inflation) ** (months / 12)
    const snapshot = snapshots[Math.min(plan.projectionHorizonMonths, months)]!
    const projectedValue = snapshot.goalValues[goal.id] ?? 0
    return { goalId: goal.id, targetValueNominal: round(targetValueNominal), projectedValue, gap: round(Math.max(0, targetValueNominal - projectedValue)), onTrack: projectedValue >= targetValueNominal }
  })
  const weighted = plan.assets.reduce((sum, asset) => sum + asset.expectedAnnualReturnBps * (asset.currentValue + asset.monthlyContribution), 0) /
    Math.max(1, plan.assets.reduce((sum, asset) => sum + asset.currentValue + asset.monthlyContribution, 0))
  return { scenario, snapshots, goals, warnings: [...new Set(warnings)], summary: {
    currentNetWorth: round(initialTotal), finalNominalValue: final.totalValue, finalRealValue: final.realValue,
    totalContributions: round(final.invested - initialTotal), totalGains: final.gains,
    weightedExpectedAnnualReturnBps: Math.round(weighted), projectedXirr: xirr(cashFlows),
  } }
}

export function projectInvestmentPlan(
  plan: InvestmentPlanInput,
  options: { includeSensitivity?: boolean } = {},
): InvestmentPlanProjectionBundle {
  const includeSensitivity = options.includeSensitivity ?? true
  const scenarioEntries = plan.scenarios.map((scenario) => [scenario.kind, projectScenario(plan, scenario)] as const)
  const scenarios = Object.fromEntries(scenarioEntries) as Record<InvestmentPlanScenarioKind, InvestmentPlanProjection>
  const sensitivity = includeSensitivity
    ? [-200, -100, 0, 100, 200].map((returnDeltaBps) => [-0.2, -0.1, 0, 0.1, 0.2].map((delta) => {
      const base = scenarios['base']!.scenario
      const result = projectScenario(plan, { ...base, marketReturnDeltaBps: base.marketReturnDeltaBps + returnDeltaBps }, 1 + delta)
      return { returnDeltaBps, contributionMultiplier: 1 + delta, finalRealValue: result.summary.finalRealValue, goalsOnTrack: result.goals.filter((goal) => goal.onTrack).length }
    }))
    : []
  return { base: scenarios['base']!, scenarios, sensitivity }
}
