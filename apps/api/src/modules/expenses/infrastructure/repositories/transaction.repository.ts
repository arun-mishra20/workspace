import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, lt } from "drizzle-orm";

import {
    transactionsTable,
    type InsertTransaction,
    type TransactionRecord,
} from "@workspace/database";

import { DB_TOKEN, type DrizzleDb } from "@/shared/infrastructure/db/db.port";
import type { TransactionRepository } from "@/modules/expenses/application/ports/transaction.repository.port";
import type { Transaction } from "@workspace/domain";

@Injectable()
export class TransactionRepositoryImpl implements TransactionRepository {
    constructor(@Inject(DB_TOKEN) private readonly db: DrizzleDb) {}

    async upsertMany(transactions: Transaction[]): Promise<void> {
        if (transactions.length === 0) {
            return;
        }

        const values = transactions.map((transaction) => this.toInsert(transaction));

        await this.db
            .insert(transactionsTable)
            .values(values)
            .onConflictDoNothing({ target: transactionsTable.id });
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

    private toInsert(transaction: Transaction): InsertTransaction {
        return {
            id: transaction.id,
            userId: transaction.userId,
            merchant: transaction.merchant,
            amount: transaction.amount.toString(),
            currency: transaction.currency,
            transactionDate: new Date(transaction.transactionDate),
            category: transaction.category,
            statementId: transaction.statementId,
            sourceEmailId: transaction.sourceEmailId,
        };
    }

    private toDomain(record: TransactionRecord): Transaction {
        return {
            id: record.id,
            userId: record.userId,
            merchant: record.merchant,
            amount: Number(record.amount),
            currency: record.currency,
            transactionDate: record.transactionDate.toISOString(),
            category: record.category ?? undefined,
            statementId: record.statementId ?? undefined,
            sourceEmailId: record.sourceEmailId,
        };
    }
}
