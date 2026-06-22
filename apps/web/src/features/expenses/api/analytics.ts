import { z } from 'zod'

import { apiRequest } from '@/lib/api-client'
import {
  SpendingSummarySchema,
  SpendingByCategoryItemSchema,
  SpendingBySubcategoryItemSchema,
  SpendingByModeItemSchema,
  SpendingByMerchantItemSchema,
  DailySpendingItemSchema,
  MonthlyTrendItemSchema,
  SpendingByCardItemSchema,
  DayOfWeekSpendingItemSchema,
  CategoryTrendItemSchema,
  PeriodComparisonSchema,
  CumulativeSpendItemSchema,
  SavingsRateItemSchema,
  CardCategoryItemSchema,
  TopVpaItemSchema,
  SpendingVelocityItemSchema,
  MilestoneEtaSchema,
  LargestTransactionItemSchema,
  type AnalyticsPeriod,
} from '@workspace/domain'

export type AnalyticsQueryOptions = {
  cardLast4?: string
}

function appendCardLast4(params: URLSearchParams, options?: AnalyticsQueryOptions) {
  if (options?.cardLast4) {
    params.set('card_last4', options.cardLast4)
  }
}

// ── Fetchers ──

export async function fetchSpendingSummary(
  period: AnalyticsPeriod,
  options?: AnalyticsQueryOptions,
) {
  const params = new URLSearchParams({ period })
  appendCardLast4(params, options)
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/summary?${params.toString()}`,
  })
  return SpendingSummarySchema.parse(json)
}

export async function fetchSpendingSummaryForDate(
  date: string,
  options?: AnalyticsQueryOptions,
) {
  const params = new URLSearchParams({
    startDate: date,
    endDate: date,
  })
  appendCardLast4(params, options)

  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/summary?${params.toString()}`,
  })

  return SpendingSummarySchema.parse(json)
}

export async function fetchSpendingByCategory(
  period: AnalyticsPeriod,
  options?: AnalyticsQueryOptions,
) {
  const params = new URLSearchParams({ period })
  appendCardLast4(params, options)
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/by-category?${params.toString()}`,
  })
  return z.array(SpendingByCategoryItemSchema).parse(json)
}

export async function fetchSpendingBySubcategory(
  period: AnalyticsPeriod,
  options?: AnalyticsQueryOptions,
) {
  const params = new URLSearchParams({ period })
  appendCardLast4(params, options)
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/by-subcategory?${params.toString()}`,
  })
  return z.array(SpendingBySubcategoryItemSchema).parse(json)
}

export async function fetchSpendingByMode(
  period: AnalyticsPeriod,
  options?: AnalyticsQueryOptions,
) {
  const params = new URLSearchParams({ period })
  appendCardLast4(params, options)
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/by-mode?${params.toString()}`,
  })
  return z.array(SpendingByModeItemSchema).parse(json)
}

export async function fetchTopMerchants(
  period: AnalyticsPeriod,
  limit = 10,
  options?: AnalyticsQueryOptions,
) {
  const params = new URLSearchParams({ period, limit: String(limit) })
  appendCardLast4(params, options)
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/top-merchants?${params.toString()}`,
  })
  return z.array(SpendingByMerchantItemSchema).parse(json)
}

export async function fetchDailySpending(
  period: AnalyticsPeriod,
  options?: AnalyticsQueryOptions,
) {
  const params = new URLSearchParams({ period })
  appendCardLast4(params, options)
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/daily?${params.toString()}`,
  })
  return z.array(DailySpendingItemSchema).parse(json)
}

export async function fetchMonthlyTrend(months = 12) {
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/monthly-trend?months=${months}`,
  })
  return z.array(MonthlyTrendItemSchema).parse(json)
}

export async function fetchSpendingByCard(
  period: AnalyticsPeriod,
  options?: AnalyticsQueryOptions,
) {
  const params = new URLSearchParams({ period })
  appendCardLast4(params, options)
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/by-card?${params.toString()}`,
  })
  return z.array(SpendingByCardItemSchema).parse(json)
}

// ── Extended Analytics ──

export async function fetchDayOfWeekSpending(
  period: AnalyticsPeriod,
  options?: AnalyticsQueryOptions,
) {
  const params = new URLSearchParams({ period })
  appendCardLast4(params, options)
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/day-of-week?${params.toString()}`,
  })
  return z.array(DayOfWeekSpendingItemSchema).parse(json)
}

export async function fetchCategoryTrend(months = 6) {
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/category-trend?months=${months}`,
  })
  return z.array(CategoryTrendItemSchema).parse(json)
}

export async function fetchPeriodComparison(
  period: AnalyticsPeriod,
  options?: AnalyticsQueryOptions,
) {
  const params = new URLSearchParams({ period })
  appendCardLast4(params, options)
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/period-comparison?${params.toString()}`,
  })
  return PeriodComparisonSchema.parse(json)
}

export async function fetchCumulativeSpend(
  period: AnalyticsPeriod,
  options?: AnalyticsQueryOptions,
) {
  const params = new URLSearchParams({ period })
  appendCardLast4(params, options)
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/cumulative?${params.toString()}`,
  })
  return z.array(CumulativeSpendItemSchema).parse(json)
}

export async function fetchSavingsRate(months = 6) {
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/savings-rate?months=${months}`,
  })
  return z.array(SavingsRateItemSchema).parse(json)
}

export async function fetchCardCategories(
  period: AnalyticsPeriod,
  options?: AnalyticsQueryOptions,
) {
  const params = new URLSearchParams({ period })
  appendCardLast4(params, options)
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/card-categories?${params.toString()}`,
  })
  return z.array(CardCategoryItemSchema).parse(json)
}

export async function fetchTopVpas(
  period: AnalyticsPeriod,
  limit = 10,
  options?: AnalyticsQueryOptions,
) {
  const params = new URLSearchParams({ period, limit: String(limit) })
  appendCardLast4(params, options)
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/top-vpas?${params.toString()}`,
  })
  return z.array(TopVpaItemSchema).parse(json)
}

export async function fetchSpendingVelocity(
  period: AnalyticsPeriod,
  options?: AnalyticsQueryOptions,
) {
  const params = new URLSearchParams({ period })
  appendCardLast4(params, options)
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/velocity?${params.toString()}`,
  })
  return z.array(SpendingVelocityItemSchema).parse(json)
}

export async function fetchMilestoneEtas() {
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/milestone-etas`,
  })
  return z.array(MilestoneEtaSchema).parse(json)
}

export async function fetchLargestTransactions(
  period: AnalyticsPeriod,
  limit = 10,
  options?: AnalyticsQueryOptions,
) {
  const params = new URLSearchParams({ period, limit: String(limit) })
  appendCardLast4(params, options)
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/analytics/largest-transactions?${params.toString()}`,
  })
  return z.array(LargestTransactionItemSchema).parse(json)
}
