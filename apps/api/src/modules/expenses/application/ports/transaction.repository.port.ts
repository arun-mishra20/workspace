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
} from '@workspace/domain'

export interface DateRange {
  start: Date
  end: Date
}

export interface TransactionFilters {
  category?: string
  subcategory?: string
  mode?: string
  categorizationMethod?: string
  requiresReview?: boolean
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
  findById(params: { userId: string, id: string }): Promise<Transaction | null>
  findByIds(params: { userId: string, ids: string[] }): Promise<Transaction[]>
  updateById(params: {
    userId: string
    id: string
    data: UpdateTransactionInput
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
  }): Promise<{ data: Transaction[], nextCursor?: string, hasMore: boolean }>
  listByUserMonth(params: {
    userId: string
    year: number
    month: number
  }): Promise<Transaction[]>

  // ── Analytics ──
  getSpendingSummary(params: {
    userId: string
    range: DateRange
    cardLast4?: string
  }): Promise<SpendingSummary>
  getSpendingByCategory(params: {
    userId: string
    range: DateRange
    cardLast4?: string
  }): Promise<SpendingByCategoryItem[]>
  getSpendingBySubcategory(params: {
    userId: string
    range: DateRange
    cardLast4?: string
  }): Promise<SpendingBySubcategoryItem[]>
  getSpendingByMode(params: {
    userId: string
    range: DateRange
    cardLast4?: string
  }): Promise<SpendingByModeItem[]>
  getTopMerchants(params: {
    userId: string
    range: DateRange
    limit: number
    cardLast4?: string
  }): Promise<SpendingByMerchantItem[]>
  getDailySpending(params: {
    userId: string
    range: DateRange
    cardLast4?: string
  }): Promise<DailySpendingItem[]>
  getMonthlyTrend(params: { userId: string, months: number }): Promise<MonthlyTrendItem[]>
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
  }): Promise<{ cardLast4: string, transactionDate: Date, amount: number }[]>

  // ── Extended Analytics ──
  getDayOfWeekSpending(params: {
    userId: string
    range: DateRange
    cardLast4?: string
  }): Promise<DayOfWeekSpendingItem[]>
  getCategoryTrend(params: { userId: string, months: number }): Promise<CategoryTrendItem[]>
  getPeriodTotals(params: {
    userId: string
    range: DateRange
    cardLast4?: string
  }): Promise<{ totalSpent: number, totalReceived: number, transactionCount: number }>
  getCumulativeSpend(params: {
    userId: string
    range: DateRange
    cardLast4?: string
  }): Promise<CumulativeSpendItem[]>
  getSavingsRate(params: { userId: string, months: number }): Promise<SavingsRateItem[]>
  getCardCategoryBreakdown(params: {
    userId: string
    range: DateRange
    cardLast4?: string
  }): Promise<CardCategoryItem[]>
  getTopVpas(params: {
    userId: string
    range: DateRange
    limit: number
    cardLast4?: string
  }): Promise<TopVpaItem[]>
  getSpendingVelocity(params: {
    userId: string
    range: DateRange
    cardLast4?: string
  }): Promise<SpendingVelocityItem[]>
  getLargestTransactions(params: {
    userId: string
    range: DateRange
    limit: number
    cardLast4?: string
  }): Promise<LargestTransactionItem[]>
  getClassificationHealth(params: {
    userId: string
    range: DateRange
    cardLast4?: string
  }): Promise<ClassificationHealth>
  getSpendAnomalies(params: {
    userId: string
    range: DateRange
    cardLast4?: string
  }): Promise<SpendAnomalies>

  // ── Pattern Analytics ──
  getBusAnalytics(params: { userId: string, range: DateRange }): Promise<BusAnalytics>
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
  getCategorizedMerchants(userId: string): Promise<
    { merchant: string, category: string, subcategory: string }[]
  >

  /**
     * Bulk update category/subcategory for all transactions matching a merchant
     */
  bulkCategorizeByMerchant(params: {
    userId: string
    merchant: string
    category: string
    subcategory: string
    categoryMetadata?: { icon: string, color: string, parent: string | null }
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
    }
  }): Promise<number>

  bulkApplyRuleByIds(params: {
    userId: string
    ids: string[]
    category: string
    subcategory: string
    categoryMetadata?: { icon: string, color: string, parent: string | null }
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

  updateTransactionAttributesBatch(params: {
    userId: string
    updates: { id: string, transactionAttributes: Transaction['transactionAttributes'] }[]
  }): Promise<void>
}

export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY')
