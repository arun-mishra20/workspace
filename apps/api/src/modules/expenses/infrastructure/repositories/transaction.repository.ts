import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, gte, lt, lte, sql } from "drizzle-orm";

import {
    transactionsTable,
    type InsertTransaction,
    type TransactionRecord,
} from "@workspace/database";

import { DB_TOKEN, type DrizzleDb } from "@/shared/infrastructure/db/db.port";
import type {
    TransactionRepository,
    DateRange,
} from "@/modules/expenses/application/ports/transaction.repository.port";
import type {
    Transaction,
    UpdateTransactionInput,
    SpendingSummary,
    SpendingByCategoryItem,
    SpendingByModeItem,
    SpendingByMerchantItem,
    DailySpendingItem,
    MonthlyTrendItem,
    SpendingByCardItem,
} from "@workspace/domain";

function loadCategoryMeta(): Record<
    string,
    { name: string; icon: string; color: string; parent: string | null }
> {
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    /*
    The asset copy rule is there. The loadCategoryMeta function handles both scenarios:
    Dev mode (pnpm dev): SWC runs from source, so import.meta.url resolves to the src/ directory. The first candidate path (default_categories.json relative to repositories/) will find it.
    Built mode (pnpm build → dist/): nest-cli copies the JSON to dist/modules/expenses/infrastructure/categorization/config/. The first candidate path still works since the relative directory structure is preserved.
    Fallback: process.cwd() + src/... covers running from the project root directly.

     */
    const candidatePaths = [
        join(moduleDir, "..", "categorization", "config", "default_categories.json"),
        join(moduleDir, "config", "default_categories.json"),
        join(
            process.cwd(),
            "src/modules/expenses/infrastructure/categorization/config/default_categories.json",
        ),
    ];

    for (const p of candidatePaths) {
        if (existsSync(p)) {
            const raw = JSON.parse(readFileSync(p, "utf-8")) as {
                categories?: Record<
                    string,
                    { name?: string; icon?: string; color?: string; parent?: string | null }
                >;
            };
            const result: Record<
                string,
                { name: string; icon: string; color: string; parent: string | null }
            > = {};
            for (const [key, val] of Object.entries(raw.categories ?? {})) {
                result[key] = {
                    name:
                        val.name ??
                        key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                    icon: val.icon ?? "question-circle",
                    color: val.color ?? "#BDC3C7",
                    parent: val.parent ?? null,
                };
            }
            return result;
        }
    }

    throw new Error(`default_categories.json not found. Checked: ${candidatePaths.join(", ")}`);
}

const CATEGORY_META = loadCategoryMeta();

@Injectable()
export class TransactionRepositoryImpl implements TransactionRepository {
    constructor(@Inject(DB_TOKEN) private readonly db: DrizzleDb) {}

    async upsertMany(transactions: Transaction[]): Promise<void> {
        if (transactions.length === 0) {
            return;
        }

        for (const transaction of transactions) {
            const value = this.toInsert(transaction);

            await this.db
                .insert(transactionsTable)
                .values(value)
                .onConflictDoUpdate({
                    target: [transactionsTable.userId, transactionsTable.dedupeHash],
                    set: {
                        merchant: value.merchant,
                        merchantRaw: value.merchantRaw,
                        vpa: value.vpa ?? null,
                        amount: value.amount,
                        currency: value.currency,
                        transactionDate: value.transactionDate,
                        transactionType: value.transactionType,
                        transactionMode: value.transactionMode,
                        cardLast4: value.cardLast4 ?? null,
                        cardName: value.cardName ?? null,
                        category: value.category,
                        subcategory: value.subcategory,
                        confidence: value.confidence,
                        categorizationMethod: value.categorizationMethod,
                        requiresReview: value.requiresReview,
                        categoryMetadata: value.categoryMetadata,
                        statementId: value.statementId ?? null,
                        updatedAt: new Date(),
                    },
                });
        }
    }

    async listByUserMonth(params: {
        userId: string;
        year: number;
        month: number;
    }): Promise<Transaction[]> {
        const start = new Date(Date.UTC(params.year, params.month - 1, 1));
        const end = new Date(Date.UTC(params.year, params.month, 1));

        const records = await this.db
            .select()
            .from(transactionsTable)
            .where(
                and(
                    eq(transactionsTable.userId, params.userId),
                    gte(transactionsTable.transactionDate, start),
                    lt(transactionsTable.transactionDate, end),
                ),
            );

        return records.map((record) => this.toDomain(record));
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
            );

        return record ? this.toDomain(record) : null;
    }

    async updateById(params: {
        userId: string;
        id: string;
        data: UpdateTransactionInput;
    }): Promise<Transaction> {
        const setClause: Record<string, unknown> = { updatedAt: new Date() };

        if (params.data.merchant !== undefined) {
            setClause.merchant = params.data.merchant;
        }
        if (params.data.category !== undefined) {
            setClause.category = params.data.category;
        }
        if (params.data.subcategory !== undefined) {
            setClause.subcategory = params.data.subcategory;
        }
        if (params.data.transactionType !== undefined) {
            setClause.transactionType = params.data.transactionType;
        }
        if (params.data.transactionMode !== undefined) {
            setClause.transactionMode = params.data.transactionMode;
        }
        if (params.data.amount !== undefined) {
            setClause.amount = params.data.amount.toString();
        }
        if (params.data.currency !== undefined) {
            setClause.currency = params.data.currency;
        }
        if (params.data.requiresReview !== undefined) {
            setClause.requiresReview = params.data.requiresReview;
        }

        // Mark as manually categorized
        setClause.categorizationMethod = "manual";
        setClause.confidence = "1";

        const [updated] = await this.db
            .update(transactionsTable)
            .set(setClause)
            .where(
                and(
                    eq(transactionsTable.id, params.id),
                    eq(transactionsTable.userId, params.userId),
                ),
            )
            .returning();

        if (!updated) {
            throw new NotFoundException("Transaction not found");
        }

        return this.toDomain(updated);
    }

    async listByUser(params: {
        userId: string;
        limit: number;
        offset: number;
    }): Promise<Transaction[]> {
        const records = await this.db
            .select()
            .from(transactionsTable)
            .where(eq(transactionsTable.userId, params.userId))
            .orderBy(desc(transactionsTable.transactionDate))
            .limit(params.limit)
            .offset(params.offset);

        return records.map((record) => this.toDomain(record));
    }

    async countByUser(userId: string): Promise<number> {
        const result = await this.db
            .select({ count: sql<number>`count(*)::int` })
            .from(transactionsTable)
            .where(eq(transactionsTable.userId, userId));

        return result[0]?.count ?? 0;
    }

    // ── Analytics ──

    async getSpendingSummary(params: {
        userId: string;
        range: DateRange;
    }): Promise<SpendingSummary> {
        const where = and(
            eq(transactionsTable.userId, params.userId),
            gte(transactionsTable.transactionDate, params.range.start),
            lt(transactionsTable.transactionDate, params.range.end),
        );

        const [row] = await this.db
            .select({
                totalSpent: sql<string>`coalesce(sum(case when ${transactionsTable.transactionType} = 'debited' then ${transactionsTable.amount}::numeric else 0 end), 0)`,
                totalReceived: sql<string>`coalesce(sum(case when ${transactionsTable.transactionType} = 'credited' then ${transactionsTable.amount}::numeric else 0 end), 0)`,
                transactionCount: sql<number>`count(*)::int`,
                reviewPending: sql<number>`count(*) filter (where ${transactionsTable.requiresReview} = true)::int`,
                topCategory: sql<string>`(
                    select ${transactionsTable.category}
                    from ${transactionsTable}
                    where ${where} and ${transactionsTable.transactionType} = 'debited'
                    group by ${transactionsTable.category}
                    order by sum(${transactionsTable.amount}::numeric) desc
                    limit 1
                )`,
                topMerchant: sql<string>`(
                    select ${transactionsTable.merchant}
                    from ${transactionsTable}
                    where ${where} and ${transactionsTable.transactionType} = 'debited'
                    group by ${transactionsTable.merchant}
                    order by sum(${transactionsTable.amount}::numeric) desc
                    limit 1
                )`,
            })
            .from(transactionsTable)
            .where(where);

        const totalSpent = Number(row?.totalSpent ?? 0);
        const totalReceived = Number(row?.totalReceived ?? 0);
        const transactionCount = row?.transactionCount ?? 0;

        return {
            totalSpent,
            totalReceived,
            netFlow: totalReceived - totalSpent,
            transactionCount,
            avgTransaction: transactionCount > 0 ? totalSpent / transactionCount : 0,
            reviewPending: row?.reviewPending ?? 0,
            topCategory: row?.topCategory ?? "uncategorized",
            topMerchant: row?.topMerchant ?? "-",
        };
    }

    async getSpendingByCategory(params: {
        userId: string;
        range: DateRange;
    }): Promise<SpendingByCategoryItem[]> {
        const rows = await this.db
            .select({
                category: transactionsTable.category,
                amount: sql<string>`sum(${transactionsTable.amount}::numeric)`,
                count: sql<number>`count(*)::int`,
            })
            .from(transactionsTable)
            .where(
                and(
                    eq(transactionsTable.userId, params.userId),
                    gte(transactionsTable.transactionDate, params.range.start),
                    lt(transactionsTable.transactionDate, params.range.end),
                    eq(transactionsTable.transactionType, "debited"),
                ),
            )
            .groupBy(transactionsTable.category)
            .orderBy(sql`sum(${transactionsTable.amount}::numeric) desc`);

        return rows.map((r) => {
            const meta = CATEGORY_META[r.category];
            return {
                category: r.category,
                displayName: meta?.name ?? r.category,
                amount: Number(r.amount),
                count: r.count,
                color: meta?.color ?? "#94A3B8",
                icon: meta?.icon ?? "question-circle",
                parent: meta?.parent ?? null,
            };
        });
    }

    async getSpendingByMode(params: {
        userId: string;
        range: DateRange;
    }): Promise<SpendingByModeItem[]> {
        const rows = await this.db
            .select({
                mode: transactionsTable.transactionMode,
                amount: sql<string>`sum(${transactionsTable.amount}::numeric)`,
                count: sql<number>`count(*)::int`,
            })
            .from(transactionsTable)
            .where(
                and(
                    eq(transactionsTable.userId, params.userId),
                    gte(transactionsTable.transactionDate, params.range.start),
                    lt(transactionsTable.transactionDate, params.range.end),
                    eq(transactionsTable.transactionType, "debited"),
                ),
            )
            .groupBy(transactionsTable.transactionMode)
            .orderBy(sql`sum(${transactionsTable.amount}::numeric) desc`);

        return rows.map((r) => ({
            mode: r.mode,
            amount: Number(r.amount),
            count: r.count,
        }));
    }

    async getTopMerchants(params: {
        userId: string;
        range: DateRange;
        limit: number;
    }): Promise<SpendingByMerchantItem[]> {
        const rows = await this.db
            .select({
                merchant: transactionsTable.merchant,
                amount: sql<string>`sum(${transactionsTable.amount}::numeric)`,
                count: sql<number>`count(*)::int`,
            })
            .from(transactionsTable)
            .where(
                and(
                    eq(transactionsTable.userId, params.userId),
                    gte(transactionsTable.transactionDate, params.range.start),
                    lt(transactionsTable.transactionDate, params.range.end),
                    eq(transactionsTable.transactionType, "debited"),
                ),
            )
            .groupBy(transactionsTable.merchant)
            .orderBy(sql`sum(${transactionsTable.amount}::numeric) desc`)
            .limit(params.limit);

        return rows.map((r) => ({
            merchant: r.merchant,
            amount: Number(r.amount),
            count: r.count,
        }));
    }

    async getDailySpending(params: {
        userId: string;
        range: DateRange;
    }): Promise<DailySpendingItem[]> {
        const rows = await this.db
            .select({
                date: sql<string>`to_char(${transactionsTable.transactionDate}, 'YYYY-MM-DD')`,
                debited: sql<string>`coalesce(sum(case when ${transactionsTable.transactionType} = 'debited' then ${transactionsTable.amount}::numeric else 0 end), 0)`,
                credited: sql<string>`coalesce(sum(case when ${transactionsTable.transactionType} = 'credited' then ${transactionsTable.amount}::numeric else 0 end), 0)`,
            })
            .from(transactionsTable)
            .where(
                and(
                    eq(transactionsTable.userId, params.userId),
                    gte(transactionsTable.transactionDate, params.range.start),
                    lt(transactionsTable.transactionDate, params.range.end),
                ),
            )
            .groupBy(sql`to_char(${transactionsTable.transactionDate}, 'YYYY-MM-DD')`)
            .orderBy(sql`to_char(${transactionsTable.transactionDate}, 'YYYY-MM-DD') asc`);

        return rows.map((r) => ({
            date: r.date,
            debited: Number(r.debited),
            credited: Number(r.credited),
        }));
    }

    async getMonthlyTrend(params: { userId: string; months: number }): Promise<MonthlyTrendItem[]> {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - params.months);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);

        const rows = await this.db
            .select({
                month: sql<string>`to_char(${transactionsTable.transactionDate}, 'YYYY-MM')`,
                debited: sql<string>`coalesce(sum(case when ${transactionsTable.transactionType} = 'debited' then ${transactionsTable.amount}::numeric else 0 end), 0)`,
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
            .orderBy(sql`to_char(${transactionsTable.transactionDate}, 'YYYY-MM') asc`);

        return rows.map((r) => {
            const debited = Number(r.debited);
            const credited = Number(r.credited);
            return {
                month: r.month,
                debited,
                credited,
                net: credited - debited,
            };
        });
    }

    async getSpendingByCard(params: {
        userId: string;
        range: DateRange;
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
                and(
                    eq(transactionsTable.userId, params.userId),
                    gte(transactionsTable.transactionDate, params.range.start),
                    lt(transactionsTable.transactionDate, params.range.end),
                    eq(transactionsTable.transactionType, "debited"),
                    eq(transactionsTable.transactionMode, "credit_card"),
                    sql`${transactionsTable.cardLast4} is not null`,
                ),
            )
            .groupBy(transactionsTable.cardLast4, transactionsTable.cardName)
            .orderBy(sql`sum(${transactionsTable.amount}::numeric) desc`);

        return rows.map((r) => ({
            cardLast4: r.cardLast4 ?? "",
            cardName: r.cardName ?? `Card ••${r.cardLast4}`,
            bank: "",
            icon: "credit-card",
            amount: Number(r.amount),
            count: r.count,
        }));
    }

    async getCardSpendForRange(params: {
        userId: string;
        cardLast4: string;
        range: DateRange;
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
                    eq(transactionsTable.transactionType, "debited"),
                    eq(transactionsTable.transactionMode, "credit_card"),
                ),
            );

        return Number(row?.total ?? 0);
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
            .orderBy(sql`count(*) desc`);

        // Aggregate: same merchant may have multiple categories — pick the most common one
        const merchantMap = new Map<
            string,
            { merchant: string; category: string; subcategory: string; transactionCount: number }
        >();

        for (const row of rows) {
            const existing = merchantMap.get(row.merchant);
            if (!existing || row.transactionCount > existing.transactionCount) {
                merchantMap.set(row.merchant, {
                    merchant: row.merchant,
                    category: row.category,
                    subcategory: row.subcategory,
                    transactionCount: existing
                        ? existing.transactionCount + row.transactionCount
                        : row.transactionCount,
                });
            } else {
                existing.transactionCount += row.transactionCount;
            }
        }

        return Array.from(merchantMap.values()).sort(
            (a, b) => b.transactionCount - a.transactionCount,
        );
    }

    async bulkCategorizeByMerchant(params: {
        userId: string;
        merchant: string;
        category: string;
        subcategory: string;
        categoryMetadata?: { icon: string; color: string; parent: string | null };
    }): Promise<number> {
        const setClause: Record<string, unknown> = {
            category: params.category,
            subcategory: params.subcategory,
            categorizationMethod: "merchant_rule",
            confidence: "1.0000",
            requiresReview: false,
            updatedAt: new Date(),
        };

        if (params.categoryMetadata) {
            setClause.categoryMetadata = params.categoryMetadata;
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
            .returning({ id: transactionsTable.id });

        return result.length;
    }

    private toInsert(transaction: Transaction): InsertTransaction {
        return {
            id: transaction.id,
            userId: transaction.userId,
            dedupeHash: transaction.dedupeHash,
            merchant: transaction.merchant,
            merchantRaw: transaction.merchantRaw,
            vpa: transaction.vpa,
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
            statementId: transaction.statementId,
            sourceEmailId: transaction.sourceEmailId,
        };
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
            transactionType: record.transactionType as Transaction["transactionType"],
            transactionMode: record.transactionMode as Transaction["transactionMode"],
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
        };
    }
}
