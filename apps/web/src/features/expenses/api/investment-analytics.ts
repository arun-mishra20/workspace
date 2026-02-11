import { apiRequest } from "@/lib/api-client";
import {
  InvestmentAnalyticsSchema,
  type AnalyticsPeriod,
} from "@workspace/domain";

export async function fetchInvestmentAnalytics(period: AnalyticsPeriod) {
  const json = await apiRequest({
    method: "GET",
    url: `/api/expenses/analytics/investment-patterns?period=${period}`,
  });
  return InvestmentAnalyticsSchema.parse(json);
}
