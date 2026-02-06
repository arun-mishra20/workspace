import type { Transaction, UpdateTransactionInput } from "@workspace/domain";

/**
 * Transaction Repository interface
 */
export interface TransactionRepository {
    upsertMany(transactions: Transaction[]): Promise<void>;
    findById(params: { userId: string; id: string }): Promise<Transaction | null>;
    updateById(params: {
        userId: string;
        id: string;
        data: UpdateTransactionInput;
    }): Promise<Transaction>;
    listByUser(params: { userId: string; limit: number; offset: number }): Promise<Transaction[]>;
    countByUser(userId: string): Promise<number>;
    listByUserMonth(params: {
        userId: string;
        year: number;
        month: number;
    }): Promise<Transaction[]>;
}

export const TRANSACTION_REPOSITORY = Symbol("TRANSACTION_REPOSITORY");
