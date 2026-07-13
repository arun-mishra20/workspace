import { describe, expect, it } from 'vitest'

import { createDefaultInvestmentPlan, createDefaultPlanScenarios, projectInvestmentPlan } from '../index.js'
import { InvestmentPlanInputSchema } from '../investment-plan.schema.js'

import type { InvestmentPlanInput } from '../investment-plan.schema.js'

function basePlan(overrides: Partial<InvestmentPlanInput> = {}): InvestmentPlanInput {
  const plan = createDefaultInvestmentPlan()
  const asset = {
    id: 'asset-1',
    category: 'indian_equity' as const,
    name: 'Equity',
    currentValue: 100_000,
    monthlyContribution: 0,
    annualEscalationBps: 0,
    expectedAnnualReturnBps: 1_200,
    returnBasis: 'nominal' as const,
    growthModel: 'market_return' as const,
    order: 0,
  }
  const { assets: overrideAssets, ...rest } = overrides
  return {
    ...plan,
    startDate: '2026-01-01',
    projectionHorizonMonths: 12,
    inflationRateBps: 600,
    contributionTiming: 'end',
    events: [],
    goals: [],
    goalAllocations: [],
    scenarios: createDefaultPlanScenarios(),
    ...rest,
    assets: overrideAssets ?? [asset],
  }
}

describe('investment plan engine', () => {
  it('compounds a lump sum to the exact effective annual return after 12 months', () => {
    const result = projectInvestmentPlan(basePlan()).base
    expect(result.summary.finalNominalValue).toBe(112_000)
    expect(result.summary.totalContributions).toBe(0)
    expect(result.summary.totalGains).toBe(12_000)
  })

  it('adds end-of-month contributions with zero return', () => {
    const plan = basePlan({
      assets: [{
        id: 'asset-1', category: 'indian_equity', name: 'Equity', order: 0,
        currentValue: 100_000, monthlyContribution: 10_000, annualEscalationBps: 0,
        expectedAnnualReturnBps: 0, returnBasis: 'nominal', growthModel: 'market_return',
      }],
    })
    const result = projectInvestmentPlan(plan).base
    expect(result.summary.finalNominalValue).toBe(220_000)
    expect(result.summary.totalContributions).toBe(120_000)
  })

  it('applies beginning-of-month contributions before growth', () => {
    const shared = {
      id: 'asset-1', category: 'indian_equity' as const, name: 'Equity', order: 0,
      currentValue: 100_000, monthlyContribution: 10_000, annualEscalationBps: 0,
      expectedAnnualReturnBps: 1_200, returnBasis: 'nominal' as const, growthModel: 'market_return' as const,
    }
    const end = projectInvestmentPlan(basePlan({ contributionTiming: 'end', assets: [shared] })).base
    const beginning = projectInvestmentPlan(basePlan({ contributionTiming: 'beginning', assets: [shared] })).base
    expect(beginning.summary.finalNominalValue).toBeGreaterThan(end.summary.finalNominalValue)
  })

  it('preserves capital with zero return and shrinks with negative return', () => {
    const zero = projectInvestmentPlan(basePlan({
      assets: [{
        id: 'asset-1', category: 'debt', name: 'Debt', order: 0,
        currentValue: 50_000, monthlyContribution: 0, annualEscalationBps: 0,
        expectedAnnualReturnBps: 0, returnBasis: 'nominal', growthModel: 'fixed_rate',
      }],
    })).base
    expect(zero.summary.finalNominalValue).toBe(50_000)

    const negative = projectInvestmentPlan(basePlan({
      assets: [{
        id: 'asset-1', category: 'debt', name: 'Debt', order: 0,
        currentValue: 100_000, monthlyContribution: 0, annualEscalationBps: 0,
        expectedAnnualReturnBps: -1_000, returnBasis: 'nominal', growthModel: 'fixed_rate',
      }],
    })).base
    expect(negative.summary.finalNominalValue).toBe(90_000)
  })

  it('escalates contributions annually and stops after contributionEndDate', () => {
    const escalated = projectInvestmentPlan(basePlan({
      projectionHorizonMonths: 24,
      assets: [{
        id: 'asset-1', category: 'indian_equity', name: 'Equity', order: 0,
        currentValue: 0, monthlyContribution: 10_000, annualEscalationBps: 1_000,
        expectedAnnualReturnBps: 0, returnBasis: 'nominal', growthModel: 'market_return',
      }],
    })).base
    // Year 1: 12 * 10_000; Year 2: 12 * 11_000
    expect(escalated.summary.totalContributions).toBe(252_000)
    expect(escalated.summary.finalNominalValue).toBe(252_000)

    const ended = projectInvestmentPlan(basePlan({
      projectionHorizonMonths: 12,
      assets: [{
        id: 'asset-1', category: 'indian_equity', name: 'Equity', order: 0,
        currentValue: 0, monthlyContribution: 10_000, contributionEndDate: '2026-04-01',
        annualEscalationBps: 0, expectedAnnualReturnBps: 0, returnBasis: 'nominal', growthModel: 'market_return',
      }],
    })).base
    // Contributions on Feb, Mar, Apr (end timing); May+ stopped because isAfter(May, Apr-01)
    expect(ended.summary.totalContributions).toBe(30_000)
  })

  it('applies one-time investments and flags unfunded withdrawals', () => {
    const invested = projectInvestmentPlan(basePlan({
      assets: [{
        id: 'asset-1', category: 'indian_equity', name: 'Equity', order: 0,
        currentValue: 10_000, monthlyContribution: 0, annualEscalationBps: 0,
        expectedAnnualReturnBps: 0, returnBasis: 'nominal', growthModel: 'market_return',
      }],
      events: [{ id: 'evt-1', assetId: 'asset-1', type: 'investment', effectiveDate: '2026-06-15', amount: 5_000 }],
    })).base
    expect(invested.summary.finalNominalValue).toBe(15_000)
    expect(invested.summary.totalContributions).toBe(5_000)

    const overdrawn = projectInvestmentPlan(basePlan({
      assets: [{
        id: 'asset-1', category: 'indian_equity', name: 'Equity', order: 0,
        currentValue: 10_000, monthlyContribution: 0, annualEscalationBps: 0,
        expectedAnnualReturnBps: 0, returnBasis: 'nominal', growthModel: 'market_return',
      }],
      events: [{ id: 'withdrawal', assetId: 'asset-1', type: 'withdrawal', effectiveDate: '2026-08-01', amount: 50_000 }],
    })).base
    expect(overdrawn.summary.finalNominalValue).toBe(0)
    expect(overdrawn.warnings).toHaveLength(1)
  })

  it('reports real value using plan inflation and normalizes real return inputs', () => {
    const nominal = projectInvestmentPlan(basePlan({
      inflationRateBps: 600,
      assets: [{
        id: 'asset-1', category: 'indian_equity', name: 'Equity', order: 0,
        currentValue: 100_000, monthlyContribution: 0, annualEscalationBps: 0,
        expectedAnnualReturnBps: 1_200, returnBasis: 'nominal', growthModel: 'market_return',
      }],
    })).base
    expect(nominal.summary.finalRealValue).toBe(Math.round(112_000 / 1.06 * 100) / 100)

    const realInput = projectInvestmentPlan(basePlan({
      inflationRateBps: 600,
      assets: [{
        id: 'asset-1', category: 'indian_equity', name: 'Equity', order: 0,
        currentValue: 100_000, monthlyContribution: 0, annualEscalationBps: 0,
        expectedAnnualReturnBps: 1_200, returnBasis: 'real', growthModel: 'market_return',
      }],
    })).base
    // nominal annual = 1.12 * 1.06 - 1 = 18.72%
    expect(realInput.summary.finalNominalValue).toBe(118_720)
  })

  it('keeps goal buckets separate and never double counts allocations', () => {
    const plan = basePlan({
      assets: [{
        id: 'asset-1', category: 'indian_equity', name: 'Equity', order: 0,
        currentValue: 100_000, monthlyContribution: 0, annualEscalationBps: 0,
        expectedAnnualReturnBps: 0, returnBasis: 'nominal', growthModel: 'market_return',
      }],
      goals: [{ id: 'goal', name: 'House', type: 'custom', targetDate: '2027-01-01', targetValueToday: 100_000 }],
      goalAllocations: [{
        id: 'allocation', assetId: 'asset-1', goalId: 'goal',
        currentValueAllocationBps: 6_000, contributionAllocationBps: 6_000,
      }],
    })
    const result = projectInvestmentPlan(plan).base
    expect(result.goals[0]!.projectedValue).toBe(60_000)
    expect(result.goals[0]!.projectedValue).toBeLessThan(result.summary.finalNominalValue)
  })

  it('derives FI targets from spending and safe withdrawal rate', () => {
    const plan = basePlan({
      projectionHorizonMonths: 24,
      assets: [{
        id: 'asset-1', category: 'indian_equity', name: 'Equity', order: 0,
        currentValue: 16_000_000, monthlyContribution: 0, annualEscalationBps: 0,
        expectedAnnualReturnBps: 0, returnBasis: 'nominal', growthModel: 'market_return',
      }],
      goals: [{
        id: 'fi', name: 'FI', type: 'financial_independence', targetDate: '2027-01-01',
        annualSpendingToday: 600_000, safeWithdrawalRateBps: 400, inflationRateBps: 0,
      }],
      goalAllocations: [{
        id: 'allocation', assetId: 'asset-1', goalId: 'fi',
        currentValueAllocationBps: 10_000, contributionAllocationBps: 10_000,
      }],
    })
    const result = projectInvestmentPlan(plan).base
    // target today = 600_000 / 0.04 = 15_000_000; inflation override 0
    expect(result.goals[0]!.targetValueNominal).toBe(15_000_000)
    expect(result.goals[0]!.projectedValue).toBe(16_000_000)
    expect(result.goals[0]!.onTrack).toBe(true)
    expect(result.goals[0]!.gap).toBe(0)
  })

  it('applies scenario return deltas only to market_return assets', () => {
    const plan = basePlan({
      assets: [
        {
          id: 'market', category: 'indian_equity', name: 'Equity', order: 0,
          currentValue: 100_000, monthlyContribution: 0, annualEscalationBps: 0,
          expectedAnnualReturnBps: 1_000, returnBasis: 'nominal', growthModel: 'market_return',
        },
        {
          id: 'fixed', category: 'fixed_deposit', name: 'FD', order: 1,
          currentValue: 100_000, monthlyContribution: 0, annualEscalationBps: 0,
          expectedAnnualReturnBps: 700, returnBasis: 'nominal', growthModel: 'fixed_rate',
        },
      ],
    })
    const bundle = projectInvestmentPlan(plan)
    expect(bundle.scenarios.optimistic.summary.finalNominalValue)
      .toBeGreaterThan(bundle.scenarios.base.summary.finalNominalValue)
    expect(bundle.scenarios.conservative.summary.finalNominalValue)
      .toBeLessThan(bundle.scenarios.base.summary.finalNominalValue)
    expect(bundle.scenarios.optimistic.snapshots.at(-1)!.assetValues['fixed'])
      .toBe(bundle.scenarios.base.snapshots.at(-1)!.assetValues['fixed'])
    expect(bundle.scenarios.optimistic.snapshots.at(-1)!.assetValues['market'])
      .toBeGreaterThan(bundle.scenarios.base.snapshots.at(-1)!.assetValues['market']!)
  })

  it('computes projected XIRR for funded plans and null when cash flows are one-sided', () => {
    const funded = projectInvestmentPlan(basePlan()).base
    expect(funded.summary.projectedXirr).not.toBeNull()
    expect(funded.summary.projectedXirr!).toBeCloseTo(0.12, 3)

    const empty = projectInvestmentPlan(basePlan({
      assets: [{
        id: 'asset-1', category: 'cash', name: 'Cash', order: 0,
        currentValue: 0, monthlyContribution: 0, annualEscalationBps: 0,
        expectedAnnualReturnBps: 0, returnBasis: 'nominal', growthModel: 'fixed_rate',
      }],
    })).base
    expect(empty.summary.projectedXirr).toBeNull()
  })

  it('builds a 5x5 sensitivity matrix with a golden center cell', () => {
    const bundle = projectInvestmentPlan(basePlan())
    expect(bundle.sensitivity).toHaveLength(5)
    expect(bundle.sensitivity.every((row) => row.length === 5)).toBe(true)
    const center = bundle.sensitivity[2]![2]!
    expect(center.returnDeltaBps).toBe(0)
    expect(center.contributionMultiplier).toBe(1)
    expect(center.finalRealValue).toBe(bundle.base.summary.finalRealValue)
  })

  it('requires unique conservative, base, and optimistic scenarios', () => {
    const plan = basePlan()
    plan.scenarios = [
      { id: 'a', kind: 'base', name: 'Base', marketReturnDeltaBps: 0, inflationDeltaBps: 0 },
      { id: 'b', kind: 'base', name: 'Base 2', marketReturnDeltaBps: 0, inflationDeltaBps: 0 },
      { id: 'c', kind: 'optimistic', name: 'Optimistic', marketReturnDeltaBps: 200, inflationDeltaBps: -100 },
    ]
    const parsed = InvestmentPlanInputSchema.safeParse(plan)
    expect(parsed.success).toBe(false)
  })
})
