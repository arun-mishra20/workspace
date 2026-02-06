import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";

import {
    transactionsTable,
    type InsertTransaction,
    type TransactionRecord,
} from "@workspace/database";

import { DB_TOKEN, type DrizzleDb } from "@/shared/infrastructure/db/db.port";
import type { TransactionRepository } from "@/modules/expenses/application/ports/transaction.repository.port";
import type { Transaction, UpdateTransactionInput } from "@workspace/domain";

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
        };
    }
}
