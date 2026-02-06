import { z } from "zod";

import { apiRequest } from "@/lib/api-client";
import {
  SpendingSummarySchema,
  SpendingByCategoryItemSchema,
  SpendingByModeItemSchema,
  SpendingByMerchantItemSchema,
  DailySpendingItemSchema,
  MonthlyTrendItemSchema,
  SpendingByCardItemSchema,
  type AnalyticsPeriod,
} from "@workspace/domain";

// ── Fetchers ──

export async function fetchSpendingSummary(period: AnalyticsPeriod) {
  const json = await apiRequest({
    method: "GET",
    url: `/api/expenses/analytics/summary?period=${period}`,
  });
  return SpendingSummarySchema.parse(json);
}

export async function fetchSpendingByCategory(period: AnalyticsPeriod) {
  const json = await apiRequest({
    method: "GET",
    url: `/api/expenses/analytics/by-category?period=${period}`,
  });
  return z.array(SpendingByCategoryItemSchema).parse(json);
}

export async function fetchSpendingByMode(period: AnalyticsPeriod) {
  const json = await apiRequest({
    method: "GET",
    url: `/api/expenses/analytics/by-mode?period=${period}`,
  });
  return z.array(SpendingByModeItemSchema).parse(json);
}

export async function fetchTopMerchants(period: AnalyticsPeriod, limit = 10) {
  const json = await apiRequest({
    method: "GET",
    url: `/api/expenses/analytics/top-merchants?period=${period}&limit=${limit}`,
  });
  return z.array(SpendingByMerchantItemSchema).parse(json);
}

export async function fetchDailySpending(period: AnalyticsPeriod) {
  const json = await apiRequest({
    method: "GET",
    url: `/api/expenses/analytics/daily?period=${period}`,
  });
  return z.array(DailySpendingItemSchema).parse(json);
}

export async function fetchMonthlyTrend(months = 12) {
  const json = await apiRequest({
    method: "GET",
    url: `/api/expenses/analytics/monthly-trend?months=${months}`,
  });
  return z.array(MonthlyTrendItemSchema).parse(json);
}

export async function fetchSpendingByCard(period: AnalyticsPeriod) {
  const json = await apiRequest({
    method: "GET",
    url: `/api/expenses/analytics/by-card?period=${period}`,
  });
  return z.array(SpendingByCardItemSchema).parse(json);
}
