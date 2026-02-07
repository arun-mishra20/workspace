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

export interface DateRange {
    start: Date;
    end: Date;
}

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

    // ── Analytics ──
    getSpendingSummary(params: { userId: string; range: DateRange }): Promise<SpendingSummary>;
    getSpendingByCategory(params: {
        userId: string;
        range: DateRange;
    }): Promise<SpendingByCategoryItem[]>;
    getSpendingByMode(params: { userId: string; range: DateRange }): Promise<SpendingByModeItem[]>;
    getTopMerchants(params: {
        userId: string;
        range: DateRange;
        limit: number;
    }): Promise<SpendingByMerchantItem[]>;
    getDailySpending(params: { userId: string; range: DateRange }): Promise<DailySpendingItem[]>;
    getMonthlyTrend(params: { userId: string; months: number }): Promise<MonthlyTrendItem[]>;
    getSpendingByCard(params: { userId: string; range: DateRange }): Promise<SpendingByCardItem[]>;
    getCardSpendForRange(params: {
        userId: string;
        cardLast4: string;
        range: DateRange;
    }): Promise<number>;

    // ── Merchant bulk categorization ──

    /**
     * Get distinct merchants for a user with their current category info
     */
    getDistinctMerchants(
        userId: string,
    ): Promise<
        {
            merchant: string;
            category: string;
            subcategory: string;
            transactionCount: number;
        }[]
    >;

    /**
     * Bulk update category/subcategory for all transactions matching a merchant
     */
    bulkCategorizeByMerchant(params: {
        userId: string;
        merchant: string;
        category: string;
        subcategory: string;
        categoryMetadata?: { icon: string; color: string; parent: string | null };
    }): Promise<number>;
}

export const TRANSACTION_REPOSITORY = Symbol("TRANSACTION_REPOSITORY");
