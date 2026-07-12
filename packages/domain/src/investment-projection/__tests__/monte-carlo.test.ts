import { describe, expect, it } from 'vitest'
import {
  annualToGbmMonthlyParams,
  gbmMonthlyReturn,
  createDefaultScenario,
  runMonteCarloSimulation,
  completedInvestmentYears,
  stepUpMultiplier,
  interpolatedPercentile,
  buildHistogram,
  freedmanDiaconisBinCount,
  choleskyDecompose,
  buildCorrelationMatrix,
  createSimulationContext,
  simulatePath,
  createRng,
} from '../index.js'

describe('gbm', () => {
  it('applies volatility drag to drift', () => {
    const { drift, sigmaMonthly } = annualToGbmMonthlyParams(12, 18)
    const muMonthly = Math.log(1.12) / 12
    expect(drift).toBeCloseTo(muMonthly - (sigmaMonthly ** 2) / 2, 10)
  })

  it('produces log-normal returns via exp(drift + σZ) - 1', () => {
    const { drift, sigmaMonthly } = annualToGbmMonthlyParams(12, 18)
    const r = gbmMonthlyReturn(drift, sigmaMonthly, 0)
    expect(r).toBeCloseTo(Math.exp(drift) - 1, 10)
  })
})

describe('step-up timing', () => {
  it('does not step up during first 12 months', () => {
    expect(completedInvestmentYears(1)).toBe(0)
    expect(completedInvestmentYears(12)).toBe(0)
    expect(stepUpMultiplier(12, 10)).toBe(1)
  })

  it('steps up only after completing a full year', () => {
    expect(completedInvestmentYears(13)).toBe(1)
    expect(stepUpMultiplier(13, 10)).toBeCloseTo(1.1, 5)
    expect(stepUpMultiplier(24, 10)).toBeCloseTo(1.1, 5)
    expect(stepUpMultiplier(25, 10)).toBeCloseTo(1.21, 5)
  })
})

describe('statistics', () => {
  it('interpolates percentiles smoothly', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const p50 = interpolatedPercentile(data, 50)
    expect(p50).toBeCloseTo(5.5, 1)
  })

  it('uses Freedman–Diaconis for histogram bins', () => {
    const values = new Float64Array(1000)
    for (let i = 0; i < 1000; i++) values[i] = i
    const bins = freedmanDiaconisBinCount(values)
    expect(bins).toBeGreaterThan(5)
    expect(bins).toBeLessThanOrEqual(50)
  })

  it('builds dynamic histogram buckets', () => {
    const values = Float64Array.from({ length: 200 }, (_, i) => i * 1000)
    const hist = buildHistogram(values, (a, b) => `${a}-${b}`)
    expect(hist.length).toBeGreaterThan(0)
    expect(hist.reduce((s, b) => s + b.count, 0)).toBe(200)
  })
})

describe('correlation', () => {
  it('decomposes correlation matrix via Cholesky', () => {
    const matrix = buildCorrelationMatrix(['indian_equity', 'gold'])
    const L = choleskyDecompose(matrix)
    expect(L.length).toBe(2)
    expect(L[0]![0]).toBeCloseTo(1, 5)
  })
})

describe('monte-carlo engine', () => {
  const mc = (patch: Record<string, unknown> = {}) =>
    createDefaultScenario({
      monteCarlo: {
        ...createDefaultScenario().monteCarlo,
        enabled: true,
        simulations: 500,
        ...patch,
      },
    })

  it('is deterministic with the same seed', () => {
    const config = mc({ simulations: 100 })
    const a = runMonteCarloSimulation(config, { simulations: 100, seed: 99 })
    const b = runMonteCarloSimulation(config, { simulations: 100, seed: 99 })
    expect(a.percentile50[a.percentile50.length - 1]).toBe(
      b.percentile50[b.percentile50.length - 1],
    )
  })

  it('differs when seed changes', () => {
    const config = mc({ simulations: 200 })
    const a = runMonteCarloSimulation(config, { simulations: 200, seed: 1 })
    const b = runMonteCarloSimulation(config, { simulations: 200, seed: 10_000 })
    expect(a.percentile50[a.percentile50.length - 1]).not.toBe(
      b.percentile50[b.percentile50.length - 1],
    )
  })

  it('produces ordered percentile bands', () => {
    const config = createDefaultScenario({
      monteCarlo: {
        ...createDefaultScenario().monteCarlo,
        enabled: true,
        simulations: 300,
      },
      basicSIP: {
        frequency: 'monthly',
        amount: 20_000,
        durationValue: 15,
        durationUnit: 'years',
        annualReturn: 12,
      },
    })
    const result = runMonteCarloSimulation(config, { simulations: 300, seed: 42 })
    const last = result.percentile50.length - 1
    expect(result.percentile95[last]).toBeGreaterThanOrEqual(result.percentile75[last]!)
    expect(result.percentile75[last]).toBeGreaterThanOrEqual(result.percentile50[last]!)
    expect(result.percentile50[last]).toBeGreaterThanOrEqual(result.percentile25[last]!)
    expect(result.percentile25[last]).toBeGreaterThanOrEqual(result.percentile10[last]!)
    expect(result.probabilityOfTarget).toBeGreaterThanOrEqual(0)
    expect(result.probabilityOfTarget).toBeLessThanOrEqual(1)
  })

  it('tracks inflation-adjusted values when enabled', () => {
    const config = createDefaultScenario({
      inflation: { enabled: true, rate: 6, viewMode: 'real' },
      monteCarlo: {
        ...createDefaultScenario().monteCarlo,
        enabled: true,
        simulations: 100,
        trackInflation: true,
      },
    })
    const result = runMonteCarloSimulation(config, { simulations: 100, seed: 7 })
    const last = result.percentile50.length - 1
    expect(result.realPercentile50).toBeDefined()
    expect(result.realPercentile50![last]).toBeLessThan(result.percentile50[last]!)
  })

  it('produces rich monthly snapshots on median path', () => {
    const config = mc({ simulations: 100 })
    const result = runMonteCarloSimulation(config, { simulations: 50, seed: 5 })
    expect(result.medianPath).toBeDefined()
    expect(result.medianPath!.length).toBeGreaterThan(1)
    const snap = result.medianPath![result.medianPath!.length - 1]!
    expect(snap.portfolioValue).toBeGreaterThan(0)
    expect(snap.totalInvested).toBeGreaterThan(0)
    expect(snap.allocation).toBeDefined()
  })

  it('supports beginning-of-month contributions', () => {
    const base = createDefaultScenario().monteCarlo
    const endConfig = createDefaultScenario({
      monteCarlo: { ...base, enabled: true, simulations: 100, contributionTiming: 'end' },
    })
    const beginConfig = createDefaultScenario({
      monteCarlo: {
        ...base,
        enabled: true,
        simulations: 100,
        contributionTiming: 'beginning',
      },
    })
    const end = runMonteCarloSimulation(endConfig, { simulations: 100, seed: 11 })
    const begin = runMonteCarloSimulation(beginConfig, { simulations: 100, seed: 11 })
    const last = end.percentile50.length - 1
    expect(begin.percentile50[last]).not.toBe(end.percentile50[last])
  })

  it('correlation affects multi-asset outcomes vs independent', () => {
    const correlated = createDefaultScenario({
      multiAsset: {
        enabled: true,
        assetClasses: [
          {
            id: 'eq',
            name: 'Indian Equity',
            order: 0,
            currentValue: 500_000,
            monthlyInvestment: 10_000,
            expectedReturn: 12,
            volatility: 18,
          },
          {
            id: 'gold',
            name: 'Gold',
            order: 1,
            currentValue: 200_000,
            monthlyInvestment: 5_000,
            expectedReturn: 6,
            volatility: 14,
          },
        ],
      },
      monteCarlo: {
        ...createDefaultScenario().monteCarlo,
        enabled: true,
        simulations: 200,
        correlation: { enabled: true },
      },
    })
    const independent = createDefaultScenario({
      multiAsset: correlated.multiAsset,
      monteCarlo: {
        ...createDefaultScenario().monteCarlo,
        enabled: true,
        simulations: 200,
        correlation: { enabled: false },
      },
    })
    const corr = runMonteCarloSimulation(correlated, { simulations: 200, seed: 3 })
    const indep = runMonteCarloSimulation(independent, { simulations: 200, seed: 3 })
    const last = corr.percentile50.length - 1
    // Correlated equity/gold should produce different dispersion
    const corrSpread = corr.percentile90[last]! - corr.percentile10[last]!
    const indepSpread = indep.percentile90[last]! - indep.percentile10[last]!
    expect(corrSpread).not.toBeCloseTo(indepSpread, -2)
  })
})

describe('pipeline', () => {
  it('rebalances to target weights when enabled', () => {
    const config = createDefaultScenario({
      multiAsset: {
        enabled: true,
        assetClasses: [
          {
            id: 'eq',
            name: 'Indian Equity',
            order: 0,
            currentValue: 800_000,
            monthlyInvestment: 10_000,
            expectedReturn: 12,
          },
          {
            id: 'debt',
            name: 'Debt Funds',
            order: 1,
            currentValue: 200_000,
            monthlyInvestment: 5_000,
            expectedReturn: 7,
          },
        ],
      },
      monteCarlo: {
        ...createDefaultScenario().monteCarlo,
        enabled: true,
        rebalancing: { enabled: true, frequency: 'yearly' },
      },
    })
    const ctx = createSimulationContext(config)
    const path = simulatePath(ctx, createRng(0))
    const month12 = path.snapshots[12]
    expect(month12).toBeDefined()
    const eqAlloc = month12!.allocation['eq'] ?? 0
    const debtAlloc = month12!.allocation['debt'] ?? 0
    // After rebalance at month 12, should be closer to initial target weights
    expect(eqAlloc + debtAlloc).toBeCloseTo(100, 0)
  })
})
