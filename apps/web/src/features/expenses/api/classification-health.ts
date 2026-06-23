import { apiRequest } from '@/lib/api-client'
import {
  ClassificationHealthSchema,
  SpendAnomaliesSchema,
  type AnalyticsPeriod,
} from '@workspace/domain'

import type { AnalyticsQueryOptions } from '@/features/expenses/api/analytics'
import { buildExcludeCategoriesParam } from '@/features/expenses/lib/analytics-spend-view'

function appendAnalyticsQueryParams(params: URLSearchParams, options?: AnalyticsQueryOptions) {
  if (options?.cardLast4) {
    params.set('card_last4', options.cardLast4)
  }

  if (options?.spendExclusions) {
    const excludeCategories = buildExcludeCategoriesParam(options.spendExclusions)
    if (excludeCategories !== undefined) {
      params.set('excludeCategories', excludeCategories)
    }
  }
}

export async function fetchClassificationHealth(
  period: AnalyticsPeriod,
  options?: AnalyticsQueryOptions,
) {
  const params = new URLSearchParams({ period })
  appendAnalyticsQueryParams(params, options)
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/classification-health?${params.toString()}`,
  })
  return ClassificationHealthSchema.parse(json)
}

export async function fetchSpendAnomalies(
  period: AnalyticsPeriod,
  options?: AnalyticsQueryOptions,
) {
  const params = new URLSearchParams({ period })
  appendAnalyticsQueryParams(params, options)
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/spend-anomalies?${params.toString()}`,
  })
  return SpendAnomaliesSchema.parse(json)
}

export function getTransactionsExportUrl(
  period: AnalyticsPeriod,
  options?: AnalyticsQueryOptions,
) {
  const params = new URLSearchParams({ period })
  appendAnalyticsQueryParams(params, options)
  return `/api/expenses/analytics/export?${params.toString()}`
}
