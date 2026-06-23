import { format, subDays, subMonths, subYears } from 'date-fns'

import type { AnalyticsPeriod } from '@workspace/domain'

export function periodToDateRange(period: AnalyticsPeriod): {
  startDate: string
  endDate: string
} {
  const end = new Date()
  let start: Date

  switch (period) {
    case 'week':
      start = subDays(end, 7)
      break
    case 'month':
      start = subMonths(end, 1)
      break
    case 'quarter':
      start = subMonths(end, 3)
      break
    case 'year':
      start = subYears(end, 1)
      break
  }

  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  }
}

export function periodLabel(period: AnalyticsPeriod): string {
  switch (period) {
    case 'week':
      return 'Last 7 days'
    case 'month':
      return 'Last 30 days'
    case 'quarter':
      return 'Last 90 days'
    case 'year':
      return 'Last year'
  }
}
