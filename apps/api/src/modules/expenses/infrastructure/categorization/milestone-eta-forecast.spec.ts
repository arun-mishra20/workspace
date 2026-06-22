import { describe, expect, it } from 'vitest'

import { computeMilestoneEtaForecast } from './milestone-eta-forecast'

describe('computeMilestoneEtaForecast', () => {
  it('does not project ETA beyond membership year end', () => {
    const forecast = computeMilestoneEtaForecast({
      currentSpend: 25_000,
      targetAmount: 300_000,
      periodStart: new Date('2025-06-30T00:00:00'),
      periodEndExclusive: new Date('2026-06-30T00:00:00'),
      now: new Date('2026-06-11T12:00:00'),
    })

    expect(forecast.estimatedCompletionDate).toBeNull()
    expect(forecast.onTrack).toBe(false)
    expect(forecast.periodEnd).toBe('2026-06-29')
    expect(forecast.daysLeftInPeriod).toBe(19)
    expect(forecast.requiredDailyRate).toBeGreaterThan(0)
  })

  it('returns ETA when completion falls within the period', () => {
    const forecast = computeMilestoneEtaForecast({
      currentSpend: 290_000,
      targetAmount: 300_000,
      periodStart: new Date('2025-06-30T00:00:00'),
      periodEndExclusive: new Date('2026-06-30T00:00:00'),
      now: new Date('2026-06-11T12:00:00'),
    })

    expect(forecast.onTrack).toBe(true)
    expect(forecast.estimatedCompletionDate).not.toBeNull()
    expect(forecast.estimatedCompletionDate! <= forecast.periodEnd).toBe(true)
  })
})
