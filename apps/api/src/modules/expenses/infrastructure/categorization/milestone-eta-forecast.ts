import {
  addDays,
  differenceInDays,
  format,
  isAfter,
  startOfDay,
  subDays,
} from 'date-fns'

export type MilestoneEtaForecast = {
  percentage: number
  dailyRate: number
  daysRemaining: number | null
  daysLeftInPeriod: number
  estimatedCompletionDate: string | null
  onTrack: boolean
  requiredDailyRate: number | null
  periodEnd: string
}

export function computeMilestoneEtaForecast(params: {
  currentSpend: number
  targetAmount: number
  periodStart: Date
  periodEndExclusive: Date
  now?: Date
}): MilestoneEtaForecast {
  const now = startOfDay(params.now ?? new Date())
  const periodStart = startOfDay(params.periodStart)
  const lastDayOfPeriod = subDays(startOfDay(params.periodEndExclusive), 1)
  const periodEnd = format(lastDayOfPeriod, 'yyyy-MM-dd')

  const remaining = Math.max(0, params.targetAmount - params.currentSpend)
  const percentage = Math.min(
    100,
    params.targetAmount > 0
      ? (params.currentSpend / params.targetAmount) * 100
      : 0,
  )

  const elapsedDays = Math.max(
    1,
    differenceInDays(now, periodStart) + 1,
  )
  const dailyRate = params.currentSpend / elapsedDays
  const daysLeftInPeriod = Math.max(
    0,
    differenceInDays(params.periodEndExclusive, now),
  )

  let estimatedCompletionDate: string | null = null
  let daysRemaining: number | null = null
  let requiredDailyRate: number | null =
    remaining > 0 && daysLeftInPeriod > 0 ? remaining / daysLeftInPeriod : null

  if (remaining <= 0) {
    daysRemaining = 0
    requiredDailyRate = null
  } else if (dailyRate > 0) {
    const daysToComplete = Math.ceil(remaining / dailyRate)
    const eta = addDays(now, daysToComplete)

    if (!isAfter(eta, lastDayOfPeriod)) {
      estimatedCompletionDate = format(eta, 'yyyy-MM-dd')
      daysRemaining = daysToComplete
    } else {
      daysRemaining = daysLeftInPeriod
    }
  }

  const onTrack = remaining <= 0 || estimatedCompletionDate !== null

  return {
    percentage: Math.round(percentage * 100) / 100,
    dailyRate: Math.round(dailyRate * 100) / 100,
    daysRemaining,
    daysLeftInPeriod,
    estimatedCompletionDate,
    onTrack,
    requiredDailyRate:
      requiredDailyRate != null
        ? Math.round(requiredDailyRate * 100) / 100
        : null,
    periodEnd,
  }
}
