import { format, subDays, subMonths, subYears } from 'date-fns'

import type { AnalyticsPeriod } from '@workspace/domain'
import { appPaths } from '@/config/app-paths'

export interface ExpensesDrillDownParams {
  period?: AnalyticsPeriod
  cardLast4?: string
  category?: string
  merchant?: string
  date?: string
}

function periodToDateRange(period: AnalyticsPeriod): { dateFrom: string; dateTo: string } {
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
    dateFrom: format(start, 'yyyy-MM-dd'),
    dateTo: format(end, 'yyyy-MM-dd'),
  }
}

export function buildExpensesDrillDownUrl(params: ExpensesDrillDownParams): string {
  const base = appPaths.auth.expensesEmails.getHref()
  const search = new URLSearchParams()

  if (params.cardLast4) {
    search.set('card', params.cardLast4)
  }

  if (params.date) {
    search.set('date_from', params.date)
    search.set('date_to', params.date)
  } else if (params.period) {
    const { dateFrom, dateTo } = periodToDateRange(params.period)
    search.set('date_from', dateFrom)
    search.set('date_to', dateTo)
  }

  if (params.category) {
    search.set('category', params.category)
  }

  if (params.merchant) {
    search.set('search', params.merchant)
  }

  const query = search.toString()
  return query ? `${base}?${query}` : base
}
