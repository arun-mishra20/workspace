import { z } from 'zod'

import { apiRequest } from '@/lib/api-client'
import {
  CategorizationRuleSchema,
  CategoryOptionSchema,
  CreateCategorizationRuleInputSchema,
  ReapplyAllRulesResponseSchema,
  RuleApplyRequestSchema,
  RuleApplyResponseSchema,
  RuleConflictItemSchema,
  RulePreviewRequestSchema,
  RulePreviewResponseSchema,
  SuggestedRuleSchema,
  UpdateCategorizationRuleInputSchema,
  type CreateCategorizationRuleInput,
  type RuleApplyRequest,
  type RulePreviewRequest,
  type UpdateCategorizationRuleInput,
} from '@workspace/domain'

export async function fetchCategorizationRules() {
  const json = await apiRequest({ method: 'GET', url: '/api/expenses/rules' })
  return z.array(CategorizationRuleSchema).parse(json)
}

export async function fetchCategorizationRule(id: string) {
  const json = await apiRequest({ method: 'GET', url: `/api/expenses/rules/${id}` })
  return CategorizationRuleSchema.parse(json)
}

export async function fetchCategoryOptions() {
  const json = await apiRequest({ method: 'GET', url: '/api/expenses/categories' })
  return z.array(CategoryOptionSchema).parse(json)
}

export async function fetchSuggestedRules() {
  const json = await apiRequest({ method: 'GET', url: '/api/expenses/rules/suggested' })
  return z.array(SuggestedRuleSchema).parse(json)
}

export async function fetchRuleConflicts() {
  const json = await apiRequest({ method: 'GET', url: '/api/expenses/rules/conflicts' })
  return z.array(RuleConflictItemSchema).parse(json)
}

export async function createCategorizationRule(input: CreateCategorizationRuleInput) {
  const body = CreateCategorizationRuleInputSchema.parse(input)
  const json = await apiRequest({
    method: 'POST',
    url: '/api/expenses/rules',
    data: body,
  })
  return CategorizationRuleSchema.parse(json)
}

export async function updateCategorizationRule(
  id: string,
  input: UpdateCategorizationRuleInput,
) {
  const body = UpdateCategorizationRuleInputSchema.parse(input)
  const json = await apiRequest({
    method: 'PATCH',
    url: `/api/expenses/rules/${id}`,
    data: body,
  })
  return CategorizationRuleSchema.parse(json)
}

export async function deleteCategorizationRule(id: string) {
  await apiRequest({ method: 'DELETE', url: `/api/expenses/rules/${id}` })
}

export async function reorderCategorizationRules(orderedIds: string[]) {
  const json = await apiRequest({
    method: 'PATCH',
    url: '/api/expenses/rules/reorder',
    data: { orderedIds },
  })
  return z.array(CategorizationRuleSchema).parse(json)
}

export async function previewCategorizationRule(request: RulePreviewRequest) {
  const body = RulePreviewRequestSchema.parse(request)
  const json = await apiRequest({
    method: 'POST',
    url: '/api/expenses/rules/preview',
    data: body,
  })
  return RulePreviewResponseSchema.parse(json)
}

export async function applyCategorizationRule(id: string, request: RuleApplyRequest) {
  const body = RuleApplyRequestSchema.parse(request)
  const json = await apiRequest({
    method: 'POST',
    url: `/api/expenses/rules/${id}/apply`,
    data: body,
  })
  return RuleApplyResponseSchema.parse(json)
}

export async function reapplyAllCategorizationRules(force = false) {
  const json = await apiRequest({
    method: 'POST',
    url: `/api/expenses/rules/reapply-all?force=${force}`,
  })
  return ReapplyAllRulesResponseSchema.parse(json)
}
