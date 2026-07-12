import { describe, expect, it } from 'vitest'
import {
  calculateSIPFutureValue,
  computeAllocationAtMonth,
  createDefaultScenario,
  detectMilestones,
  projectPortfolio,
  runMonteCarloSimulation,
} from '../index.js'

describe('projection-engine', () => {
  it('calculates basic SIP future value correctly', () => {
    const fv = calculateSIPFutureValue(10_000, 12, 120)
    expect(fv).toBeGreaterThan(2_000_000)
    expect(fv).toBeLessThan(2_500_000)
  })

  it('projects portfolio with basic SIP config', () => {
    const config = createDefaultScenario()
    const result = projectPortfolio(config)
    expect(result.snapshots.length).toBeGreaterThan(0)
    expect(result.summary.finalCorpus).toBeGreaterThan(result.summary.totalInvested)
    expect(result.summary.wealthMultiplier).toBeGreaterThan(1)
  })

  it('applies step-up SIP correctly', () => {
    const base = createDefaultScenario()
    const withStepUp = createDefaultScenario({
      stepUp: { enabled: true, annualIncrementPercent: 10 },
    })
    const baseResult = projectPortfolio(base)
    const stepUpResult = projectPortfolio(withStepUp)
    expect(stepUpResult.summary.finalCorpus).toBeGreaterThan(
      baseResult.summary.finalCorpus,
    )
  })

  it('starts from existing portfolio value', () => {
    const config = createDefaultScenario({
      existingInvestments: {
        enabled: true,
        currentPortfolio: 1_000_000,
        lumpSums: [],
        futureLumpSums: [],
        existingMonthly: 0,
      },
    })
    const result = projectPortfolio(config)
    expect(result.snapshots[0]!.totalValue).toBe(1_000_000)
  })

  it('adjusts for inflation in real value view', () => {
    const config = createDefaultScenario({
      inflation: { enabled: true, rate: 6, viewMode: 'real' },
    })
    const result = projectPortfolio(config)
    const final = result.snapshots[result.snapshots.length - 1]!
    expect(final.realValue).toBeLessThan(final.totalValue)
  })

  it('computes multi-asset allocation', () => {
    const config = createDefaultScenario({
      multiAsset: {
        enabled: true,
        assetClasses: [
          {
            id: 'eq',
            name: 'Equity',
            order: 0,
            currentValue: 500_000,
            monthlyInvestment: 10_000,
            expectedReturn: 12,
          },
          {
            id: 'debt',
            name: 'Debt',
            order: 1,
            currentValue: 500_000,
            monthlyInvestment: 5_000,
            expectedReturn: 7,
          },
        ],
      },
    })
    const result = projectPortfolio(config)
    const allocation = computeAllocationAtMonth(result, 0)
    expect(allocation).toHaveLength(2)
    expect(allocation[0]!.percentage).toBeCloseTo(50, 0)
  })
})

describe('milestones', () => {
  it('detects milestone hits', () => {
    const config = createDefaultScenario({
      basicSIP: {
        frequency: 'monthly',
        amount: 100_000,
        durationValue: 30,
        durationUnit: 'years',
        annualReturn: 12,
      },
      existingInvestments: {
        enabled: true,
        currentPortfolio: 5_000_000,
        lumpSums: [],
        futureLumpSums: [],
        existingMonthly: 0,
      },
    })
    const result = projectPortfolio(config)
    const milestones = detectMilestones(result)
    expect(milestones.some((m) => m.label === '50 Lakhs' && m.achieved)).toBe(true)
  })
})

describe('monte-carlo', () => {
  it('produces ordered percentiles', () => {
    const config = createDefaultScenario({
      monteCarlo: {
        ...createDefaultScenario().monteCarlo,
        enabled: true,
        simulations: 500,
      },
    })
    const result = runMonteCarloSimulation(config, {
      simulations: 200,
      seed: 123,
    })
    expect(result.percentile90[result.percentile90.length - 1]).toBeGreaterThanOrEqual(
      result.percentile50[result.percentile50.length - 1]!,
    )
    expect(result.percentile50[result.percentile50.length - 1]).toBeGreaterThanOrEqual(
      result.percentile25[result.percentile25.length - 1]!,
    )
    expect(result.percentile25[result.percentile25.length - 1]).toBeGreaterThanOrEqual(
      result.percentile10[result.percentile10.length - 1]!,
    )
    expect(result.probabilityOfTarget).toBeGreaterThanOrEqual(0)
    expect(result.probabilityOfTarget).toBeLessThanOrEqual(1)
  })
})
