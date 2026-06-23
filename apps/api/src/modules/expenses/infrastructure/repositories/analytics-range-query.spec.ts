import { describe, expect, it } from 'vitest'

import { transactionMatchesSpendExclusion } from '@/modules/expenses/infrastructure/repositories/analytics-range-query'

describe('transactionMatchesSpendExclusion', () => {
  it('matches self transfers only when category and subcategory both match', () => {
    const rules = [{ category: 'personal_transfer', subcategory: 'self_transfer' }]

    expect(
      transactionMatchesSpendExclusion(
        {
          transactionType: 'debited',
          category: 'personal_transfer',
          subcategory: 'self_transfer',
        },
        rules,
      ),
    ).toBe(true)

    expect(
      transactionMatchesSpendExclusion(
        {
          transactionType: 'debited',
          category: 'personal_transfer',
          subcategory: 'friend',
        },
        rules,
      ),
    ).toBe(false)
  })
})
