export interface SpendExclusionRule {
  category: string
  subcategory?: string
}

export const CREDIT_CARD_BILLS_EXCLUSION: SpendExclusionRule = {
  category: 'credit_card_bills',
}

export const SELF_TRANSFER_EXCLUSION: SpendExclusionRule = {
  category: 'personal_transfer',
  subcategory: 'self_transfer',
}

export const DEFAULT_EXCLUDED_SPEND_RULES: SpendExclusionRule[] = [
  CREDIT_CARD_BILLS_EXCLUSION,
  SELF_TRANSFER_EXCLUSION,
]

function encodeSpendExclusionRule(rule: SpendExclusionRule): string {
  return rule.subcategory ? `${rule.category}:${rule.subcategory}` : rule.category
}

function parseSpendExclusionToken(token: string): SpendExclusionRule | null {
  const trimmed = token.trim()
  if (!trimmed) {
    return null
  }

  const separatorIndex = trimmed.indexOf(':')
  if (separatorIndex === -1) {
    return { category: trimmed }
  }

  const category = trimmed.slice(0, separatorIndex)
  const subcategory = trimmed.slice(separatorIndex + 1)
  if (!category || !subcategory) {
    return null
  }

  return { category, subcategory }
}

/**
 * Parse `excludeCategories` query param.
 * - omitted → default exclusions (consumption view)
 * - empty string → no exclusions (cash-flow view)
 * - comma-separated tokens: `credit_card_bills`, `personal_transfer:self_transfer`
 */
export function resolveExcludeSpendRules(excludeCategoriesParam?: string): SpendExclusionRule[] {
  if (excludeCategoriesParam === '') {
    return []
  }

  if (excludeCategoriesParam === undefined) {
    return [...DEFAULT_EXCLUDED_SPEND_RULES]
  }

  return excludeCategoriesParam
    .split(',')
    .map(parseSpendExclusionToken)
    .filter((rule): rule is SpendExclusionRule => rule !== null)
}

export function serializeExcludeSpendRules(rules: SpendExclusionRule[]): string {
  return rules.map(encodeSpendExclusionRule).join(',')
}

/** @deprecated Use resolveExcludeSpendRules */
export function resolveExcludeCategories(excludeCategoriesParam?: string): string[] {
  return resolveExcludeSpendRules(excludeCategoriesParam).map((rule) =>
    rule.subcategory ? `${rule.category}:${rule.subcategory}` : rule.category,
  )
}
