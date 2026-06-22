import { z } from 'zod'

import { apiRequest } from '@/lib/api-client'
import {
  CreateRuleDashboardInputSchema,
  RuleDashboardAnalyticsRequestSchema,
  RuleDashboardAnalyticsSchema,
  RuleDashboardListItemSchema,
  UpdateRuleDashboardInputSchema,
  type CreateRuleDashboardInput,
  type RuleDashboardAnalyticsRequest,
  type UpdateRuleDashboardInput,
} from '@workspace/domain'

export async function fetchRuleDashboards() {
  const json = await apiRequest({ method: 'GET', url: '/api/expenses/rule-dashboards' })
  return z.array(RuleDashboardListItemSchema).parse(json)
}

export async function fetchRuleDashboard(id: string) {
  const json = await apiRequest({
    method: 'GET',
    url: `/api/expenses/rule-dashboards/${id}`,
  })
  return RuleDashboardListItemSchema.parse(json)
}

export async function createRuleDashboard(input: CreateRuleDashboardInput) {
  const body = CreateRuleDashboardInputSchema.parse(input)
  const json = await apiRequest({
    method: 'POST',
    url: '/api/expenses/rule-dashboards',
    data: body,
  })
  return RuleDashboardListItemSchema.parse(json)
}

export async function updateRuleDashboard(
  id: string,
  input: UpdateRuleDashboardInput,
) {
  const body = UpdateRuleDashboardInputSchema.parse(input)
  const json = await apiRequest({
    method: 'PATCH',
    url: `/api/expenses/rule-dashboards/${id}`,
    data: body,
  })
  return RuleDashboardListItemSchema.parse(json)
}

export async function deleteRuleDashboard(id: string) {
  await apiRequest({ method: 'DELETE', url: `/api/expenses/rule-dashboards/${id}` })
}

export async function fetchRuleDashboardAnalytics(
  request: RuleDashboardAnalyticsRequest,
) {
  const body = RuleDashboardAnalyticsRequestSchema.parse(request)
  const json = await apiRequest({
    method: 'POST',
    url: '/api/expenses/rule-dashboards/analytics',
    data: body,
  })
  return RuleDashboardAnalyticsSchema.parse(json)
}
