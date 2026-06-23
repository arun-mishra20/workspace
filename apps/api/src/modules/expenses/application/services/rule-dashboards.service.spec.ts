import { describe, expect, it } from 'vitest'

import {
  computeDashboardSummary,
  groupDailySpending,
  matchTransactionsToRules,
  type DashboardEvaluableRule,
} from '@/modules/expenses/application/services/rule-dashboards.service'

import type { Transaction } from '@workspace/domain'

const baseTxn = {
  id: 'txn-1',
  merchant: 'Swiggy',
  merchantRaw: 'SWIGGY',
  amount: 500,
  transactionType: 'debited' as const,
  transactionMode: 'upi' as const,
  transactionDate: '2025-06-15T10:00:00.000Z',
}

const ruleA: DashboardEvaluableRule = {
  id: 'rule-a',
  name: 'Food',
  conditions: {
    logic: 'AND',
    conditions: [{ field: 'merchant', op: 'contains', value: 'swiggy' }],
  },
}

const ruleB: DashboardEvaluableRule = {
  ...ruleA,
  id: 'rule-b',
  name: 'UPI debits',
  conditions: {
    logic: 'AND',
    conditions: [{ field: 'transaction_type', op: 'eq', value: 'debited' }],
  },
}

describe('matchTransactionsToRules', () => {
  it('dedupes transactions when multiple rules match (OR)', () => {
    const matched = matchTransactionsToRules([baseTxn as Transaction], [ruleA, ruleB])
    expect(matched).toHaveLength(1)
    expect(matched[0]!.matchedRules).toHaveLength(2)
  })

  it('excludes transactions that match no rules', () => {
    const matched = matchTransactionsToRules(
      [{ ...baseTxn, merchant: 'Unknown' } as Transaction],
      [ruleA],
    )
    expect(matched).toHaveLength(0)
  })
})

describe('computeDashboardSummary', () => {
  it('computes totals from unique matched transactions', () => {
    const summary = computeDashboardSummary([
      { amount: 500, transactionType: 'debited' },
      { amount: 200, transactionType: 'credited' },
    ])

    expect(summary).toEqual({
      totalSpent: 500,
      totalReceived: 200,
      netFlow: -300,
      transactionCount: 2,
      avgTransaction: 350,
    })
  })
})

describe('groupDailySpending', () => {
  it('groups debited and credited amounts by date', () => {
    const daily = groupDailySpending([
      {
        transactionDate: '2025-06-15T10:00:00.000Z',
        amount: 100,
        transactionType: 'debited',
      },
      {
        transactionDate: '2025-06-15T12:00:00.000Z',
        amount: 50,
        transactionType: 'credited',
      },
      {
        transactionDate: '2025-06-16T10:00:00.000Z',
        amount: 200,
        transactionType: 'debited',
      },
    ])

    expect(daily).toEqual([
      { date: '2025-06-15', debited: 100, credited: 50 },
      { date: '2025-06-16', debited: 200, credited: 0 },
    ])
  })
})
