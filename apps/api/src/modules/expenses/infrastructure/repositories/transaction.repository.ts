import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { transactionsTable } from '@workspace/database'
import { and, asc, desc, eq, gte, ilike, inArray, lt, lte, ne, or, sql } from 'drizzle-orm'

import {
    buildAnalyticsRangeWhere,
    buildDebitedAnalyticsWhere,
    buildDebitedSpendInclusionWhere,
    buildMixedSpendAnalyticsWhere,
    debitedSpendAmountSql,
} from '@/modules/expenses/infrastructure/repositories/analytics-range-query'
import { DB_TOKEN } from '@/shared/infrastructure/db/db.port'
import { decodeCursor, encodeCursor } from '@/shared/infrastructure/utils/cursor.utils'

import type {
    TransactionRepository,
    TransactionFilters,
    TransactionSortField,
    DateRange,
    AnalyticsQueryParams,
} from '@/modules/expenses/application/ports/transaction.repository.port'
import type { DrizzleDb } from '@/shared/infrastructure/db/db.port'
import type { InsertTransaction, TransactionRecord } from '@workspace/database'
import type {
    Transaction,
    UpdateTransactionInput,
    SpendingSummary,
    SpendingByCategoryItem,
    SpendingBySubcategoryItem,
    TransactionAttributes,
    SpendingByModeItem,
    SpendingByMerchantItem,
    DailySpendingItem,
    MonthlyTrendItem,
    SpendingByCardItem,
    DayOfWeekSpendingItem,
    CategoryTrendItem,
    CumulativeSpendItem,
    SavingsRateItem,
    CardCategoryItem,
    TopVpaItem,
    SpendingVelocityItem,
    LargestTransactionItem,
    BusAnalytics,
    InvestmentAnalytics,
    RuleCondition,
    RuleConditionGroup,
} from '@workspace/domain'
import type { SQL } from 'drizzle-orm'

function loadCategoryMeta(): Record<
    string,
    { name: string; icon: string; color: string; parent: string | null }
> {
    const moduleDir = path.dirname(fileURLToPath(import.meta.url))
    /*
    The asset copy rule is there. The loadCategoryMeta function handles both scenarios:
    Dev mode (pnpm dev): SWC runs from source, so import.meta.url resolves to the src/ directory. The first candidate path (default_categories.json relative to repositories/) will find it.
    Built mode (pnpm build → dist/): nest-cli copies the JSON to dist/modules/expenses/infrastructure/categorization/config/. The first candidate path still works since the relative directory structure is preserved.
    Fallback: process.cwd() + src/... covers running from the project root directly.

     */
    const candidatePaths = [
        path.join(moduleDir, '..', 'categorization', 'config', 'default_categories.json'),
        path.join(moduleDir, 'config', 'default_categories.json'),
        path.join(
            process.cwd(),
            'src/modules/expenses/infrastructure/categorization/config/default_categories.json',
        ),
    ]

    for (const p of candidatePaths) {
        if (existsSync(p)) {
            const raw = JSON.parse(readFileSync(p, 'utf8')) as {
                categories?: Record<
                    string,
                    { name?: string; icon?: string; color?: string; parent?: string | null }
                >
            }
            const result: Record<
                string,
                { name: string; icon: string; color: string; parent: string | null }
            > = {}
            for (const [key, val] of Object.entries(raw.categories ?? {})) {
                result[key] = {
                    name:
                        val.name ??
                        key.replaceAll('_', ' ').replaceAll(/\b\w/g, (c) => c.toUpperCase()),
                    icon: val.icon ?? 'question-circle',
                    color: val.color ?? '#BDC3C7',
                    parent: val.parent ?? null,
                }
            }
            return result
        }
    }

    throw new Error(`default_categories.json not found. Checked: ${candidatePaths.join(', ')}`)
}

const CATEGORY_META = loadCategoryMeta()

const POTENTIAL_CC_BILL_KEYWORD_PATTERNS = [
    '%credit card%',
    '%card payment%',
    '%card bill%',
    '%cc bill%',
    '%cc payment%',
    '%visa bill%',
    '%mastercard bill%',
    '%amex%',
] as const

@Injectable()
export class TransactionRepositoryImpl implements TransactionRepository {
    private static readonly UPSERT_BATCH_SIZE = 250
    private static readonly DISTINCT_MERCHANTS_MAX_ROWS = 1000

    constructor(@Inject(DB_TOKEN) private readonly db: DrizzleDb) {}

    async upsertMany(transactions: Transaction[]): Promise<void> {
        if (transactions.length === 0) {
            return
        }

        for (
            let index = 0;
            index < transactions.length;
            index += TransactionRepositoryImpl.UPSERT_BATCH_SIZE
        ) {
            const chunk = transactions
                .slice(index, index + TransactionRepositoryImpl.UPSERT_BATCH_SIZE)
                .map((transaction) => this.toInsert(transaction))

            await this.db
                .insert(transactionsTable)
                .values(chunk)
                .onConflictDoUpdate({
                    target: [transactionsTable.userId, transactionsTable.sourceEmailId],
                    set: {
                        merchant: sql`
              CASE
                                          WHEN excluded.merchant LIKE 'Card %Transaction'
                                              OR excluded.merchant = 'Unknown Merchant'
                                          THEN ${transactionsTable.merchant}
                                          ELSE excluded.merchant
                                      END
            `,
                        merchantRaw: sql`
              CASE
                                          WHEN excluded.merchant_raw LIKE 'Card %Transaction'
                                              OR excluded.merchant_raw = 'Unknown Merchant'
                                          THEN ${transactionsTable.merchantRaw}
                                          ELSE excluded.merchant_raw
                                      END
            `,
                        dedupeHash: sql`excluded.dedupe_hash`,
                        vpa: sql`COALESCE(excluded.vpa, ${transactionsTable.vpa})`,
                        amount: sql`excluded.amount`,
                        currency: sql`excluded.currency`,
                        transactionDate: sql`excluded.transaction_date`,
                        transactionType: sql`excluded.transaction_type`,
                        transactionMode: sql`excluded.transaction_mode`,
                        cardLast4: sql`COALESCE(excluded.card_last4, ${transactionsTable.cardLast4})`,
                        cardName: sql`COALESCE(excluded.card_name, ${transactionsTable.cardName})`,
                        category: sql`
              CASE
                                          WHEN excluded.category = 'uncategorized'
                                          THEN ${transactionsTable.category}
                                          ELSE excluded.category
                                      END
            `,
                        subcategory: sql`
              CASE
                                          WHEN excluded.subcategory = 'uncategorized'
                                          THEN ${transactionsTable.subcategory}
                                          ELSE excluded.subcategory
                                      END
            `,
                        confidence: sql`
              CASE
                                          WHEN excluded.category = 'uncategorized'
                                          THEN ${transactionsTable.confidence}
                                          ELSE excluded.confidence
                                      END
            `,
                        categorizationMethod: sql`
              CASE
                                          WHEN excluded.category = 'uncategorized'
                                          THEN ${transactionsTable.categorizationMethod}
                                          ELSE excluded.categorization_method
                                      END
            `,
                        requiresReview: sql`
              CASE
                                          WHEN excluded.category = 'uncategorized'
                                          THEN ${transactionsTable.requiresReview}
                                          ELSE excluded.requires_review
                                      END
            `,
                        categoryMetadata: sql`
              CASE
                                          WHEN excluded.category = 'uncategorized'
                                          THEN ${transactionsTable.categoryMetadata}
                                          ELSE excluded.category_metadata
                                      END
            `,
                        transactionAttributes: sql`
              CASE
                                          WHEN excluded.transaction_attributes IS NULL
                                          THEN ${transactionsTable.transactionAttributes}
                                          ELSE excluded.transaction_attributes
                                      END
            `,
                        statementId: sql`COALESCE(excluded.statement_id, ${transactionsTable.statementId})`,
                        updatedAt: new Date(),
                    },
                })
        }
    }

    async listByUserMonth(params: {
        userId: string
        year: number
        month: number
    }): Promise<Transaction[]> {
        const start = new Date(Date.UTC(params.year, params.month - 1, 1))
        const end = new Date(Date.UTC(params.year, params.month, 1))

        const records = await this.db
            .select()
            .from(transactionsTable)
            .where(
                and(
                    eq(transactionsTable.userId, params.userId),
                    gte(transactionsTable.transactionDate, start),
                    lt(transactionsTable.transactionDate, end),
                ),
            )

        return records.map((record) => this.toDomain(record))
    }

    async findById(params: { userId: string; id: string }): Promise<Transaction | null> {
        const [record] = await this.db
            .select()
            .from(transactionsTable)
            .where(
                and(
                    eq(transactionsTable.id, params.id),
                    eq(transactionsTable.userId, params.userId),
                ),
            )

        return record ? this.toDomain(record) : null
    }

    async findByIds(params: { userId: string; ids: string[] }): Promise<Transaction[]> {
        if (params.ids.length === 0) return []

        const records = await this.db
            .select()
            .from(transactionsTable)
            .where(
                and(
                    eq(transactionsTable.userId, params.userId),
                    inArray(transactionsTable.id, params.ids),
                ),
            )

        return records.map((record) => this.toDomain(record))
    }

    async updateById(params: {
        userId: string
        id: string
        data: UpdateTransactionInput & {
            transactionAttributes?: Transaction['transactionAttributes'] | null
        }
    }): Promise<Transaction> {
        const setClause: Record<string, unknown> = { updatedAt: new Date() }

        if (params.data.merchant !== undefined) {
            setClause.merchant = params.data.merchant
        }
        if (params.data.category !== undefined) {
            setClause.category = params.data.category
        }
        if (params.data.subcategory !== undefined) {
            setClause.subcategory = params.data.subcategory
        }
        if (params.data.transactionType !== undefined) {
            setClause.transactionType = params.data.transactionType
        }
        if (params.data.transactionMode !== undefined) {
            setClause.transactionMode = params.data.transactionMode
        }
        if (params.data.amount !== undefined) {
            setClause.amount = params.data.amount.toString()
        }
        if (params.data.currency !== undefined) {
            setClause.currency = params.data.currency
        }
        if (params.data.requiresReview !== undefined) {
            setClause.requiresReview = params.data.requiresReview
        }
        if (params.data.transactionAttributes !== undefined) {
            setClause.transactionAttributes = params.data.transactionAttributes ?? null
        }

        // Mark as manually categorized
        setClause.categorizationMethod = 'manual'
        setClause.confidence = '1'

        const [updated] = await this.db
            .update(transactionsTable)
            .set(setClause)
            .where(
                and(
                    eq(transactionsTable.id, params.id),
                    eq(transactionsTable.userId, params.userId),
                ),
            )
            .returning()

        if (!updated) {
            throw new NotFoundException('Transaction not found')
        }

        return this.toDomain(updated)
    }

    private buildFilterWhere(userId: string, filters?: TransactionFilters) {
        const conditions = [eq(transactionsTable.userId, userId)]

        if (filters?.category) {
            conditions.push(eq(transactionsTable.category, filters.category))
        }
        if (filters?.subcategory) {
            conditions.push(eq(transactionsTable.subcategory, filters.subcategory))
        }
        if (filters?.mode) {
            conditions.push(eq(transactionsTable.transactionMode, filters.mode))
        }
        if (filters?.categorizationMethod) {
            conditions.push(
                eq(transactionsTable.categorizationMethod, filters.categorizationMethod),
            )
        }
        if (filters?.requiresReview !== undefined) {
            conditions.push(eq(transactionsTable.requiresReview, filters.requiresReview))
        }
        if (filters?.paidForSomeone) {
            conditions.push(
                sql`coalesce(${transactionsTable.transactionAttributes}->>'paidForSomeone', 'false') = 'true'`,
            )
            if (filters.paidForSomeone === 'pending' || filters.paidForSomeone === 'settled') {
                conditions.push(
                    sql`${transactionsTable.transactionAttributes}->>'reimbursementStatus' = ${filters.paidForSomeone}`,
                )
            }
        }
        if (filters?.dateFrom) {
            conditions.push(gte(transactionsTable.transactionDate, filters.dateFrom))
        }
        if (filters?.dateTo) {
            // Include the entire end day
            const endOfDay = new Date(filters.dateTo)
            endOfDay.setUTCHours(23, 59, 59, 999)
            conditions.push(lte(transactionsTable.transactionDate, endOfDay))
        }
        if (filters?.search) {
            conditions.push(ilike(transactionsTable.merchant, `%${filters.search}%`))
        }
        if (filters?.cardLast4) {
            conditions.push(eq(transactionsTable.cardLast4, filters.cardLast4))
        }

        return and(...conditions)
    }

    private resolveTransactionOrderBy(filters?: TransactionFilters) {
        const sortBy: TransactionSortField = filters?.sortBy ?? 'transactionDate'
        const sortOrder = filters?.sortOrder ?? 'desc'

        const columns = {
            transactionDate: transactionsTable.transactionDate,
            merchant: transactionsTable.merchant,
            amount: transactionsTable.amount,
            category: transactionsTable.category,
            subcategory: transactionsTable.subcategory,
            transactionMode: transactionsTable.transactionMode,
            categorizationMethod: transactionsTable.categorizationMethod,
            confidence: transactionsTable.confidence,
            requiresReview: transactionsTable.requiresReview,
        } as const

        const column = columns[sortBy] ?? transactionsTable.transactionDate
        const direction = sortOrder === 'asc' ? asc : desc

        return [direction(column), desc(transactionsTable.id)] as const
    }

    async listByUser(params: {
        userId: string
        limit: number
        offset: number
        filters?: TransactionFilters
    }): Promise<Transaction[]> {
        const where = this.buildFilterWhere(params.userId, params.filters)

        const records = await this.db
            .select()
            .from(transactionsTable)
            .where(where)
            .orderBy(...this.resolveTransactionOrderBy(params.filters))
            .limit(params.limit)
            .offset(params.offset)

        return records.map((record) => this.toDomain(record))
    }

    async countByUser(userId: string, filters?: TransactionFilters): Promise<number> {
        const where = this.buildFilterWhere(userId, filters)

        const result = await this.db
            .select({ count: sql<number>`count(*)::int` })
            .from(transactionsTable)
            .where(where)

        return result[0]?.count ?? 0
    }

    async listByUserCursor(params: {
        userId: string
        pageSize: number
        cursor?: string
        filters?: TransactionFilters
    }): Promise<{ data: Transaction[]; nextCursor?: string; hasMore: boolean }> {
        const conditions = this.buildFilterConditions(params.userId, params.filters)

        if (params.cursor) {
            const decoded = decodeCursor<{ d: string; id: string }>(params.cursor)
            if (decoded) {
                conditions.push(
                    or(
                        lt(transactionsTable.transactionDate, new Date(decoded.d)),
                        and(
                            eq(transactionsTable.transactionDate, new Date(decoded.d)),
                            lt(transactionsTable.id, decoded.id),
                        ),
                    )!,
                )
            }
        }

        const records = await this.db
            .select()
            .from(transactionsTable)
            .where(and(...conditions))
            .orderBy(desc(transactionsTable.transactionDate), desc(transactionsTable.id))
            .limit(params.pageSize + 1)

        const hasMore = records.length > params.pageSize
        const page = hasMore ? records.slice(0, params.pageSize) : records
        const data = page.map((r) => this.toDomain(r))

        let nextCursor: string | undefined
        if (hasMore && page.length > 0) {
            const last = page[page.length - 1]!
            nextCursor = encodeCursor({ d: last.transactionDate.toISOString(), id: last.id })
        }

        return { data, nextCursor, hasMore }
    }

    private buildFilterConditions(userId: string, filters?: TransactionFilters) {
        const conditions = [eq(transactionsTable.userId, userId)]

        if (filters?.category) {
            conditions.push(eq(transactionsTable.category, filters.category))
        }
        if (filters?.subcategory) {
            conditions.push(eq(transactionsTable.subcategory, filters.subcategory))
        }
        if (filters?.mode) {
            conditions.push(eq(transactionsTable.transactionMode, filters.mode))
        }
        if (filters?.categorizationMethod) {
            conditions.push(
                eq(transactionsTable.categorizationMethod, filters.categorizationMethod),
            )
        }
        if (filters?.requiresReview !== undefined) {
            conditions.push(eq(transactionsTable.requiresReview, filters.requiresReview))
        }
        if (filters?.paidForSomeone) {
            conditions.push(
                sql`coalesce(${transactionsTable.transactionAttributes}->>'paidForSomeone', 'false') = 'true'`,
            )
            if (filters.paidForSomeone === 'pending' || filters.paidForSomeone === 'settled') {
                conditions.push(
                    sql`${transactionsTable.transactionAttributes}->>'reimbursementStatus' = ${filters.paidForSomeone}`,
                )
            }
        }
        if (filters?.dateFrom) {
            conditions.push(gte(transactionsTable.transactionDate, filters.dateFrom))
        }
        if (filters?.dateTo) {
            const endOfDay = new Date(filters.dateTo)
            endOfDay.setUTCHours(23, 59, 59, 999)
            conditions.push(lte(transactionsTable.transactionDate, endOfDay))
        }
        if (filters?.search) {
            conditions.push(ilike(transactionsTable.merchant, `%${filters.search}%`))
        }
        if (filters?.cardLast4) {
            conditions.push(eq(transactionsTable.cardLast4, filters.cardLast4))
        }

        return conditions
    }

    // ── Analytics ──

    async getSpendingSummary(params: AnalyticsQueryParams): Promise<SpendingSummary> {
        const excludeSpendRules = params.excludeSpendRules ?? []
        const where = buildAnalyticsRangeWhere(params)
        const debitedWhere = buildDebitedAnalyticsWhere(params)
        const debitedAmount = debitedSpendAmountSql(excludeSpendRules)
        const debitedInclusion = buildDebitedSpendInclusionWhere(excludeSpendRules)

        const [summaryRows, topCategoryRows, topMerchantRows] = await Promise.all([
            this.db
                .select({
                    totalSpent: sql<string>`coalesce(sum(${debitedAmount}), 0)`,
                    totalReceived: sql<string>`coalesce(sum(case when ${transactionsTable.transactionType} = 'credited' then ${transactionsTable.amount}::numeric else 0 end), 0)`,
                    transactionCount: sql<number>`count(*)::int`,
                    debitedCount: debitedInclusion
                        ? sql<number>`count(*) filter (where ${transactionsTable.transactionType} = 'debited' and ${debitedInclusion})::int`
                        : sql<number>`count(*) filter (where ${transactionsTable.transactionType} = 'debited')::int`,
                    reviewPending: sql<number>`count(*) filter (where ${transactionsTable.requiresReview} = true)::int`,
                })
                .from(transactionsTable)
                .where(where),
            this.db
                .select({ category: transactionsTable.category })
                .from(transactionsTable)
                .where(debitedWhere)
                .groupBy(transactionsTable.category)
                .orderBy(sql`sum(${transactionsTable.amount}::numeric) desc`)
                .limit(1),
            this.db
                .select({ merchant: transactionsTable.merchant })
                .from(transactionsTable)
                .where(debitedWhere)
                .groupBy(transactionsTable.merchant)
                .orderBy(sql`sum(${transactionsTable.amount}::numeric) desc`)
                .limit(1),
        ])
        const row = summaryRows[0]

        const totalSpent = Number(row?.totalSpent ?? 0)
        const totalReceived = Number(row?.totalReceived ?? 0)
        const transactionCount = row?.transactionCount ?? 0
        const debitedCount = row?.debitedCount ?? 0

        return {
            totalSpent,
            totalReceived,
            netFlow: totalReceived - totalSpent,
            transactionCount,
            avgTransaction: debitedCount > 0 ? totalSpent / debitedCount : 0,
            reviewPending: row?.reviewPending ?? 0,
            topCategory: topCategoryRows[0]?.category ?? 'uncategorized',
            topMerchant: topMerchantRows[0]?.merchant ?? '-',
        }
    }

    async getSpendingByCategory(params: AnalyticsQueryParams): Promise<SpendingByCategoryItem[]> {
        const rows = await this.db
            .select({
                category: transactionsTable.category,
                amount: sql<string>`sum(${transactionsTable.amount}::numeric)`,
                count: sql<number>`count(*)::int`,
            })
            .from(transactionsTable)
            .where(buildDebitedAnalyticsWhere(params))
            .groupBy(transactionsTable.category)
            .orderBy(sql`sum(${transactionsTable.amount}::numeric) desc`)

        return rows.map((r) => {
            const meta = CATEGORY_META[r.category]
            return {
                category: r.category,
                displayName: meta?.name ?? r.category,
                amount: Number(r.amount),
                count: r.count,
                color: meta?.color ?? '#94A3B8',
                icon: meta?.icon ?? 'question-circle',
                parent: meta?.parent ?? null,
            }
        })
    }

    async getSpendingBySubcategory(
        params: AnalyticsQueryParams,
    ): Promise<SpendingBySubcategoryItem[]> {
        const rows = await this.db
            .select({
                subcategory: transactionsTable.subcategory,
                category: transactionsTable.category,
                amount: sql<string>`sum(${transactionsTable.amount}::numeric)`,
                count: sql<number>`count(*)::int`,
            })
            .from(transactionsTable)
            .where(
                buildDebitedAnalyticsWhere(
                    params,
                    ne(transactionsTable.subcategory, 'uncategorized'),
                ),
            )
            .groupBy(transactionsTable.subcategory, transactionsTable.category)
            .orderBy(sql`sum(${transactionsTable.amount}::numeric) desc`)

        const total = rows.reduce((sum, row) => sum + Number(row.amount), 0)

        return rows.map((row) => {
            const categoryMeta = CATEGORY_META[row.category]
            const subcategoryLabel = this.formatSubcategoryLabel(row.subcategory)
            const categoryLabel = categoryMeta?.name ?? row.category
            const displayName =
                row.subcategory === row.category
                    ? categoryLabel
                    : `${categoryLabel} › ${subcategoryLabel}`

            return {
                subcategory: row.subcategory,
                category: row.category,
                displayName,
                amount: Number(row.amount),
                count: row.count,
                percentage: total > 0 ? (Number(row.amount) / total) * 100 : 0,
            }
        })
    }

    async getSpendingByMode(params: AnalyticsQueryParams): Promise<SpendingByModeItem[]> {
        const rows = await this.db
            .select({
                mode: transactionsTable.transactionMode,
                amount: sql<string>`sum(${transactionsTable.amount}::numeric)`,
                count: sql<number>`count(*)::int`,
            })
            .from(transactionsTable)
            .where(buildMixedSpendAnalyticsWhere(params))
            .groupBy(transactionsTable.transactionMode)
            .orderBy(sql`sum(${transactionsTable.amount}::numeric) desc`)

        return rows.map((r) => ({
            mode: r.mode,
            amount: Number(r.amount),
            count: r.count,
        }))
    }

    async getTopMerchants(
        params: AnalyticsQueryParams & { limit: number },
    ): Promise<SpendingByMerchantItem[]> {
        const rows = await this.db
            .select({
                merchant: transactionsTable.merchant,
                amount: sql<string>`sum(${transactionsTable.amount}::numeric)`,
                count: sql<number>`count(*)::int`,
            })
            .from(transactionsTable)
            .where(buildDebitedAnalyticsWhere(params))
            .groupBy(transactionsTable.merchant)
            .orderBy(sql`sum(${transactionsTable.amount}::numeric) desc`)
            .limit(params.limit)

        return rows.map((r) => ({
            merchant: r.merchant,
            amount: Number(r.amount),
            count: r.count,
        }))
    }

    async getDailySpending(params: AnalyticsQueryParams): Promise<DailySpendingItem[]> {
        const excludeSpendRules = params.excludeSpendRules ?? []
        const debitedAmount = debitedSpendAmountSql(excludeSpendRules)

        const rows = await this.db
            .select({
                date: sql<string>`to_char(${transactionsTable.transactionDate}, 'YYYY-MM-DD')`,
                debited: sql<string>`coalesce(sum(${debitedAmount}), 0)`,
                credited: sql<string>`coalesce(sum(case when ${transactionsTable.transactionType} = 'credited' then ${transactionsTable.amount}::numeric else 0 end), 0)`,
            })
            .from(transactionsTable)
            .where(buildAnalyticsRangeWhere(params))
            .groupBy(sql`to_char(${transactionsTable.transactionDate}, 'YYYY-MM-DD')`)
            .orderBy(sql`to_char(${transactionsTable.transactionDate}, 'YYYY-MM-DD') asc`)

        return rows.map((r) => ({
            date: r.date,
            debited: Number(r.debited),
            credited: Number(r.credited),
        }))
    }

    async getMonthlyTrend(params: {
        userId: string
        months: number
        excludeSpendRules?: import('@/modules/expenses/application/utils/analytics-exclusions').SpendExclusionRule[]
    }): Promise<MonthlyTrendItem[]> {
        const excludeSpendRules = params.excludeSpendRules ?? []
        const debitedAmount = debitedSpendAmountSql(excludeSpendRules)
        const end = new Date()
        const start = new Date()
        start.setMonth(start.getMonth() - params.months)
        start.setDate(1)
        start.setHours(0, 0, 0, 0)

        const rows = await this.db
            .select({
                month: sql<string>`to_char(${transactionsTable.transactionDate}, 'YYYY-MM')`,
                debited: sql<string>`coalesce(sum(${debitedAmount}), 0)`,
                credited: sql<string>`coalesce(sum(case when ${transactionsTable.transactionType} = 'credited' then ${transactionsTable.amount}::numeric else 0 end), 0)`,
            })
            .from(transactionsTable)
            .where(
                and(
                    eq(transactionsTable.userId, params.userId),
                    gte(transactionsTable.transactionDate, start),
                    lte(transactionsTable.transactionDate, end),
                ),
            )
            .groupBy(sql`to_char(${transactionsTable.transactionDate}, 'YYYY-MM')`)
            .orderBy(sql`to_char(${transactionsTable.transactionDate}, 'YYYY-MM') asc`)

        return rows.map((r) => {
            const debited = Number(r.debited)
            const credited = Number(r.credited)
            return {
                month: r.month,
                debited,
                credited,
                net: credited - debited,
            }
        })
    }

    async getSpendingByCard(params: {
        userId: string
        range: DateRange
        cardLast4?: string
    }): Promise<SpendingByCardItem[]> {
        const rows = await this.db
            .select({
                cardLast4: transactionsTable.cardLast4,
                cardName: transactionsTable.cardName,
                amount: sql<string>`sum(${transactionsTable.amount}::numeric)`,
                count: sql<number>`count(*)::int`,
            })
            .from(transactionsTable)
            .where(
                buildAnalyticsRangeWhere(
                    params,
                    eq(transactionsTable.transactionType, 'debited'),
                    eq(transactionsTable.transactionMode, 'credit_card'),
                    sql`${transactionsTable.cardLast4} is not null`,
                ),
            )
            .groupBy(transactionsTable.cardLast4, transactionsTable.cardName)
            .orderBy(sql`sum(${transactionsTable.amount}::numeric) desc`)

        return rows.map((r) => ({
            cardLast4: r.cardLast4 ?? '',
            cardName: r.cardName ?? `Card ••${r.cardLast4}`,
            bank: '',
            icon: 'credit-card',
            amount: Number(r.amount),
            count: r.count,
        }))
    }

    async getCardSpendForRange(params: {
        userId: string
        cardLast4: string
        range: DateRange
    }): Promise<number> {
        const [row] = await this.db
            .select({
                total: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
            })
            .from(transactionsTable)
            .where(
                and(
                    eq(transactionsTable.userId, params.userId),
                    eq(transactionsTable.cardLast4, params.cardLast4),
                    gte(transactionsTable.transactionDate, params.range.start),
                    lt(transactionsTable.transactionDate, params.range.end),
                    eq(transactionsTable.transactionType, 'debited'),
                    eq(transactionsTable.transactionMode, 'credit_card'),
                ),
            )

        return Number(row?.total ?? 0)
    }

    async getCardSpendsForRanges(params: {
        userId: string
        cards: string[]
        range: DateRange
    }): Promise<{ cardLast4: string; transactionDate: Date; amount: number }[]> {
        if (params.cards.length === 0) {
            return []
        }

        const rows = await this.db
            .select({
                cardLast4: transactionsTable.cardLast4,
                transactionDate: transactionsTable.transactionDate,
                amount: transactionsTable.amount,
            })
            .from(transactionsTable)
            .where(
                and(
                    eq(transactionsTable.userId, params.userId),
                    inArray(transactionsTable.cardLast4, params.cards),
                    gte(transactionsTable.transactionDate, params.range.start),
                    lt(transactionsTable.transactionDate, params.range.end),
                    eq(transactionsTable.transactionType, 'debited'),
                    eq(transactionsTable.transactionMode, 'credit_card'),
                    sql`${transactionsTable.cardLast4} is not null`,
                ),
            )

        return rows.map((row) => ({
            cardLast4: row.cardLast4 ?? '',
            transactionDate: row.transactionDate,
            amount: Number(row.amount),
        }))
    }

    // ── Extended Analytics ──

    async getDayOfWeekSpending(params: AnalyticsQueryParams): Promise<DayOfWeekSpendingItem[]> {
        const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

        const rows = await this.db
            .select({
                day: sql<number>`extract(dow from ${transactionsTable.transactionDate})::int`,
                amount: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
                count: sql<number>`count(*)::int`,
            })
            .from(transactionsTable)
            .where(buildDebitedAnalyticsWhere(params))
            .groupBy(sql`extract(dow from ${transactionsTable.transactionDate})`)
            .orderBy(sql`extract(dow from ${transactionsTable.transactionDate}) asc`)

        // Fill in missing days with 0
        const dayMap = new Map(rows.map((r) => [r.day, r]))
        return Array.from({ length: 7 }, (_, i) => {
            const row = dayMap.get(i)
            return {
                day: i,
                dayName: DAY_NAMES[i]!,
                amount: row ? Number(row.amount) : 0,
                count: row?.count ?? 0,
            }
        })
    }

    async getCategoryTrend(params: {
        userId: string
        months: number
        excludeSpendRules?: import('@/modules/expenses/application/utils/analytics-exclusions').SpendExclusionRule[]
    }): Promise<CategoryTrendItem[]> {
        const excludeSpendRules = params.excludeSpendRules ?? []
        const debitedInclusion = buildDebitedSpendInclusionWhere(excludeSpendRules)
        const end = new Date()
        const start = new Date()
        start.setMonth(start.getMonth() - params.months)
        start.setDate(1)
        start.setHours(0, 0, 0, 0)

        const rows = await this.db
            .select({
                month: sql<string>`to_char(${transactionsTable.transactionDate}, 'YYYY-MM')`,
                category: transactionsTable.category,
                amount: sql<string>`sum(${transactionsTable.amount}::numeric)`,
                count: sql<number>`count(*)::int`,
            })
            .from(transactionsTable)
            .where(
                and(
                    eq(transactionsTable.userId, params.userId),
                    gte(transactionsTable.transactionDate, start),
                    lte(transactionsTable.transactionDate, end),
                    eq(transactionsTable.transactionType, 'debited'),
                    debitedInclusion,
                ),
            )
            .groupBy(
                sql`to_char(${transactionsTable.transactionDate}, 'YYYY-MM')`,
                transactionsTable.category,
            )
            .orderBy(
                sql`to_char(${transactionsTable.transactionDate}, 'YYYY-MM') asc`,
                sql`sum(${transactionsTable.amount}::numeric) desc`,
            )

        return rows.map((r) => {
            const meta = CATEGORY_META[r.category]
            return {
                month: r.month,
                category: r.category,
                displayName: meta?.name ?? r.category,
                amount: Number(r.amount),
                count: r.count,
            }
        })
    }

    async getPeriodTotals(params: AnalyticsQueryParams): Promise<{
        totalSpent: number
        totalReceived: number
        transactionCount: number
    }> {
        const excludeSpendRules = params.excludeSpendRules ?? []
        const debitedAmount = debitedSpendAmountSql(excludeSpendRules)

        const [row] = await this.db
            .select({
                totalSpent: sql<string>`coalesce(sum(${debitedAmount}), 0)`,
                totalReceived: sql<string>`coalesce(sum(case when ${transactionsTable.transactionType} = 'credited' then ${transactionsTable.amount}::numeric else 0 end), 0)`,
                transactionCount: sql<number>`count(*)::int`,
            })
            .from(transactionsTable)
            .where(buildAnalyticsRangeWhere(params))

        return {
            totalSpent: Number(row?.totalSpent ?? 0),
            totalReceived: Number(row?.totalReceived ?? 0),
            transactionCount: row?.transactionCount ?? 0,
        }
    }

    async getCumulativeSpend(params: AnalyticsQueryParams): Promise<CumulativeSpendItem[]> {
        const rows = await this.listDailyDebitedTotals(params)

        let cumulative = 0
        return rows.map((r) => {
            const daily = r.daily
            cumulative += daily
            return { date: r.date, cumulative, daily }
        })
    }

    async getSavingsRate(params: {
        userId: string
        months: number
        excludeSpendRules?: import('@/modules/expenses/application/utils/analytics-exclusions').SpendExclusionRule[]
    }): Promise<SavingsRateItem[]> {
        const excludeSpendRules = params.excludeSpendRules ?? []
        const debitedAmount = debitedSpendAmountSql(excludeSpendRules)
        const end = new Date()
        const start = new Date()
        start.setMonth(start.getMonth() - params.months)
        start.setDate(1)
        start.setHours(0, 0, 0, 0)

        const rows = await this.db
            .select({
                month: sql<string>`to_char(${transactionsTable.transactionDate}, 'YYYY-MM')`,
                income: sql<string>`coalesce(sum(case when ${transactionsTable.transactionType} = 'credited' then ${transactionsTable.amount}::numeric else 0 end), 0)`,
                expenses: sql<string>`coalesce(sum(${debitedAmount}), 0)`,
            })
            .from(transactionsTable)
            .where(
                and(
                    eq(transactionsTable.userId, params.userId),
                    gte(transactionsTable.transactionDate, start),
                    lte(transactionsTable.transactionDate, end),
                ),
            )
            .groupBy(sql`to_char(${transactionsTable.transactionDate}, 'YYYY-MM')`)
            .orderBy(sql`to_char(${transactionsTable.transactionDate}, 'YYYY-MM') asc`)

        return rows.map((r) => {
            const income = Number(r.income)
            const expenses = Number(r.expenses)
            const savings = income - expenses
            return {
                month: r.month,
                income,
                expenses,
                savings,
                savingsRate: income > 0 ? Math.round((savings / income) * 10_000) / 100 : 0,
            }
        })
    }

    async getCardCategoryBreakdown(params: {
        userId: string
        range: DateRange
        cardLast4?: string
    }): Promise<CardCategoryItem[]> {
        const rows = await this.db
            .select({
                cardLast4: transactionsTable.cardLast4,
                cardName: transactionsTable.cardName,
                category: transactionsTable.category,
                amount: sql<string>`sum(${transactionsTable.amount}::numeric)`,
                count: sql<number>`count(*)::int`,
            })
            .from(transactionsTable)
            .where(
                buildAnalyticsRangeWhere(
                    params,
                    eq(transactionsTable.transactionType, 'debited'),
                    eq(transactionsTable.transactionMode, 'credit_card'),
                    sql`${transactionsTable.cardLast4} is not null`,
                ),
            )
            .groupBy(
                transactionsTable.cardLast4,
                transactionsTable.cardName,
                transactionsTable.category,
            )
            .orderBy(
                transactionsTable.cardLast4,
                sql`sum(${transactionsTable.amount}::numeric) desc`,
            )

        return rows.map((r) => {
            const meta = CATEGORY_META[r.category]
            return {
                cardLast4: r.cardLast4 ?? '',
                cardName: r.cardName ?? `Card ••${r.cardLast4}`,
                category: r.category,
                displayName: meta?.name ?? r.category,
                amount: Number(r.amount),
                count: r.count,
            }
        })
    }

    async getTopVpas(params: AnalyticsQueryParams & { limit: number }): Promise<TopVpaItem[]> {
        const rows = await this.db
            .select({
                vpa: transactionsTable.vpa,
                merchant: transactionsTable.merchant,
                amount: sql<string>`sum(${transactionsTable.amount}::numeric)`,
                count: sql<number>`count(*)::int`,
            })
            .from(transactionsTable)
            .where(
                buildDebitedAnalyticsWhere(
                    params,
                    eq(transactionsTable.transactionMode, 'upi'),
                    sql`${transactionsTable.vpa} is not null`,
                ),
            )
            .groupBy(transactionsTable.vpa, transactionsTable.merchant)
            .orderBy(sql`sum(${transactionsTable.amount}::numeric) desc`)
            .limit(params.limit)

        return rows.map((r) => ({
            vpa: r.vpa ?? '',
            merchant: r.merchant,
            amount: Number(r.amount),
            count: r.count,
        }))
    }

    async getSpendingVelocity(params: AnalyticsQueryParams): Promise<SpendingVelocityItem[]> {
        const dailyAmounts = await this.listDailyDebitedTotals(params)

        // Compute the 7-day rolling average from the shared daily aggregate.
        const WINDOW = 7
        let windowSum = 0
        return dailyAmounts.map((item, index) => {
            windowSum += item.daily
            if (index >= WINDOW) {
                windowSum -= dailyAmounts[index - WINDOW]!.daily
            }
            const windowSize = Math.min(index + 1, WINDOW)
            return {
                date: item.date,
                velocity: Math.round((windowSum / windowSize) * 100) / 100,
            }
        })
    }

    private async listDailyDebitedTotals(
        params: AnalyticsQueryParams,
    ): Promise<{ date: string; daily: number }[]> {
        const rows = await this.db
            .select({
                date: sql<string>`to_char(${transactionsTable.transactionDate}, 'YYYY-MM-DD')`,
                daily: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
            })
            .from(transactionsTable)
            .where(buildDebitedAnalyticsWhere(params))
            .groupBy(sql`to_char(${transactionsTable.transactionDate}, 'YYYY-MM-DD')`)
            .orderBy(sql`to_char(${transactionsTable.transactionDate}, 'YYYY-MM-DD') asc`)

        return rows.map((row) => ({ date: row.date, daily: Number(row.daily) }))
    }

    async getLargestTransactions(
        params: AnalyticsQueryParams & { limit: number },
    ): Promise<LargestTransactionItem[]> {
        const rows = await this.db
            .select({
                id: transactionsTable.id,
                merchant: transactionsTable.merchant,
                amount: transactionsTable.amount,
                transactionDate: transactionsTable.transactionDate,
                category: transactionsTable.category,
                subcategory: transactionsTable.subcategory,
                transactionMode: transactionsTable.transactionMode,
                confidence: transactionsTable.confidence,
                categorizationMethod: transactionsTable.categorizationMethod,
                requiresReview: transactionsTable.requiresReview,
                vpa: transactionsTable.vpa,
                cardLast4: transactionsTable.cardLast4,
            })
            .from(transactionsTable)
            .where(buildDebitedAnalyticsWhere(params))
            .orderBy(sql`${transactionsTable.amount}::numeric desc`)
            .limit(params.limit)

        return rows.map((r) => {
            const meta = CATEGORY_META[r.category]
            return {
                id: r.id,
                merchant: r.merchant,
                amount: Number(r.amount),
                transactionDate: r.transactionDate.toISOString(),
                category: r.category,
                subcategory: r.subcategory,
                displayName: meta?.name ?? r.category,
                transactionMode: r.transactionMode,
                confidence: Number(r.confidence),
                categorizationMethod: r.categorizationMethod,
                requiresReview: r.requiresReview,
                vpa: r.vpa,
                cardLast4: r.cardLast4,
            }
        })
    }

    async getClassificationHealth(params: {
        userId: string
        range: DateRange
        cardLast4?: string
    }): Promise<import('@workspace/domain').ClassificationHealth> {
        const where = buildAnalyticsRangeWhere(params)

        const [summaryRow] = await this.db
            .select({
                reviewPending: sql<number>`count(*) filter (where ${transactionsTable.requiresReview} = true)::int`,
                totalTransactions: sql<number>`count(*)::int`,
                uncategorizedCount: sql<number>`count(*) filter (where ${transactionsTable.category} = 'uncategorized')::int`,
            })
            .from(transactionsTable)
            .where(where)

        const methodRows = await this.db
            .select({
                method: transactionsTable.categorizationMethod,
                count: sql<number>`count(*)::int`,
                amount: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
            })
            .from(transactionsTable)
            .where(where)
            .groupBy(transactionsTable.categorizationMethod)
            .orderBy(sql`count(*) desc`)

        const confidenceRows = await this.db
            .select({
                bucket: sql<string>`
          case
            when ${transactionsTable.category} = 'uncategorized' then 'uncategorized'
            when ${transactionsTable.confidence}::numeric >= 0.9 then 'high'
            when ${transactionsTable.confidence}::numeric >= 0.7 then 'medium'
            else 'low'
          end
        `,
                count: sql<number>`count(*)::int`,
                amount: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
            })
            .from(transactionsTable)
            .where(where).groupBy(sql`
        case
          when ${transactionsTable.category} = 'uncategorized' then 'uncategorized'
          when ${transactionsTable.confidence}::numeric >= 0.9 then 'high'
          when ${transactionsTable.confidence}::numeric >= 0.7 then 'medium'
          else 'low'
        end
      `)

        const uncategorizedMerchants = await this.db
            .select({
                merchant: transactionsTable.merchant,
                amount: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
                count: sql<number>`count(*)::int`,
            })
            .from(transactionsTable)
            .where(
                buildAnalyticsRangeWhere(
                    params,
                    eq(transactionsTable.category, 'uncategorized'),
                    eq(transactionsTable.transactionType, 'debited'),
                ),
            )
            .groupBy(transactionsTable.merchant)
            .orderBy(sql`sum(${transactionsTable.amount}::numeric) desc`)
            .limit(10)

        const potentialBillPaymentKeywordMatch = or(
            ...POTENTIAL_CC_BILL_KEYWORD_PATTERNS.map((pattern) =>
                ilike(transactionsTable.merchant, pattern),
            ),
        )

        const potentialCreditCardBillPayments = await this.db
            .select({
                merchant: transactionsTable.merchant,
                amount: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
                count: sql<number>`count(*)::int`,
            })
            .from(transactionsTable)
            .where(
                buildAnalyticsRangeWhere(
                    params,
                    eq(transactionsTable.transactionType, 'debited'),
                    eq(transactionsTable.category, 'uncategorized'),
                    inArray(transactionsTable.transactionMode, ['upi', 'neft', 'imps', 'rtgs']),
                    potentialBillPaymentKeywordMatch,
                ),
            )
            .groupBy(transactionsTable.merchant)
            .orderBy(sql`sum(${transactionsTable.amount}::numeric) desc`)
            .limit(10)

        const bucketLabels: Record<string, string> = {
            high: 'High (≥90%)',
            medium: 'Medium (70–89%)',
            low: 'Low (<70%)',
            uncategorized: 'Uncategorized',
        }

        return {
            reviewPending: summaryRow?.reviewPending ?? 0,
            totalTransactions: summaryRow?.totalTransactions ?? 0,
            uncategorizedCount: summaryRow?.uncategorizedCount ?? 0,
            byMethod: methodRows.map((row) => ({
                method: row.method,
                count: row.count,
                amount: Number(row.amount),
            })),
            confidenceBuckets: confidenceRows.map((row) => ({
                bucket: row.bucket as 'high' | 'medium' | 'low' | 'uncategorized',
                label: bucketLabels[row.bucket] ?? row.bucket,
                count: row.count,
                amount: Number(row.amount),
            })),
            topUncategorizedMerchants: uncategorizedMerchants.map((row) => ({
                merchant: row.merchant,
                amount: Number(row.amount),
                count: row.count,
            })),
            potentialCreditCardBillPayments: potentialCreditCardBillPayments.map((row) => ({
                merchant: row.merchant,
                amount: Number(row.amount),
                count: row.count,
            })),
        }
    }

    async getSpendAnomalies(
        params: AnalyticsQueryParams,
    ): Promise<import('@workspace/domain').SpendAnomalies> {
        const anomalies: import('@workspace/domain').SpendAnomalyItem[] = []
        const debitedAmount = debitedSpendAmountSql(params.excludeSpendRules ?? [])

        const periodLengthMs = params.range.end.getTime() - params.range.start.getTime()
        const previousRange = {
            start: new Date(params.range.start.getTime() - periodLengthMs),
            end: params.range.start,
        }

        const [currentSpent] = await this.db
            .select({
                total: sql<string>`coalesce(sum(${debitedAmount}), 0)`,
            })
            .from(transactionsTable)
            .where(buildAnalyticsRangeWhere(params))

        const [previousSpent] = await this.db
            .select({
                total: sql<string>`coalesce(sum(${debitedSpendAmountSql(params.excludeSpendRules ?? [])}), 0)`,
            })
            .from(transactionsTable)
            .where(buildAnalyticsRangeWhere({ ...params, range: previousRange }))

        const currentTotal = Number(currentSpent?.total ?? 0)
        const previousTotal = Number(previousSpent?.total ?? 0)

        if (previousTotal > 0) {
            const changePercent = ((currentTotal - previousTotal) / previousTotal) * 100
            if (Math.abs(changePercent) >= 25) {
                anomalies.push({
                    type: changePercent > 0 ? 'spike' : 'category_drift',
                    label: changePercent > 0 ? 'Spending spike' : 'Spending drop',
                    description: `Total spend changed ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(0)}% vs previous period`,
                    amount: currentTotal,
                    changePercent,
                })
            }
        }

        const newMerchants = await this.db
            .select({
                merchant: transactionsTable.merchant,
                amount: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
            })
            .from(transactionsTable)
            .where(
                buildDebitedAnalyticsWhere(
                    params,
                    sql`
            not exists (
              select 1
              from transactions previous_transactions
              where previous_transactions.user_id = ${params.userId}
                and previous_transactions.transaction_date >= ${previousRange.start}
                and previous_transactions.transaction_date < ${previousRange.end}
                and previous_transactions.merchant = ${transactionsTable.merchant}
                ${params.cardLast4 ? sql`and previous_transactions.card_last4 = ${params.cardLast4}` : sql``}
            )
          `,
                ),
            )
            .groupBy(transactionsTable.merchant)
            .orderBy(sql`sum(${transactionsTable.amount}::numeric) desc`)
            .limit(5)

        for (const row of newMerchants) {
            anomalies.push({
                type: 'new_merchant',
                label: 'New merchant',
                description: `First-time spend with ${row.merchant}`,
                merchant: row.merchant,
                amount: Number(row.amount),
            })
        }

        const categoryShifts = await this.db
            .select({
                category: transactionsTable.category,
                amount: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
            })
            .from(transactionsTable)
            .where(buildDebitedAnalyticsWhere(params))
            .groupBy(transactionsTable.category)
            .orderBy(sql`sum(${transactionsTable.amount}::numeric) desc`)
            .limit(1)

        if (categoryShifts[0]) {
            const topCategory = categoryShifts[0].category
            const meta = CATEGORY_META[topCategory]
            anomalies.push({
                type: 'category_drift',
                label: 'Top category',
                description: `${meta?.name ?? topCategory} is your largest spend category this period`,
                category: topCategory,
                amount: Number(categoryShifts[0].amount),
            })
        }

        return { anomalies }
    }

    async bulkApplyRuleByIds(params: {
        userId: string
        ids: string[]
        category: string
        subcategory: string
        categoryMetadata?: { icon: string; color: string; parent: string | null }
        requiresReview?: boolean
        transactionAttributes?: Transaction['transactionAttributes']
    }): Promise<number> {
        if (params.ids.length === 0) return 0

        const setClause: Record<string, unknown> = {
            category: params.category,
            subcategory: params.subcategory,
            categorizationMethod: 'user_rule',
            confidence: '0.9800',
            requiresReview: params.requiresReview ?? false,
            updatedAt: new Date(),
        }

        if (params.categoryMetadata) {
            setClause.categoryMetadata = params.categoryMetadata
        }
        if (params.transactionAttributes) {
            setClause.transactionAttributes = params.transactionAttributes
        }

        const result = await this.db
            .update(transactionsTable)
            .set(setClause)
            .where(
                and(
                    eq(transactionsTable.userId, params.userId),
                    inArray(transactionsTable.id, params.ids),
                ),
            )
            .returning({ id: transactionsTable.id })

        return result.length
    }

    // ── Merchant bulk categorization ──

    async getDistinctMerchants(
        userId: string,
    ): Promise<
        { merchant: string; category: string; subcategory: string; transactionCount: number }[]
    > {
        const rows = await this.db
            .select({
                merchant: transactionsTable.merchant,
                category: transactionsTable.category,
                subcategory: transactionsTable.subcategory,
                transactionCount: sql<number>`count(*)::int`,
            })
            .from(transactionsTable)
            .where(eq(transactionsTable.userId, userId))
            .groupBy(
                transactionsTable.merchant,
                transactionsTable.category,
                transactionsTable.subcategory,
            )
            .orderBy(sql`count(*) desc`)
            .limit(TransactionRepositoryImpl.DISTINCT_MERCHANTS_MAX_ROWS)

        // Aggregate: same merchant may have multiple categories — pick the most common one
        const merchantMap = new Map<
            string,
            { merchant: string; category: string; subcategory: string; transactionCount: number }
        >()

        for (const row of rows) {
            const existing = merchantMap.get(row.merchant)
            if (!existing || row.transactionCount > existing.transactionCount) {
                merchantMap.set(row.merchant, {
                    merchant: row.merchant,
                    category: row.category,
                    subcategory: row.subcategory,
                    transactionCount: existing
                        ? existing.transactionCount + row.transactionCount
                        : row.transactionCount,
                })
            } else {
                existing.transactionCount += row.transactionCount
            }
        }

        return [...merchantMap.values()].sort((a, b) => b.transactionCount - a.transactionCount)
    }

    async getCategorizedMerchants(
        userId: string,
    ): Promise<{ merchant: string; category: string; subcategory: string }[]> {
        const rows = await this.db
            .select({
                merchant: transactionsTable.merchant,
                category: transactionsTable.category,
                subcategory: transactionsTable.subcategory,
                transactionCount: sql<number>`count(*)::int`,
            })
            .from(transactionsTable)
            .where(
                and(
                    eq(transactionsTable.userId, userId),
                    ne(transactionsTable.category, 'uncategorized'),
                ),
            )
            .groupBy(
                transactionsTable.merchant,
                transactionsTable.category,
                transactionsTable.subcategory,
            )
            .orderBy(sql`count(*) desc`)
            .limit(TransactionRepositoryImpl.DISTINCT_MERCHANTS_MAX_ROWS)

        // Deduplicate: same merchant may have multiple categories — pick the most common one
        const merchantMap = new Map<
            string,
            { merchant: string; category: string; subcategory: string; count: number }
        >()

        for (const row of rows) {
            const existing = merchantMap.get(row.merchant)
            if (!existing || row.transactionCount > existing.count) {
                merchantMap.set(row.merchant, {
                    merchant: row.merchant,
                    category: row.category,
                    subcategory: row.subcategory,
                    count: row.transactionCount,
                })
            }
        }

        return [...merchantMap.values()].map(({ merchant, category, subcategory }) => ({
            merchant,
            category,
            subcategory,
        }))
    }

    async bulkCategorizeByMerchant(params: {
        userId: string
        merchant: string
        category: string
        subcategory: string
        categoryMetadata?: { icon: string; color: string; parent: string | null }
    }): Promise<number> {
        const setClause: Record<string, unknown> = {
            category: params.category,
            subcategory: params.subcategory,
            categorizationMethod: 'merchant_rule',
            confidence: '1.0000',
            requiresReview: false,
            updatedAt: new Date(),
        }

        if (params.categoryMetadata) {
            setClause.categoryMetadata = params.categoryMetadata
        }

        const result = await this.db
            .update(transactionsTable)
            .set(setClause)
            .where(
                and(
                    eq(transactionsTable.userId, params.userId),
                    eq(transactionsTable.merchant, params.merchant),
                ),
            )
            .returning({ id: transactionsTable.id })

        return result.length
    }

    async bulkUpdateByIds(params: {
        userId: string
        ids: string[]
        data: {
            category?: string
            subcategory?: string
            transactionMode?: string
            requiresReview?: boolean
        }
    }): Promise<number> {
        if (params.ids.length === 0) return 0

        const setClause: Record<string, unknown> = {
            updatedAt: new Date(),
            categorizationMethod: 'manual',
            confidence: '1.0000',
        }

        if (params.data.category !== undefined) {
            setClause.category = params.data.category
        }
        if (params.data.subcategory !== undefined) {
            setClause.subcategory = params.data.subcategory
        }
        if (params.data.transactionMode !== undefined) {
            setClause.transactionMode = params.data.transactionMode
        }
        if (params.data.requiresReview !== undefined) {
            setClause.requiresReview = params.data.requiresReview
        }

        const result = await this.db
            .update(transactionsTable)
            .set(setClause)
            .where(
                and(
                    eq(transactionsTable.userId, params.userId),
                    inArray(transactionsTable.id, params.ids),
                ),
            )
            .returning({ id: transactionsTable.id })

        return result.length
    }

    async listAllForUser(userId: string): Promise<Transaction[]> {
        const records = await this.db
            .select()
            .from(transactionsTable)
            .where(eq(transactionsTable.userId, userId))
            .orderBy(desc(transactionsTable.transactionDate))

        return records.map((record) => this.toDomain(record))
    }

    async listByUserInDateRange(params: {
        userId: string
        range: DateRange
        cardLast4?: string
        limit?: number
    }): Promise<Transaction[]> {
        const where = this.buildFilterWhere(params.userId, {
            dateFrom: params.range.start,
            dateTo: params.range.end,
            cardLast4: params.cardLast4,
        })

        let query = this.db
            .select()
            .from(transactionsTable)
            .where(where)
            .orderBy(desc(transactionsTable.transactionDate))

        if (params.limit !== undefined) {
            query = query.limit(params.limit) as typeof query
        }

        const records = await query
        return records.map((record) => this.toDomain(record))
    }

    async listByUserInDateRangeMatchingRules(params: {
        userId: string
        range: DateRange
        cardLast4?: string
        limit?: number
        rules: { conditions: RuleConditionGroup }[]
    }): Promise<Transaction[] | null> {
        const rulePredicates: SQL[] = []

        for (const rule of params.rules) {
            const predicate = this.ruleConditionGroupToSql(rule.conditions)
            if (!predicate) {
                return null
            }
            rulePredicates.push(predicate)
        }

        if (rulePredicates.length === 0) {
            return []
        }

        const where = and(
            eq(transactionsTable.userId, params.userId),
            gte(transactionsTable.transactionDate, params.range.start),
            lt(transactionsTable.transactionDate, params.range.end),
            params.cardLast4 ? eq(transactionsTable.cardLast4, params.cardLast4) : undefined,
            or(...rulePredicates),
        )

        let query = this.db
            .select()
            .from(transactionsTable)
            .where(where)
            .orderBy(desc(transactionsTable.transactionDate))

        if (params.limit !== undefined) {
            query = query.limit(params.limit) as typeof query
        }

        const records = await query
        return records.map((record) => this.toDomain(record))
    }

    private ruleConditionGroupToSql(group: RuleConditionGroup): SQL | null {
        const candidates = [
            ...group.conditions.map((condition) => this.ruleConditionToSql(condition)),
            ...(group.groups ?? []).map((nestedGroup) => this.ruleConditionGroupToSql(nestedGroup)),
        ]

        if (candidates.includes(null)) {
            return null
        }

        const predicates = candidates as SQL[]

        if (predicates.length === 0) {
            return null
        }

        return group.logic === 'AND' ? and(...predicates)! : or(...predicates)!
    }

    private ruleConditionToSql(condition: RuleCondition): SQL | null {
        switch (condition.field) {
            case 'amount': {
                switch (condition.op) {
                    case 'eq': {
                        return sql`${transactionsTable.amount}::numeric = ${condition.value}`
                    }
                    case 'gte': {
                        return sql`${transactionsTable.amount}::numeric >= ${condition.value}`
                    }
                    case 'lte': {
                        return sql`${transactionsTable.amount}::numeric <= ${condition.value}`
                    }
                    case 'between': {
                        return sql`${transactionsTable.amount}::numeric >= ${condition.value} and ${transactionsTable.amount}::numeric <= ${condition.valueTo ?? condition.value}`
                    }
                    default: {
                        return null
                    }
                }
            }
            case 'transaction_type': {
                return eq(transactionsTable.transactionType, condition.value)
            }
            case 'merchant': {
                return this.stringRuleConditionToSql(
                    transactionsTable.merchant,
                    condition.op,
                    condition.value,
                )
            }
            case 'merchant_raw': {
                return this.stringRuleConditionToSql(
                    transactionsTable.merchantRaw,
                    condition.op,
                    condition.value,
                )
            }
            case 'vpa': {
                return this.stringRuleConditionToSql(
                    transactionsTable.vpa,
                    condition.op,
                    condition.value,
                )
            }
            case 'transaction_mode': {
                return eq(transactionsTable.transactionMode, condition.value)
            }
            case 'card_last4': {
                return eq(transactionsTable.cardLast4, condition.value)
            }
            case 'day_of_month': {
                if (condition.op === 'eq') {
                    return sql`extract(day from ${transactionsTable.transactionDate})::int = ${condition.value}`
                }
                return sql`extract(day from ${transactionsTable.transactionDate})::int >= ${condition.value} and extract(day from ${transactionsTable.transactionDate})::int <= ${condition.valueTo ?? condition.value}`
            }
            default: {
                return null
            }
        }
    }

    private stringRuleConditionToSql(
        column:
            | typeof transactionsTable.merchant
            | typeof transactionsTable.merchantRaw
            | typeof transactionsTable.vpa,
        op: 'eq' | 'contains' | 'regex',
        value: string,
    ): SQL | null {
        switch (op) {
            case 'eq': {
                return sql`lower(coalesce(${column}, '')) = lower(${value})`
            }
            case 'contains': {
                return ilike(column, `%${value}%`)
            }
            case 'regex': {
                return sql`coalesce(${column}, '') ~* ${value}`
            }
            default: {
                return null
            }
        }
    }

    async updateTransactionAttributesBatch(params: {
        userId: string
        updates: { id: string; transactionAttributes: Transaction['transactionAttributes'] }[]
    }): Promise<void> {
        if (params.updates.length === 0) {
            return
        }

        const batchSize = 100
        for (let index = 0; index < params.updates.length; index += batchSize) {
            const chunk = params.updates.slice(index, index + batchSize)
            await Promise.all(
                chunk.map((update) =>
                    this.db
                        .update(transactionsTable)
                        .set({
                            transactionAttributes: update.transactionAttributes ?? null,
                            updatedAt: new Date(),
                        })
                        .where(
                            and(
                                eq(transactionsTable.userId, params.userId),
                                eq(transactionsTable.id, update.id),
                            ),
                        ),
                ),
            )
        }
    }

    private formatSubcategoryLabel(subcategory: string): string {
        return subcategory.replaceAll('_', ' ').replaceAll(/\b\w/g, (char) => char.toUpperCase())
    }

    /**
     * Bus merchant regex: matches "KA01AR4188", "BMTC BUS KA57F0015", etc.
     */
    private readonly BUS_MERCHANT_REGEX = `^(BMTC BUS )?[A-Z]{2}\\d{2}[A-Z]{1,2}\\d{3,5}$`

    /**
     * Investment merchant regex: matches Groww, Zerodha, ICCL Mutual Funds, MMTC PAMP Gold
     */
    private readonly INVESTMENT_MERCHANT_REGEX = `^(groww invest tech|zerodha broking|mutual funds iccl|mmtc pamp india)`

    private classifyAssetType(merchant: string): 'stocks' | 'mutual_funds' | 'gold' | null {
        const lower = merchant.toLowerCase()
        if (lower.includes('groww') || lower.includes('zerodha')) return 'stocks'
        if (lower.includes('mutual funds iccl')) return 'mutual_funds'
        if (lower.includes('mmtc pamp')) return 'gold'
        return null
    }

    private resolveAssetType(txn: {
        merchant: string
        subcategory?: string
        transactionAttributes?: TransactionAttributes | null
    }): 'stocks' | 'mutual_funds' | 'gold' | null {
        const fromAttributes = txn.transactionAttributes?.assetClass
        if (
            fromAttributes === 'stocks' ||
            fromAttributes === 'mutual_funds' ||
            fromAttributes === 'gold'
        ) {
            return fromAttributes
        }

        if (
            txn.subcategory === 'stocks' ||
            txn.subcategory === 'mutual_funds' ||
            txn.subcategory === 'gold'
        ) {
            return txn.subcategory
        }

        return this.classifyAssetType(txn.merchant)
    }

    private getPlatformName(merchant: string): string {
        const lower = merchant.toLowerCase()
        if (lower.includes('groww')) return 'Groww'
        if (lower.includes('zerodha')) return 'Zerodha'
        if (lower.includes('mutual funds iccl')) return 'ICCL'
        if (lower.includes('mmtc pamp')) return 'MMTC-PAMP'
        return merchant
    }

    private resolvePlatformName(txn: {
        merchant: string
        transactionAttributes?: TransactionAttributes | null
    }): string {
        return txn.transactionAttributes?.platform ?? this.getPlatformName(txn.merchant)
    }

    async getBusAnalytics(params: { userId: string; range: DateRange }): Promise<BusAnalytics> {
        const busWhere = and(
            eq(transactionsTable.userId, params.userId),
            gte(transactionsTable.transactionDate, params.range.start),
            lt(transactionsTable.transactionDate, params.range.end),
            eq(transactionsTable.transactionType, 'debited'),
            sql`${transactionsTable.merchant} ~* ${this.BUS_MERCHANT_REGEX}`,
        )

        // Summary
        const [summary] = await this.db
            .select({
                totalSpent: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
                totalTrips: sql<number>`count(*)::int`,
                uniqueBuses: sql<number>`count(distinct ${transactionsTable.merchant})::int`,
                firstTrip: sql<string>`min(${transactionsTable.transactionDate})::text`,
                lastTrip: sql<string>`max(${transactionsTable.transactionDate})::text`,
            })
            .from(transactionsTable)
            .where(busWhere)

        const totalSpent = Number(summary?.totalSpent ?? 0)
        const totalTrips = summary?.totalTrips ?? 0

        // Routes (group by bus number)
        const routeRows = await this.db
            .select({
                busNumber: transactionsTable.merchant,
                totalSpent: sql<string>`sum(${transactionsTable.amount}::numeric)`,
                tripCount: sql<number>`count(*)::int`,
                avgFare: sql<string>`avg(${transactionsTable.amount}::numeric)`,
                firstTrip: sql<string>`min(${transactionsTable.transactionDate})::text`,
                lastTrip: sql<string>`max(${transactionsTable.transactionDate})::text`,
            })
            .from(transactionsTable)
            .where(busWhere)
            .groupBy(transactionsTable.merchant)
            .orderBy(sql`count(*) desc`)

        // Daily frequency
        const dailyRows = await this.db
            .select({
                date: sql<string>`${transactionsTable.transactionDate}::date::text`,
                trips: sql<number>`count(*)::int`,
                amount: sql<string>`sum(${transactionsTable.amount}::numeric)`,
            })
            .from(transactionsTable)
            .where(busWhere)
            .groupBy(sql`${transactionsTable.transactionDate}::date`)
            .orderBy(sql`${transactionsTable.transactionDate}::date`)

        // Day of week
        const dayOfWeekNames = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
        ]
        const dowRows = await this.db
            .select({
                day: sql<number>`extract(dow from ${transactionsTable.transactionDate})::int`,
                trips: sql<number>`count(*)::int`,
                amount: sql<string>`sum(${transactionsTable.amount}::numeric)`,
            })
            .from(transactionsTable)
            .where(busWhere)
            .groupBy(sql`extract(dow from ${transactionsTable.transactionDate})`)
            .orderBy(sql`extract(dow from ${transactionsTable.transactionDate})`)

        // Monthly trend
        const monthlyRows = await this.db
            .select({
                month: sql<string>`to_char(${transactionsTable.transactionDate}, 'YYYY-MM')`,
                trips: sql<number>`count(*)::int`,
                amount: sql<string>`sum(${transactionsTable.amount}::numeric)`,
            })
            .from(transactionsTable)
            .where(busWhere)
            .groupBy(sql`to_char(${transactionsTable.transactionDate}, 'YYYY-MM')`)
            .orderBy(sql`to_char(${transactionsTable.transactionDate}, 'YYYY-MM')`)

        // Time of day (hour)
        const hourRows = await this.db
            .select({
                hour: sql<number>`extract(hour from ${transactionsTable.transactionDate})::int`,
                trips: sql<number>`count(*)::int`,
                amount: sql<string>`sum(${transactionsTable.amount}::numeric)`,
            })
            .from(transactionsTable)
            .where(busWhere)
            .groupBy(sql`extract(hour from ${transactionsTable.transactionDate})`)
            .orderBy(sql`extract(hour from ${transactionsTable.transactionDate})`)

        return {
            totalSpent,
            totalTrips,
            avgFare: totalTrips > 0 ? totalSpent / totalTrips : 0,
            uniqueBuses: summary?.uniqueBuses ?? 0,
            firstTrip: summary?.firstTrip ?? null,
            lastTrip: summary?.lastTrip ?? null,
            routes: routeRows.map((r) => ({
                busNumber: r.busNumber,
                totalSpent: Number(r.totalSpent),
                tripCount: r.tripCount,
                avgFare: Number(r.avgFare),
                firstTrip: r.firstTrip,
                lastTrip: r.lastTrip,
            })),
            dailyFrequency: dailyRows.map((r) => ({
                date: r.date,
                trips: r.trips,
                amount: Number(r.amount),
            })),
            dayOfWeek: dowRows.map((r) => ({
                day: r.day,
                dayName: dayOfWeekNames[r.day] ?? `Day ${r.day}`,
                trips: r.trips,
                amount: Number(r.amount),
            })),
            monthlyTrend: monthlyRows.map((r) => ({
                month: r.month,
                trips: r.trips,
                amount: Number(r.amount),
            })),
            timeOfDay: hourRows.map((r) => ({
                hour: r.hour,
                trips: r.trips,
                amount: Number(r.amount),
            })),
        }
    }

    async getInvestmentAnalytics(params: {
        userId: string
        range: DateRange
    }): Promise<InvestmentAnalytics> {
        const investmentWhere = and(
            eq(transactionsTable.userId, params.userId),
            gte(transactionsTable.transactionDate, params.range.start),
            lt(transactionsTable.transactionDate, params.range.end),
            eq(transactionsTable.transactionType, 'debited'),
            or(
                eq(transactionsTable.category, 'investments'),
                sql`${transactionsTable.merchant} ~* ${this.INVESTMENT_MERCHANT_REGEX}`,
            ),
        )

        // Summary
        const [summary] = await this.db
            .select({
                totalInvested: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)`,
                transactionCount: sql<number>`count(*)::int`,
                activePlatforms: sql<number>`count(distinct ${transactionsTable.merchant})::int`,
                firstInvestment: sql<string>`min(${transactionsTable.transactionDate})::text`,
                lastInvestment: sql<string>`max(${transactionsTable.transactionDate})::text`,
            })
            .from(transactionsTable)
            .where(investmentWhere)

        const totalInvested = Number(summary?.totalInvested ?? 0)
        const transactionCount = summary?.transactionCount ?? 0

        // Calculate days since last investment and avg days between
        let daysSinceLastInvestment: number | null = null
        let avgDaysBetweenInvestments: number | null = null

        if (summary?.lastInvestment) {
            const lastDate = new Date(summary.lastInvestment)
            const now = new Date()
            daysSinceLastInvestment = Math.floor(
                (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
            )
        }

        if (transactionCount > 1 && summary?.firstInvestment && summary?.lastInvestment) {
            const firstDate = new Date(summary.firstInvestment)
            const lastDate = new Date(summary.lastInvestment)
            const totalDays = Math.floor(
                (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
            )
            avgDaysBetweenInvestments = totalDays / (transactionCount - 1)
        }

        // Get all investment transactions for asset type classification
        const allInvestments = await this.db
            .select({
                merchant: transactionsTable.merchant,
                subcategory: transactionsTable.subcategory,
                transactionAttributes: transactionsTable.transactionAttributes,
                amount: transactionsTable.amount,
                date: transactionsTable.transactionDate,
                id: transactionsTable.id,
            })
            .from(transactionsTable)
            .where(investmentWhere)
            .orderBy(transactionsTable.transactionDate)

        // Calculate consistency score (months with investments)
        const monthsSet = new Set(
            allInvestments.map((inv) => {
                const date = new Date(inv.date)
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            }),
        )

        const rangeMonths = Math.ceil(
            (params.range.end.getTime() - params.range.start.getTime()) /
                (1000 * 60 * 60 * 24 * 30),
        )
        const consistencyScore = rangeMonths > 0 ? (monthsSet.size / rangeMonths) * 100 : 0

        // Asset type breakdown
        const assetTypeMap = new Map<
            string,
            {
                totalInvested: number
                transactionCount: number
                amounts: number[]
                dates: string[]
            }
        >()

        for (const inv of allInvestments) {
            const assetType = this.resolveAssetType({
                merchant: inv.merchant,
                subcategory: inv.subcategory,
                transactionAttributes: inv.transactionAttributes as TransactionAttributes | null,
            })
            if (!assetType) continue

            const existing = assetTypeMap.get(assetType)
            const amount = Number(inv.amount)

            if (existing) {
                existing.totalInvested += amount
                existing.transactionCount += 1
                existing.amounts.push(amount)
                existing.dates.push(inv.date.toISOString())
            } else {
                assetTypeMap.set(assetType, {
                    totalInvested: amount,
                    transactionCount: 1,
                    amounts: [amount],
                    dates: [inv.date.toISOString()],
                })
            }
        }

        const assetTypeBreakdown = [...assetTypeMap.entries()].map(([type, data]) => ({
            assetType: type as 'stocks' | 'mutual_funds' | 'gold',
            totalInvested: data.totalInvested,
            transactionCount: data.transactionCount,
            avgAmount: data.totalInvested / data.transactionCount,
            minAmount: Math.min(...data.amounts),
            maxAmount: Math.max(...data.amounts),
            firstInvestment: data.dates[0] ?? null,
            lastInvestment: data.dates.at(-1) ?? null,
            percentageOfTotal: totalInvested > 0 ? (data.totalInvested / totalInvested) * 100 : 0,
        }))

        // Platform breakdown
        const platformMap = new Map<
            string,
            {
                totalInvested: number
                transactionCount: number
                assetTypes: Set<string>
            }
        >()

        for (const inv of allInvestments) {
            const platform = this.resolvePlatformName({
                merchant: inv.merchant,
                transactionAttributes: inv.transactionAttributes as TransactionAttributes | null,
            })
            const assetType = this.resolveAssetType({
                merchant: inv.merchant,
                subcategory: inv.subcategory,
                transactionAttributes: inv.transactionAttributes as TransactionAttributes | null,
            })
            const amount = Number(inv.amount)

            const existing = platformMap.get(platform)
            if (existing) {
                existing.totalInvested += amount
                existing.transactionCount += 1
                if (assetType) existing.assetTypes.add(assetType)
            } else {
                platformMap.set(platform, {
                    totalInvested: amount,
                    transactionCount: 1,
                    assetTypes: assetType ? new Set([assetType]) : new Set(),
                })
            }
        }

        const platformBreakdown = [...platformMap.entries()].map(([platform, data]) => ({
            platform,
            totalInvested: data.totalInvested,
            transactionCount: data.transactionCount,
            avgAmount: data.totalInvested / data.transactionCount,
            primaryAssetType: data.assetTypes.size > 0 ? ([...data.assetTypes][0] ?? null) : null,
        }))

        // Monthly trend with asset type breakdown
        const monthlyMap = new Map<
            string,
            {
                totalInvested: number
                transactionCount: number
                stocks: number
                mutualFunds: number
                gold: number
            }
        >()

        for (const inv of allInvestments) {
            const date = new Date(inv.date)
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            const assetType = this.resolveAssetType({
                merchant: inv.merchant,
                subcategory: inv.subcategory,
                transactionAttributes: inv.transactionAttributes as TransactionAttributes | null,
            })
            const amount = Number(inv.amount)

            const existing = monthlyMap.get(month)
            if (existing) {
                existing.totalInvested += amount
                existing.transactionCount += 1
                switch (assetType) {
                    case 'stocks': {
                        existing.stocks += amount
                        break
                    }
                    case 'mutual_funds': {
                        existing.mutualFunds += amount
                        break
                    }
                    case 'gold': {
                        {
                            existing.gold += amount
                            // No default
                        }
                        break
                    }
                }
            } else {
                monthlyMap.set(month, {
                    totalInvested: amount,
                    transactionCount: 1,
                    stocks: assetType === 'stocks' ? amount : 0,
                    mutualFunds: assetType === 'mutual_funds' ? amount : 0,
                    gold: assetType === 'gold' ? amount : 0,
                })
            }
        }

        const monthlyTrend = [...monthlyMap.entries()]
            .map(([month, data]) => ({
                month,
                totalInvested: data.totalInvested,
                transactionCount: data.transactionCount,
                stocks: data.stocks,
                mutualFunds: data.mutualFunds,
                gold: data.gold,
            }))
            .sort((a, b) => a.month.localeCompare(b.month))

        // Day of week
        const dayOfWeekNames = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
        ]
        const dowMap = new Map<number, { transactionCount: number; amount: number }>()

        for (const inv of allInvestments) {
            const dow = new Date(inv.date).getDay()
            const amount = Number(inv.amount)
            const existing = dowMap.get(dow)
            if (existing) {
                existing.transactionCount += 1
                existing.amount += amount
            } else {
                dowMap.set(dow, { transactionCount: 1, amount })
            }
        }

        const dayOfWeek = [...dowMap.entries()]
            .map(([day, data]) => ({
                day,
                dayName: dayOfWeekNames[day] ?? `Day ${day}`,
                transactionCount: data.transactionCount,
                amount: data.amount,
            }))
            .sort((a, b) => a.day - b.day)

        // Time of day
        const hourMap = new Map<number, { transactionCount: number; amount: number }>()

        for (const inv of allInvestments) {
            const hour = new Date(inv.date).getHours()
            const amount = Number(inv.amount)
            const existing = hourMap.get(hour)
            if (existing) {
                existing.transactionCount += 1
                existing.amount += amount
            } else {
                hourMap.set(hour, { transactionCount: 1, amount })
            }
        }

        const timeOfDay = [...hourMap.entries()]
            .map(([hour, data]) => ({
                hour,
                transactionCount: data.transactionCount,
                amount: data.amount,
            }))
            .sort((a, b) => a.hour - b.hour)

        // Largest investments
        const largestInvestments = allInvestments
            .sort((a, b) => Number(b.amount) - Number(a.amount))
            .slice(0, 10)
            .map((inv) => ({
                id: inv.id,
                date: inv.date.toISOString(),
                merchant: inv.merchant,
                amount: Number(inv.amount),
                assetType:
                    this.resolveAssetType({
                        merchant: inv.merchant,
                        subcategory: inv.subcategory,
                        transactionAttributes:
                            inv.transactionAttributes as TransactionAttributes | null,
                    }) ?? 'unknown',
            }))

        // SIP Detection
        const sipMap = new Map<
            string,
            {
                amounts: number[]
                dates: Date[]
                assetType: string
            }
        >()

        for (const inv of allInvestments) {
            const merchant = inv.merchant
            const assetType = this.resolveAssetType({
                merchant: inv.merchant,
                subcategory: inv.subcategory,
                transactionAttributes: inv.transactionAttributes as TransactionAttributes | null,
            })
            if (!assetType) continue

            const existing = sipMap.get(merchant)
            if (existing) {
                existing.amounts.push(Number(inv.amount))
                existing.dates.push(new Date(inv.date))
            } else {
                sipMap.set(merchant, {
                    amounts: [Number(inv.amount)],
                    dates: [new Date(inv.date)],
                    assetType,
                })
            }
        }

        const detectedSips = [...sipMap.entries()]
            .filter(([, data]) => {
                // Require at least 3 transactions
                if (data.amounts.length < 3) return false

                // Check if amounts are similar (within ±20%)
                const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length
                const withinRange = data.amounts.every(
                    (amt) => Math.abs(amt - avgAmount) / avgAmount <= 0.2,
                )
                if (!withinRange) return false

                // Check if dates are recurring (roughly monthly)
                const sortedDates = data.dates.sort((a, b) => a.getTime() - b.getTime())
                const intervals: number[] = []
                for (let i = 1; i < sortedDates.length; i++) {
                    const days = Math.floor(
                        (sortedDates[i]!.getTime() - sortedDates[i - 1]!.getTime()) /
                            (1000 * 60 * 60 * 24),
                    )
                    intervals.push(days)
                }

                // Check if intervals are roughly monthly (25-35 days)
                const monthlyPattern = intervals.every((days) => days >= 25 && days <= 35)
                return monthlyPattern
            })
            .map(([merchant, data]) => {
                const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length
                const sortedDates = data.dates.sort((a, b) => a.getTime() - b.getTime())
                const lastDate = sortedDates.at(-1)!

                // Estimate next investment (30 days from last)
                const estimatedNext = new Date(lastDate)
                estimatedNext.setDate(estimatedNext.getDate() + 30)

                return {
                    merchant,
                    avgAmount,
                    transactionCount: data.amounts.length,
                    frequency: 'Monthly',
                    lastInvestment: lastDate.toISOString(),
                    estimatedNext: estimatedNext.toISOString(),
                    assetType: data.assetType,
                }
            })

        return {
            totalInvested,
            transactionCount,
            avgInvestment: transactionCount > 0 ? totalInvested / transactionCount : 0,
            activePlatforms: summary?.activePlatforms ?? 0,
            firstInvestment: summary?.firstInvestment ?? null,
            lastInvestment: summary?.lastInvestment ?? null,
            daysSinceLastInvestment,
            avgDaysBetweenInvestments,
            consistencyScore,
            assetTypeBreakdown,
            platformBreakdown,
            monthlyTrend,
            dayOfWeek,
            timeOfDay,
            largestInvestments,
            detectedSips,
        }
    }

    private toInsert(transaction: Transaction): InsertTransaction {
        return {
            id: transaction.id,
            userId: transaction.userId,
            dedupeHash: transaction.dedupeHash,
            merchant: transaction.merchant,
            merchantRaw: transaction.merchantRaw,
            vpa: transaction.vpa ?? null,
            amount: transaction.amount.toString(),
            currency: transaction.currency,
            transactionDate: new Date(transaction.transactionDate),
            transactionType: transaction.transactionType,
            transactionMode: transaction.transactionMode,
            cardLast4: transaction.cardLast4 ?? null,
            cardName: transaction.cardName ?? null,
            category: transaction.category,
            subcategory: transaction.subcategory,
            confidence: transaction.confidence.toString(),
            categorizationMethod: transaction.categorizationMethod,
            requiresReview: transaction.requiresReview,
            categoryMetadata: transaction.categoryMetadata,
            transactionAttributes: transaction.transactionAttributes ?? null,
            statementId: transaction.statementId ?? null,
            sourceEmailId: transaction.sourceEmailId,
        }
    }

    private toDomain(record: TransactionRecord): Transaction {
        return {
            id: record.id,
            userId: record.userId,
            dedupeHash: record.dedupeHash,
            merchant: record.merchant,
            merchantRaw: record.merchantRaw,
            vpa: record.vpa ?? undefined,
            amount: Number(record.amount),
            currency: record.currency,
            transactionDate: record.transactionDate.toISOString(),
            transactionType: record.transactionType as Transaction['transactionType'],
            transactionMode: record.transactionMode as Transaction['transactionMode'],
            category: record.category,
            subcategory: record.subcategory,
            confidence: Number(record.confidence),
            categorizationMethod: record.categorizationMethod,
            requiresReview: record.requiresReview,
            categoryMetadata: {
                icon: record.categoryMetadata.icon,
                color: record.categoryMetadata.color,
                parent: record.categoryMetadata.parent,
            },
            statementId: record.statementId ?? undefined,
            sourceEmailId: record.sourceEmailId,
            cardLast4: record.cardLast4 ?? undefined,
            cardName: record.cardName ?? undefined,
            transactionAttributes: record.transactionAttributes
                ? (record.transactionAttributes as TransactionAttributes)
                : undefined,
        }
    }
}
