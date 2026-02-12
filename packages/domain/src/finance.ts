import { z, type ZodType } from "zod";

export const TransactionTypeSchema = z.enum(["debited", "credited"]);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

export const TransactionModeSchema = z.enum([
  "upi",
  "credit_card",
  "neft",
  "imps",
  "rtgs",
]);
export type TransactionMode = z.infer<typeof TransactionModeSchema>;

export const CategoryMetadataSchema = z.object({
  icon: z.string(),
  color: z.string(),
  parent: z.string().nullable(),
});
export type CategoryMetadata = z.infer<typeof CategoryMetadataSchema>;

export const TransactionSchema: ZodType<Transaction> = z.object({
  id: z.string(),
  userId: z.string(),
  dedupeHash: z.string(),
  sourceEmailId: z.string(),
  merchant: z.string(),
  merchantRaw: z.string(),
  vpa: z.string().optional(),
  amount: z.number(),
  currency: z.string(),
  transactionDate: z.string(),
  transactionType: TransactionTypeSchema,
  transactionMode: TransactionModeSchema,
  category: z.string(),
  subcategory: z.string(),
  confidence: z.number(),
  categorizationMethod: z.string(),
  requiresReview: z.boolean(),
  categoryMetadata: CategoryMetadataSchema,
  statementId: z.string().optional(),
  cardLast4: z.string().optional(),
  cardName: z.string().optional(),
});

export const StatementSchema: ZodType<Statement> = z.object({
  id: z.string(),
  userId: z.string(),
  issuer: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  totalDue: z.number(),
  sourceEmailId: z.string(),
});

export interface Transaction {
  id: string;
  userId: string;
  dedupeHash: string;
  sourceEmailId: string;
  merchant: string;
  merchantRaw: string;
  vpa?: string;
  amount: number;
  currency: string;
  transactionDate: string;
  transactionType: TransactionType;
  transactionMode: TransactionMode;
  category: string;
  subcategory: string;
  confidence: number;
  categorizationMethod: string;
  requiresReview: boolean;
  categoryMetadata: CategoryMetadata;
  statementId?: string;
  cardLast4?: string;
  cardName?: string;
}

export interface Statement {
  id: string;
  userId: string;
  issuer: string;
  periodStart: string;
  periodEnd: string;
  totalDue: number;
  sourceEmailId: string;
}

/**
 * Fields that the user can manually correct on a transaction.
 */
export const UpdateTransactionSchema = z.object({
  merchant: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  subcategory: z.string().min(1).optional(),
  transactionType: TransactionTypeSchema.optional(),
  transactionMode: TransactionModeSchema.optional(),
  amount: z.number().positive().optional(),
  currency: z.string().min(1).optional(),
  requiresReview: z.boolean().optional(),
});

export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;

export const SyncExpensesResultSchema: ZodType<SyncExpensesResult> = z.object({
  syncedEmails: z.number(),
  transactions: z.number(),
  statements: z.number(),
});

export interface SyncExpensesResult {
  syncedEmails: number;
  transactions: number;
  statements: number;
}

// Sync Job schemas for async processing
export const SyncJobStatusEnum: ZodType<SyncJobStatus> = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);

export type SyncJobStatus = "pending" | "processing" | "completed" | "failed";

export const SyncJobSchema: ZodType<SyncJob> = z.object({
  id: z.string(),
  userId: z.string(),
  status: SyncJobStatusEnum,
  query: z.string().nullable(),
  totalEmails: z.number().nullable(),
  processedEmails: z.number(),
  newEmails: z.number(),
  transactions: z.number(),
  statements: z.number(),
  errorMessage: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export interface SyncJob {
  id: string;
  userId: string;
  status: SyncJobStatus;
  query: string | null;
  totalEmails: number | null;
  processedEmails: number;
  newEmails: number;
  transactions: number;
  statements: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const StartSyncJobResponseSchema: ZodType<StartSyncJobResponse> =
  z.object({
    jobId: z.string(),
    message: z.string(),
  });

export interface StartSyncJobResponse {
  jobId: string;
  message: string;
}

// ── Analytics Types ──

export const AnalyticsPeriodSchema = z.enum([
  "week",
  "month",
  "quarter",
  "year",
]);
export type AnalyticsPeriod = z.infer<typeof AnalyticsPeriodSchema>;

export const SpendingSummarySchema = z.object({
  totalSpent: z.number(),
  totalReceived: z.number(),
  netFlow: z.number(),
  transactionCount: z.number(),
  avgTransaction: z.number(),
  reviewPending: z.number(),
  topCategory: z.string(),
  topMerchant: z.string(),
});
export type SpendingSummary = z.infer<typeof SpendingSummarySchema>;

export const SpendingByCategoryItemSchema = z.object({
  category: z.string(),
  displayName: z.string(),
  amount: z.number(),
  count: z.number(),
  color: z.string(),
  icon: z.string(),
  parent: z.string().nullable(),
});
export type SpendingByCategoryItem = z.infer<
  typeof SpendingByCategoryItemSchema
>;

export const SpendingByModeItemSchema = z.object({
  mode: z.string(),
  amount: z.number(),
  count: z.number(),
});
export type SpendingByModeItem = z.infer<typeof SpendingByModeItemSchema>;

export const SpendingByMerchantItemSchema = z.object({
  merchant: z.string(),
  amount: z.number(),
  count: z.number(),
});
export type SpendingByMerchantItem = z.infer<
  typeof SpendingByMerchantItemSchema
>;

export const DailySpendingItemSchema = z.object({
  date: z.string(),
  debited: z.number(),
  credited: z.number(),
});
export type DailySpendingItem = z.infer<typeof DailySpendingItemSchema>;

export const MonthlyTrendItemSchema = z.object({
  month: z.string(),
  debited: z.number(),
  credited: z.number(),
  net: z.number(),
});
export type MonthlyTrendItem = z.infer<typeof MonthlyTrendItemSchema>;

export const MilestoneProgressSchema = z.object({
  id: z.string(),
  type: z.enum(["spend", "fee waiver"]),
  description: z.string(),
  targetAmount: z.number(),
  currentSpend: z.number(),
  percentage: z.number(),
  remaining: z.number(),
  periodLabel: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
});
export type MilestoneProgress = z.infer<typeof MilestoneProgressSchema>;

export const SpendingByCardItemSchema = z.object({
  cardLast4: z.string(),
  cardName: z.string(),
  bank: z.string(),
  icon: z.string(),
  amount: z.number(),
  count: z.number(),
  milestones: z.array(MilestoneProgressSchema).optional(),
});
export type SpendingByCardItem = z.infer<typeof SpendingByCardItemSchema>;

// ── Extended Analytics Types ──

export const DayOfWeekSpendingItemSchema = z.object({
  day: z.number(), // 0=Sun, 1=Mon, ..., 6=Sat
  dayName: z.string(),
  amount: z.number(),
  count: z.number(),
});
export type DayOfWeekSpendingItem = z.infer<typeof DayOfWeekSpendingItemSchema>;

export const CategoryTrendItemSchema = z.object({
  month: z.string(),
  category: z.string(),
  displayName: z.string(),
  amount: z.number(),
  count: z.number(),
});
export type CategoryTrendItem = z.infer<typeof CategoryTrendItemSchema>;

export const PeriodComparisonSchema = z.object({
  currentPeriod: z.object({
    totalSpent: z.number(),
    totalReceived: z.number(),
    transactionCount: z.number(),
    avgTransaction: z.number(),
  }),
  previousPeriod: z.object({
    totalSpent: z.number(),
    totalReceived: z.number(),
    transactionCount: z.number(),
    avgTransaction: z.number(),
  }),
  changes: z.object({
    spentChange: z.number(),
    receivedChange: z.number(),
    countChange: z.number(),
    avgChange: z.number(),
  }),
});
export type PeriodComparison = z.infer<typeof PeriodComparisonSchema>;

export const CumulativeSpendItemSchema = z.object({
  date: z.string(),
  cumulative: z.number(),
  daily: z.number(),
});
export type CumulativeSpendItem = z.infer<typeof CumulativeSpendItemSchema>;

export const SavingsRateItemSchema = z.object({
  month: z.string(),
  income: z.number(),
  expenses: z.number(),
  savings: z.number(),
  savingsRate: z.number(), // percentage
});
export type SavingsRateItem = z.infer<typeof SavingsRateItemSchema>;

export const CardCategoryItemSchema = z.object({
  cardLast4: z.string(),
  cardName: z.string(),
  category: z.string(),
  displayName: z.string(),
  amount: z.number(),
  count: z.number(),
});
export type CardCategoryItem = z.infer<typeof CardCategoryItemSchema>;

export const TopVpaItemSchema = z.object({
  vpa: z.string(),
  merchant: z.string(),
  amount: z.number(),
  count: z.number(),
});
export type TopVpaItem = z.infer<typeof TopVpaItemSchema>;

export const SpendingVelocityItemSchema = z.object({
  date: z.string(),
  velocity: z.number(), // ₹/day rolling average
});
export type SpendingVelocityItem = z.infer<typeof SpendingVelocityItemSchema>;

export const MilestoneEtaSchema = z.object({
  id: z.string(),
  cardLast4: z.string(),
  cardName: z.string(),
  description: z.string(),
  targetAmount: z.number(),
  currentSpend: z.number(),
  percentage: z.number(),
  dailyRate: z.number(),
  daysRemaining: z.number().nullable(),
  estimatedCompletionDate: z.string().nullable(),
  periodEnd: z.string(),
  onTrack: z.boolean(),
});
export type MilestoneEta = z.infer<typeof MilestoneEtaSchema>;

export const LargestTransactionItemSchema = z.object({
  id: z.string(),
  merchant: z.string(),
  amount: z.number(),
  transactionDate: z.string(),
  category: z.string(),
  displayName: z.string(),
  transactionMode: z.string(),
});
export type LargestTransactionItem = z.infer<
  typeof LargestTransactionItemSchema
>;

// ── Patterns: Bus Analytics ──

export const BusRouteItemSchema = z.object({
  busNumber: z.string(),
  totalSpent: z.number(),
  tripCount: z.number(),
  avgFare: z.number(),
  lastTrip: z.string(),
  firstTrip: z.string(),
});
export type BusRouteItem = z.infer<typeof BusRouteItemSchema>;

export const BusDailyFrequencyItemSchema = z.object({
  date: z.string(),
  trips: z.number(),
  amount: z.number(),
});
export type BusDailyFrequencyItem = z.infer<typeof BusDailyFrequencyItemSchema>;

export const BusDayOfWeekItemSchema = z.object({
  day: z.number(),
  dayName: z.string(),
  trips: z.number(),
  amount: z.number(),
});
export type BusDayOfWeekItem = z.infer<typeof BusDayOfWeekItemSchema>;

export const BusMonthlyTrendItemSchema = z.object({
  month: z.string(),
  trips: z.number(),
  amount: z.number(),
});
export type BusMonthlyTrendItem = z.infer<typeof BusMonthlyTrendItemSchema>;

export const BusTimeOfDayItemSchema = z.object({
  hour: z.number(),
  trips: z.number(),
  amount: z.number(),
});
export type BusTimeOfDayItem = z.infer<typeof BusTimeOfDayItemSchema>;

export const BusAnalyticsSchema = z.object({
  totalSpent: z.number(),
  totalTrips: z.number(),
  avgFare: z.number(),
  uniqueBuses: z.number(),
  firstTrip: z.string().nullable(),
  lastTrip: z.string().nullable(),
  routes: z.array(BusRouteItemSchema),
  dailyFrequency: z.array(BusDailyFrequencyItemSchema),
  dayOfWeek: z.array(BusDayOfWeekItemSchema),
  monthlyTrend: z.array(BusMonthlyTrendItemSchema),
  timeOfDay: z.array(BusTimeOfDayItemSchema),
});
export type BusAnalytics = z.infer<typeof BusAnalyticsSchema>;

// ── Patterns: Investment Analytics ──

export const AssetTypeBreakdownSchema = z.object({
  assetType: z.enum(["stocks", "mutual_funds", "gold"]),
  totalInvested: z.number(),
  transactionCount: z.number(),
  avgAmount: z.number(),
  minAmount: z.number(),
  maxAmount: z.number(),
  firstInvestment: z.string().nullable(),
  lastInvestment: z.string().nullable(),
  percentageOfTotal: z.number(),
});
export type AssetTypeBreakdown = z.infer<typeof AssetTypeBreakdownSchema>;

export const PlatformBreakdownSchema = z.object({
  platform: z.string(),
  totalInvested: z.number(),
  transactionCount: z.number(),
  avgAmount: z.number(),
  primaryAssetType: z.string().nullable(),
});
export type PlatformBreakdown = z.infer<typeof PlatformBreakdownSchema>;

export const InvestmentMonthlyTrendSchema = z.object({
  month: z.string(),
  totalInvested: z.number(),
  transactionCount: z.number(),
  stocks: z.number(),
  mutualFunds: z.number(),
  gold: z.number(),
});
export type InvestmentMonthlyTrend = z.infer<
  typeof InvestmentMonthlyTrendSchema
>;

export const InvestmentDayOfWeekSchema = z.object({
  day: z.number(),
  dayName: z.string(),
  transactionCount: z.number(),
  amount: z.number(),
});
export type InvestmentDayOfWeek = z.infer<typeof InvestmentDayOfWeekSchema>;

export const InvestmentTimeOfDaySchema = z.object({
  hour: z.number(),
  transactionCount: z.number(),
  amount: z.number(),
});
export type InvestmentTimeOfDay = z.infer<typeof InvestmentTimeOfDaySchema>;

export const LargestInvestmentSchema = z.object({
  id: z.string(),
  date: z.string(),
  merchant: z.string(),
  amount: z.number(),
  assetType: z.string(),
});
export type LargestInvestment = z.infer<typeof LargestInvestmentSchema>;

export const SipDetectionSchema = z.object({
  merchant: z.string(),
  avgAmount: z.number(),
  transactionCount: z.number(),
  frequency: z.string(), // e.g., "Monthly", "Weekly"
  lastInvestment: z.string(),
  estimatedNext: z.string().nullable(),
  assetType: z.string(),
});
export type SipDetection = z.infer<typeof SipDetectionSchema>;

export const InvestmentAnalyticsSchema = z.object({
  totalInvested: z.number(),
  transactionCount: z.number(),
  avgInvestment: z.number(),
  activePlatforms: z.number(),
  firstInvestment: z.string().nullable(),
  lastInvestment: z.string().nullable(),
  daysSinceLastInvestment: z.number().nullable(),
  avgDaysBetweenInvestments: z.number().nullable(),
  consistencyScore: z.number(), // Percentage of months with investments
  assetTypeBreakdown: z.array(AssetTypeBreakdownSchema),
  platformBreakdown: z.array(PlatformBreakdownSchema),
  monthlyTrend: z.array(InvestmentMonthlyTrendSchema),
  dayOfWeek: z.array(InvestmentDayOfWeekSchema),
  timeOfDay: z.array(InvestmentTimeOfDaySchema),
  largestInvestments: z.array(LargestInvestmentSchema),
  detectedSips: z.array(SipDetectionSchema),
});
export type InvestmentAnalytics = z.infer<typeof InvestmentAnalyticsSchema>;
