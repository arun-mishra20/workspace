import { describe, expect, it } from 'vitest'

import {
  evaluateRuleConditionGroup,
} from '@/modules/expenses/infrastructure/categorization/rule-condition-evaluator'

describe('evaluateRuleConditionGroup', () => {
  it('matches amount and transaction type for rent-style rules', () => {
    const matched = evaluateRuleConditionGroup(
      {
        logic: 'AND',
        conditions: [
          { field: 'transaction_type', op: 'eq', value: 'debited' },
          { field: 'amount', op: 'eq', value: 34_500 },
        ],
      },
      {
        amount: 34_500,
        transactionType: 'debited',
        merchant: 'landlord',
      },
    )

    expect(matched).toBe(true)
  })

  it('supports nested OR groups', () => {
    const matched = evaluateRuleConditionGroup(
      {
        logic: 'OR',
        conditions: [
          { field: 'merchant', op: 'eq', value: 'swiggy' },
        ],
        groups: [
          {
            logic: 'AND',
            conditions: [
              { field: 'vpa', op: 'eq', value: 'rent@upi' },
              { field: 'amount', op: 'gte', value: 30_000 },
            ],
          },
        ],
      },
      {
        merchant: 'other',
        vpa: 'rent@upi',
        amount: 34_500,
      },
    )

    expect(matched).toBe(true)
  })
})
