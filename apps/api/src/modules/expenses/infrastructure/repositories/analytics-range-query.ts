import { transactionsTable } from '@workspace/database'
import { and, eq, gte, lt } from 'drizzle-orm'

import type { DateRange } from '@/modules/expenses/application/ports/transaction.repository.port'
import type { SQL } from 'drizzle-orm'

export function buildAnalyticsRangeWhere(
  params: { userId: string, range: DateRange, cardLast4?: string },
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
