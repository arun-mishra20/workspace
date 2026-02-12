import { apiRequest } from "@/lib/api-client";
import { BusAnalyticsSchema, type AnalyticsPeriod } from "@workspace/domain";

export async function fetchBusAnalytics(period: AnalyticsPeriod) {
  const json = await apiRequest({
    method: "GET",
    url: `/api/expenses/analytics/bus-spending?period=${period}`,
  });
  return BusAnalyticsSchema.parse(json);
}
