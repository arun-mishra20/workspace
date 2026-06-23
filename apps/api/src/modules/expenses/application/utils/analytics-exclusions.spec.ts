import { describe, expect, it } from 'vitest'

import {
  DEFAULT_EXCLUDED_SPEND_RULES,
  resolveExcludeSpendRules,
  serializeExcludeSpendRules,
} from '@/modules/expenses/application/utils/analytics-exclusions'

describe('resolveExcludeSpendRules', () => {
  it('returns default exclusions when param is omitted', () => {
    expect(resolveExcludeSpendRules(undefined)).toEqual(DEFAULT_EXCLUDED_SPEND_RULES)
  })

  it('returns no exclusions for explicit empty param', () => {
    expect(resolveExcludeSpendRules('')).toEqual([])
  })

  it('parses category-only and category:subcategory tokens', () => {
    expect(resolveExcludeSpendRules('credit_card_bills,personal_transfer:self_transfer')).toEqual([
      { category: 'credit_card_bills' },
      { category: 'personal_transfer', subcategory: 'self_transfer' },
    ])
  })
})

describe('serializeExcludeSpendRules', () => {
  it('encodes rules for the query param', () => {
    expect(
      serializeExcludeSpendRules([
        { category: 'credit_card_bills' },
        { category: 'personal_transfer', subcategory: 'self_transfer' },
      ]),
    ).toBe('credit_card_bills,personal_transfer:self_transfer')
  })
})
