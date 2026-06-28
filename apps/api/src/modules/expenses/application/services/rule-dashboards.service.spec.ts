import { describe, expect, it } from 'vitest'

import {
  buildRuleDashboardInsights,
  computeBaselines,
  computeCadenceComparison,
  computeRulePeriodComparison,
  detectSpendCadence,
  groupMonthlySpending,
  pctChange,
  computeDashboardSummary,
  groupDailySpending,
  matchTransactionsToRules,
} from '@/modules/expenses/application/services/rule-dashboards.service'

import type { DashboardEvaluableRule } from '@/modules/expenses/application/services/rule-dashboards.service'
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

function monthlyTrendWithActiveMonths(activeCount: number, amount = 1000) {
  const months = [
    '2024-07',
    '2024-08',
    '2024-09',
    '2024-10',
    '2024-11',
    '2024-12',
    '2025-01',
    '2025-02',
    '2025-03',
    '2025-04',
    '2025-05',
    '2025-06',
  ]

  return months.map((month, index) => ({
    month,
    debited: index >= 12 - activeCount ? amount : 0,
    credited: 0,
    transactionCount: index >= 12 - activeCount ? 2 : 0,
  }))
}

describe('detectSpendCadence', () => {
  it('detects recurring spend when 6+ active months', () => {
    expect(detectSpendCadence(monthlyTrendWithActiveMonths(8))).toBe('recurring')
  })

  it('detects occasional spend for 2-5 active months', () => {
    expect(detectSpendCadence(monthlyTrendWithActiveMonths(3))).toBe('occasional')
  })

  it('detects sparse spend for at most one active month', () => {
    expect(detectSpendCadence(monthlyTrendWithActiveMonths(1))).toBe('sparse')
  })
})

describe('computeBaselines', () => {
  it('computes median from non-zero months only', () => {
    const baselines = computeBaselines(monthlyTrendWithActiveMonths(4, 1000))

    expect(baselines.monthsWithSpend).toBe(4)
    expect(baselines.medianMonthlySpend).toBe(1000)
    expect(baselines.avgMonthlySpend).toBeCloseTo(333.33, 1)
  })
})

describe('computeCadenceComparison', () => {
  const viewSummary = {
    totalSpent: 42_000,
    totalReceived: 0,
    netFlow: -42_000,
    transactionCount: 3,
    avgTransaction: 14_000,
  }

  it('uses month-over-month for recurring cadence', () => {
    const monthlyTrend = monthlyTrendWithActiveMonths(8, 1000)
    monthlyTrend[monthlyTrend.length - 1] = {
      ...monthlyTrend[monthlyTrend.length - 1]!,
      debited: 18_000,
    }
    monthlyTrend[monthlyTrend.length - 2] = {
      ...monthlyTrend[monthlyTrend.length - 2]!,
      debited: 15_000,
    }

    const comparison = computeCadenceComparison(
      'recurring',
      monthlyTrend,
      viewSummary,
      '2025-06-30',
    )

    expect(comparison.mode).toBe('month_over_month')
    expect(comparison.currentValue).toBe(18_000)
    expect(comparison.referenceValue).toBe(15_000)
    expect(comparison.changePct).toBe(20)
  })

  it('uses median baseline for occasional cadence', () => {
    const monthlyTrend = monthlyTrendWithActiveMonths(3, 28_500)
    const comparison = computeCadenceComparison(
      'occasional',
      monthlyTrend,
      viewSummary,
      '2025-06-30',
    )

    expect(comparison.mode).toBe('vs_baseline')
    expect(comparison.referenceValue).toBe(28_500)
    expect(comparison.changePct).toBeCloseTo(47.37, 1)
  })
})

describe('computeRulePeriodComparison', () => {
  it('compares current and prior windows of equal length', () => {
    const transactions = [
      {
        amount: 100,
        transactionType: 'debited',
        transactionDate: '2025-06-10T10:00:00.000Z',
      },
      {
        amount: 200,
        transactionType: 'debited',
        transactionDate: '2025-05-10T10:00:00.000Z',
      },
    ] as Transaction[]

    const comparison = computeRulePeriodComparison(
      transactions,
      '2025-06-01',
      '2025-06-30',
    )

    expect(comparison.currentPeriod.totalSpent).toBe(100)
    expect(comparison.previousPeriod.totalSpent).toBe(200)
    expect(comparison.changes.spentChange).toBe(-50)
  })
})

describe('groupMonthlySpending', () => {
  it('groups debited spend by calendar month', () => {
    const monthly = groupMonthlySpending([
      {
        transactionDate: '2025-06-15T10:00:00.000Z',
        amount: 100,
        transactionType: 'debited',
      },
      {
        transactionDate: '2025-06-20T10:00:00.000Z',
        amount: 50,
        transactionType: 'debited',
      },
      {
        transactionDate: '2025-05-01T10:00:00.000Z',
        amount: 200,
        transactionType: 'debited',
      },
    ])

    expect(monthly).toEqual([
      {
        month: '2025-05',
        debited: 200,
        credited: 0,
        transactionCount: 1,
      },
      {
        month: '2025-06',
        debited: 150,
        credited: 0,
        transactionCount: 2,
      },
    ])
  })
})

describe('buildRuleDashboardInsights', () => {
  it('builds insights for occasional travel-like spend', () => {
    const lookbackMatchedTransactions = [
      {
        amount: 28_000,
        transactionType: 'debited',
        transactionDate: '2025-03-10T10:00:00.000Z',
      },
      {
        amount: 29_000,
        transactionType: 'debited',
        transactionDate: '2025-04-12T10:00:00.000Z',
      },
      {
        amount: 42_000,
        transactionType: 'debited',
        transactionDate: '2025-06-18T10:00:00.000Z',
      },
    ] as Transaction[]

    const insights = buildRuleDashboardInsights({
      lookbackMatchedTransactions,
      viewMatchedTransactions: lookbackMatchedTransactions.slice(-1),
      viewSummary: computeDashboardSummary(lookbackMatchedTransactions.slice(-1)),
      byRule: [
        {
          ruleId: 'rule-a',
          name: 'Flights',
          matchCount: 1,
          amount: 42_000,
        },
      ],
      startDate: '2025-06-01',
      endDate: '2025-06-30',
    })

    expect(insights.cadence).toBe('occasional')
    expect(insights.highlights.length).toBeGreaterThan(0)
    expect(insights.largestTransactions).toHaveLength(1)
  })
})

describe('pctChange', () => {
  it('returns 100 when previous is zero and current is positive', () => {
    expect(pctChange(100, 0)).toBe(100)
  })
})
