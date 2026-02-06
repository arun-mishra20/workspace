import type { Transaction } from "@workspace/domain";

/**
 * Transaction Repository interface
 */
export interface TransactionRepository {
  upsertMany(transactions: Transaction[]): Promise<void>;
  listByUser(params: {
    userId: string;
    limit: number;
    offset: number;
  }): Promise<Transaction[]>;
  countByUser(userId: string): Promise<number>;
  listByUserMonth(params: {
    userId: string;
    year: number;
    month: number;
  }): Promise<Transaction[]>;
}

export const TRANSACTION_REPOSITORY = Symbol("TRANSACTION_REPOSITORY");
