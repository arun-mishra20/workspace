import type { SpendExclusionRule } from '@/modules/expenses/application/utils/analytics-exclusions'
import type {
    Transaction,
    UpdateTransactionInput,
    SpendingSummary,
    SpendingByCategoryItem,
    SpendingBySubcategoryItem,
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
    ClassificationHealth,
    SpendAnomalies,
    BusAnalytics,
    InvestmentAnalytics,
    RuleConditionGroup,
} from '@workspace/domain'

export interface DateRange {
    start: Date
    end: Date
}

export interface AnalyticsQueryParams {
    userId: string
    range: DateRange
    cardLast4?: string
    excludeSpendRules?: SpendExclusionRule[]
}

export interface TransactionFilters {
    category?: string
    subcategory?: string
    mode?: string
    categorizationMethod?: string
    requiresReview?: boolean
    /** Filter by paid-for-someone annotation: any / pending / settled */
    paidForSomeone?: 'true' | 'pending' | 'settled'
    dateFrom?: Date
    dateTo?: Date
    search?: string
    cardLast4?: string
    sortBy?: TransactionSortField
    sortOrder?: SortOrder
}

export const TRANSACTION_SORT_FIELDS = [
    'transactionDate',
    'merchant',
    'amount',
    'category',
    'subcategory',
    'transactionMode',
    'categorizationMethod',
    'confidence',
    'requiresReview',
] as const

export type TransactionSortField = (typeof TRANSACTION_SORT_FIELDS)[number]
export type SortOrder = 'asc' | 'desc'

/**
 * Transaction Repository interface
 */
export interface TransactionRepository {
    upsertMany(transactions: Transaction[]): Promise<void>
    findById(params: { userId: string; id: string }): Promise<Transaction | null>
    findByIds(params: { userId: string; ids: string[] }): Promise<Transaction[]>
    updateById(params: {
        userId: string
        id: string
        data: UpdateTransactionInput & {
            transactionAttributes?: Transaction['transactionAttributes'] | null
        }
    }): Promise<Transaction>
    listByUser(params: {
        userId: string
        limit: number
        offset: number
        filters?: TransactionFilters
    }): Promise<Transaction[]>
    countByUser(userId: string, filters?: TransactionFilters): Promise<number>
    listByUserCursor(params: {
        userId: string
        pageSize: number
        cursor?: string
        filters?: TransactionFilters
    }): Promise<{ data: Transaction[]; nextCursor?: string; hasMore: boolean }>
    listByUserMonth(params: { userId: string; year: number; month: number }): Promise<Transaction[]>

    // ── Analytics ──
    getSpendingSummary(params: AnalyticsQueryParams): Promise<SpendingSummary>
    getSpendingByCategory(params: AnalyticsQueryParams): Promise<SpendingByCategoryItem[]>
    getSpendingBySubcategory(params: AnalyticsQueryParams): Promise<SpendingBySubcategoryItem[]>
    getSpendingByMode(params: AnalyticsQueryParams): Promise<SpendingByModeItem[]>
    getTopMerchants(
        params: AnalyticsQueryParams & { limit: number },
    ): Promise<SpendingByMerchantItem[]>
    getDailySpending(params: AnalyticsQueryParams): Promise<DailySpendingItem[]>
    getMonthlyTrend(params: {
        userId: string
        months: number
        excludeSpendRules?: SpendExclusionRule[]
    }): Promise<MonthlyTrendItem[]>
    getSpendingByCard(params: {
        userId: string
        range: DateRange
        cardLast4?: string
    }): Promise<SpendingByCardItem[]>
    getCardSpendForRange(params: {
        userId: string
        cardLast4: string
        range: DateRange
    }): Promise<number>
    getCardSpendsForRanges(params: {
        userId: string
        cards: string[]
        range: DateRange
    }): Promise<{ cardLast4: string; transactionDate: Date; amount: number }[]>

    // ── Extended Analytics ──
    getDayOfWeekSpending(params: AnalyticsQueryParams): Promise<DayOfWeekSpendingItem[]>
    getCategoryTrend(params: {
        userId: string
        months: number
        excludeSpendRules?: SpendExclusionRule[]
    }): Promise<CategoryTrendItem[]>
    getPeriodTotals(params: AnalyticsQueryParams): Promise<{
        totalSpent: number
        totalReceived: number
        transactionCount: number
    }>
    getCumulativeSpend(params: AnalyticsQueryParams): Promise<CumulativeSpendItem[]>
    getSavingsRate(params: {
        userId: string
        months: number
        excludeSpendRules?: SpendExclusionRule[]
    }): Promise<SavingsRateItem[]>
    getCardCategoryBreakdown(params: {
        userId: string
        range: DateRange
        cardLast4?: string
    }): Promise<CardCategoryItem[]>
    getTopVpas(params: AnalyticsQueryParams & { limit: number }): Promise<TopVpaItem[]>
    getSpendingVelocity(params: AnalyticsQueryParams): Promise<SpendingVelocityItem[]>
    getLargestTransactions(
        params: AnalyticsQueryParams & { limit: number },
    ): Promise<LargestTransactionItem[]>
    getClassificationHealth(params: {
        userId: string
        range: DateRange
        cardLast4?: string
    }): Promise<ClassificationHealth>
    getSpendAnomalies(params: AnalyticsQueryParams): Promise<SpendAnomalies>

    // ── Pattern Analytics ──
    getBusAnalytics(params: { userId: string; range: DateRange }): Promise<BusAnalytics>
    getInvestmentAnalytics(params: {
        userId: string
        range: DateRange
    }): Promise<InvestmentAnalytics>

    // ── Merchant bulk categorization ──

    /**
     * Get distinct merchants for a user with their current category info
     */
    getDistinctMerchants(userId: string): Promise<
        {
            merchant: string
            category: string
            subcategory: string
            transactionCount: number
        }[]
    >

    /**
     * Get already-categorized merchants (category != 'uncategorized') with
     * their most common category. Used during sync to auto-assign categories
     * to new transactions for known merchants.
     */
    getCategorizedMerchants(
        userId: string,
    ): Promise<{ merchant: string; category: string; subcategory: string }[]>

    /**
     * Bulk update category/subcategory for all transactions matching a merchant
     */
    bulkCategorizeByMerchant(params: {
        userId: string
        merchant: string
        category: string
        subcategory: string
        categoryMetadata?: { icon: string; color: string; parent: string | null }
    }): Promise<number>

    /**
     * Bulk update fields on multiple transactions by ID
     */
    bulkUpdateByIds(params: {
        userId: string
        ids: string[]
        data: {
            category?: string
            subcategory?: string
            transactionMode?: string
            requiresReview?: boolean
            paidForSomeone?: boolean
        }
    }): Promise<number>

    bulkApplyRuleByIds(params: {
        userId: string
        ids: string[]
        category: string
        subcategory: string
        categoryMetadata?: { icon: string; color: string; parent: string | null }
        requiresReview?: boolean
        transactionAttributes?: Transaction['transactionAttributes']
    }): Promise<number>

    listAllForUser(userId: string): Promise<Transaction[]>

    listByUserInDateRange(params: {
        userId: string
        range: DateRange
        cardLast4?: string
        limit?: number
    }): Promise<Transaction[]>

    listByUserInDateRangeMatchingRules(params: {
        userId: string
        range: DateRange
        cardLast4?: string
        limit?: number
        rules: { conditions: RuleConditionGroup }[]
    }): Promise<Transaction[] | null>

    updateTransactionAttributesBatch(params: {
        userId: string
        updates: { id: string; transactionAttributes: Transaction['transactionAttributes'] }[]
    }): Promise<void>
}

export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY')
