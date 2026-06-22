import type { AnalyticsPeriod } from '@workspace/domain'

import { periodToDateRange } from '@/features/expenses/lib/period-to-date-range'
import { appPaths } from '@/config/app-paths'

export interface ExpensesDrillDownParams {
  period?: AnalyticsPeriod
  cardLast4?: string
  category?: string
  merchant?: string
  date?: string
}

function periodToDateRangeLegacy(period: AnalyticsPeriod): { dateFrom: string; dateTo: string } {
  const { startDate, endDate } = periodToDateRange(period)
  return { dateFrom: startDate, dateTo: endDate }
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
    const { dateFrom, dateTo } = periodToDateRangeLegacy(params.period)
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
