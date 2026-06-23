import type { AnalyticsPeriod } from '@workspace/domain'

import { periodToDateRange } from '@/features/expenses/lib/period-to-date-range'
import { appPaths } from '@/config/app-paths'

export interface ExpensesDrillDownParams {
  period?: AnalyticsPeriod
  cardLast4?: string
  category?: string
  subcategory?: string
  merchant?: string
  mode?: string
  categorizationMethod?: string
  review?: string
  date?: string
  dateFrom?: string
  dateTo?: string
  returnTo?: string
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
  } else if (params.dateFrom && params.dateTo) {
    search.set('date_from', params.dateFrom)
    search.set('date_to', params.dateTo)
  } else if (params.period) {
    const { dateFrom, dateTo } = periodToDateRangeLegacy(params.period)
    search.set('date_from', dateFrom)
    search.set('date_to', dateTo)
  }

  if (params.category) {
    search.set('category', params.category)
  }

  if (params.subcategory) {
    search.set('subcategory', params.subcategory)
  }

  if (params.mode) {
    search.set('mode', params.mode)
  }

  if (params.categorizationMethod) {
    search.set('categorization_method', params.categorizationMethod)
  }

  if (params.review) {
    search.set('review', params.review)
  }

  if (params.merchant) {
    search.set('search', params.merchant)
  }

  if (params.returnTo) {
    search.set('return', params.returnTo)
  }

  const query = search.toString()
  return query ? `${base}?${query}` : base
}
