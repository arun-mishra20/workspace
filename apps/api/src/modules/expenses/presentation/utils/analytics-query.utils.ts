import { ApiQuery } from '@nestjs/swagger'

import {
  resolveExcludeSpendRules,
  type SpendExclusionRule,
} from '@/modules/expenses/application/utils/analytics-exclusions'

export const ANALYTICS_EXCLUDE_CATEGORIES_QUERY = {
  name: 'excludeCategories',
  required: false,
  type: String,
  description:
    'Comma-separated spend exclusions. Tokens: credit_card_bills, personal_transfer:self_transfer, paid_for_someone. Omit for defaults. Pass empty to include all debits.',
} as const

export function parseAnalyticsExcludeCategories(excludeCategories?: string): SpendExclusionRule[] {
  return resolveExcludeSpendRules(excludeCategories)
}

export function AnalyticsExcludeCategoriesQuery() {
  return ApiQuery(ANALYTICS_EXCLUDE_CATEGORIES_QUERY)
}
