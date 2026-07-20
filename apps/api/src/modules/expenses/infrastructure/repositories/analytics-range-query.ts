import { transactionsTable } from '@workspace/database'
import { and, eq, gte, lt, not, or, sql } from 'drizzle-orm'

import type { SpendExclusionRule } from '@/modules/expenses/application/utils/analytics-exclusions'
import type { DateRange } from '@/modules/expenses/application/ports/transaction.repository.port'
import type { SQL } from 'drizzle-orm'

export interface AnalyticsRangeParams {
  userId: string
  range: DateRange
  cardLast4?: string
  excludeSpendRules?: SpendExclusionRule[]
}

export function buildAnalyticsRangeWhere(
  params: AnalyticsRangeParams,
  ...extra: (SQL | undefined)[]
) {
  return and(
    eq(transactionsTable.userId, params.userId),
    gte(transactionsTable.transactionDate, params.range.start),
    lt(transactionsTable.transactionDate, params.range.end),
    params.cardLast4 ? eq(transactionsTable.cardLast4, params.cardLast4) : undefined,
    ...extra,
  )
}

function matchesSpendExclusionRule(rule: SpendExclusionRule): SQL {
  if (rule.subcategory) {
    return and(
      eq(transactionsTable.category, rule.category),
      eq(transactionsTable.subcategory, rule.subcategory),
    )!
  }

  if (rule.category === 'credit_card_bills') {
    return or(
      eq(transactionsTable.category, 'credit_card_bills'),
      sql`coalesce(${transactionsTable.transactionAttributes}->>'isCreditCardBillPayment', 'false') = 'true'`,
    )!
  }

  if (rule.category === 'paid_for_someone') {
    return sql`coalesce(${transactionsTable.transactionAttributes}->>'paidForSomeone', 'false') = 'true'`
  }

  return eq(transactionsTable.category, rule.category)
}

export function matchesDebitedSpendExclusion(excludeSpendRules: SpendExclusionRule[]): SQL | undefined {
  if (excludeSpendRules.length === 0) {
    return undefined
  }

  const parts = excludeSpendRules.map(matchesSpendExclusionRule)
  return parts.length === 1 ? parts[0] : or(...parts)
}

export function buildDebitedSpendInclusionWhere(excludeSpendRules: SpendExclusionRule[]): SQL | undefined {
  const exclusion = matchesDebitedSpendExclusion(excludeSpendRules)
  if (!exclusion) {
    return undefined
  }

  return not(exclusion)
}

export function debitedSpendAmountSql(excludeSpendRules: SpendExclusionRule[]): SQL {
  const inclusion = buildDebitedSpendInclusionWhere(excludeSpendRules)

  if (!inclusion) {
    return sql`case when ${transactionsTable.transactionType} = 'debited' then ${transactionsTable.amount}::numeric else 0 end`
  }

  return sql`case when ${transactionsTable.transactionType} = 'debited' and ${inclusion} then ${transactionsTable.amount}::numeric else 0 end`
}

export function buildDebitedAnalyticsWhere(
  params: AnalyticsRangeParams,
  ...extra: (SQL | undefined)[]
) {
  const excludeSpendRules = params.excludeSpendRules ?? []

  return buildAnalyticsRangeWhere(
    params,
    eq(transactionsTable.transactionType, 'debited'),
    buildDebitedSpendInclusionWhere(excludeSpendRules),
    ...extra,
  )
}

export function buildMixedSpendAnalyticsWhere(
  params: AnalyticsRangeParams,
  ...extra: (SQL | undefined)[]
) {
  const excludeSpendRules = params.excludeSpendRules ?? []
  const inclusion = buildDebitedSpendInclusionWhere(excludeSpendRules)

  if (!inclusion) {
    return buildAnalyticsRangeWhere(params, ...extra)
  }

  return buildAnalyticsRangeWhere(
    params,
    or(
      eq(transactionsTable.transactionType, 'credited'),
      and(eq(transactionsTable.transactionType, 'debited'), inclusion),
    ),
    ...extra,
  )
}

export function transactionMatchesSpendExclusion(
  txn: {
    transactionType: string
    category: string
    subcategory: string
    transactionAttributes?: {
      isCreditCardBillPayment?: boolean
      paidForSomeone?: boolean
    } | null
  },
  excludeSpendRules: SpendExclusionRule[],
): boolean {
  if (txn.transactionType !== 'debited') {
    return false
  }

  return excludeSpendRules.some((rule) => {
    if (rule.subcategory) {
      return txn.category === rule.category && txn.subcategory === rule.subcategory
    }

    if (rule.category === 'credit_card_bills') {
      return txn.category === 'credit_card_bills' || txn.transactionAttributes?.isCreditCardBillPayment === true
    }

    if (rule.category === 'paid_for_someone') {
      return txn.transactionAttributes?.paidForSomeone === true
    }

    return txn.category === rule.category
  })
}
