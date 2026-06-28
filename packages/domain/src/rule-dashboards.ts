import { z } from 'zod'

import { RuleConditionGroupSchema } from './categorization-rules.js'
import {
  CategoryMetadataSchema,
  DailySpendingItemSchema,
  PeriodComparisonSchema,
  TransactionAttributesSchema,
  TransactionModeSchema,
  TransactionTypeSchema,
} from './finance.js'

export const DashboardInlineRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  conditions: RuleConditionGroupSchema,
})

export type DashboardInlineRule = z.infer<typeof DashboardInlineRuleSchema>

const dashboardRuleSourceRefinement = (value: {
  ruleIds: string[]
  inlineRules: DashboardInlineRule[]
}) => value.ruleIds.length > 0 || value.inlineRules.length > 0

export const RuleDashboardSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  ruleIds: z.array(z.string().uuid()),
  inlineRules: z.array(DashboardInlineRuleSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type RuleDashboard = z.infer<typeof RuleDashboardSchema>

export const CreateRuleDashboardInputSchema = z
  .object({
    name: z.string().min(1).max(200),
    ruleIds: z.array(z.string().uuid()).default([]),
    inlineRules: z.array(DashboardInlineRuleSchema).default([]),
  })
  .refine(dashboardRuleSourceRefinement, {
    message: 'At least one global rule or dashboard-only rule is required',
  })

export type CreateRuleDashboardInput = z.infer<typeof CreateRuleDashboardInputSchema>

export const UpdateRuleDashboardInputSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    ruleIds: z.array(z.string().uuid()).optional(),
    inlineRules: z.array(DashboardInlineRuleSchema).optional(),
  })
  .refine(
    (value) =>
      value.ruleIds === undefined &&
      value.inlineRules === undefined
        ? true
        : dashboardRuleSourceRefinement({
            ruleIds: value.ruleIds ?? [],
            inlineRules: value.inlineRules ?? [],
          }),
    {
      message: 'At least one global rule or dashboard-only rule is required',
    },
  )

export type UpdateRuleDashboardInput = z.infer<typeof UpdateRuleDashboardInputSchema>

export const RuleDashboardRuleRefSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  source: z.enum(['global', 'inline']).default('global'),
})

export type RuleDashboardRuleRef = z.infer<typeof RuleDashboardRuleRefSchema>

export const RuleDashboardListItemSchema = RuleDashboardSchema.extend({
  rules: z.array(RuleDashboardRuleRefSchema),
  missingRuleIds: z.array(z.string().uuid()).optional(),
})

export type RuleDashboardListItem = z.infer<typeof RuleDashboardListItemSchema>

export const RuleDashboardAnalyticsRequestSchema = z
  .object({
    ruleIds: z.array(z.string().uuid()).default([]),
    inlineRules: z.array(DashboardInlineRuleSchema).default([]),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    cardLast4: z.string().optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(25),
  })
  .refine(dashboardRuleSourceRefinement, {
    message: 'At least one global rule or dashboard-only rule is required',
  })

export type RuleDashboardAnalyticsRequest = z.infer<
  typeof RuleDashboardAnalyticsRequestSchema
>

export const RuleDashboardSummarySchema = z.object({
  totalSpent: z.number(),
  totalReceived: z.number(),
  netFlow: z.number(),
  transactionCount: z.number(),
  avgTransaction: z.number(),
})

export type RuleDashboardSummary = z.infer<typeof RuleDashboardSummarySchema>

export const RuleDashboardByRuleItemSchema = z.object({
  ruleId: z.string().uuid(),
  name: z.string(),
  matchCount: z.number(),
  amount: z.number(),
})

export type RuleDashboardByRuleItem = z.infer<typeof RuleDashboardByRuleItemSchema>

export const RuleDashboardTransactionSchema = z.object({
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
  transactionAttributes: TransactionAttributesSchema.optional(),
  matchedRuleIds: z.array(z.string().uuid()),
  matchedRuleNames: z.array(z.string()),
})

export type RuleDashboardTransaction = z.infer<typeof RuleDashboardTransactionSchema>

export const RuleDashboardMonthlyItemSchema = z.object({
  month: z.string(),
  debited: z.number(),
  credited: z.number(),
  transactionCount: z.number(),
})

export type RuleDashboardMonthlyItem = z.infer<typeof RuleDashboardMonthlyItemSchema>

export const RuleDashboardCadenceSchema = z.enum([
  'recurring',
  'occasional',
  'sparse',
])

export type RuleDashboardCadence = z.infer<typeof RuleDashboardCadenceSchema>

export const RuleDashboardBaselinesSchema = z.object({
  medianMonthlySpend: z.number(),
  avgMonthlySpend: z.number(),
  avgTransactionsPerActiveMonth: z.number(),
  monthsWithSpend: z.number(),
})

export type RuleDashboardBaselines = z.infer<typeof RuleDashboardBaselinesSchema>

export const RuleDashboardPrimaryComparisonSchema = z.object({
  mode: z.enum(['month_over_month', 'vs_baseline', 'vs_prior_period']),
  label: z.string(),
  referenceLabel: z.string(),
  currentValue: z.number(),
  referenceValue: z.number(),
  changePct: z.number(),
})

export type RuleDashboardPrimaryComparison = z.infer<
  typeof RuleDashboardPrimaryComparisonSchema
>

export const RuleDashboardLargestTransactionSchema = z.object({
  id: z.string(),
  merchant: z.string(),
  amount: z.number(),
  transactionDate: z.string(),
})

export type RuleDashboardLargestTransaction = z.infer<
  typeof RuleDashboardLargestTransactionSchema
>

export const RuleDashboardInsightsSchema = z.object({
  cadence: RuleDashboardCadenceSchema,
  cadenceLabel: z.string(),
  lookbackMonths: z.number(),
  monthlyTrend: z.array(RuleDashboardMonthlyItemSchema),
  baselines: RuleDashboardBaselinesSchema,
  primaryComparison: RuleDashboardPrimaryComparisonSchema,
  daysSinceLastSpend: z.number().optional(),
  highlights: z.array(z.string()),
  largestTransactions: z.array(RuleDashboardLargestTransactionSchema),
})

export type RuleDashboardInsights = z.infer<typeof RuleDashboardInsightsSchema>

export const RuleDashboardByRuleMonthlyItemSchema = z.object({
  ruleId: z.string().uuid(),
  name: z.string(),
  month: z.string(),
  amount: z.number(),
})

export type RuleDashboardByRuleMonthlyItem = z.infer<
  typeof RuleDashboardByRuleMonthlyItemSchema
>

export const RuleDashboardAnalyticsSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  ruleIds: z.array(z.string().uuid()),
  inlineRules: z.array(DashboardInlineRuleSchema),
  rules: z.array(RuleDashboardRuleRefSchema),
  missingRuleIds: z.array(z.string().uuid()),
  truncated: z.boolean().optional(),
  summary: RuleDashboardSummarySchema,
  daily: z.array(DailySpendingItemSchema),
  byRule: z.array(RuleDashboardByRuleItemSchema),
  byRuleMonthly: z.array(RuleDashboardByRuleMonthlyItemSchema).optional(),
  periodComparison: PeriodComparisonSchema,
  insights: RuleDashboardInsightsSchema,
  transactions: z.object({
    data: z.array(RuleDashboardTransactionSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  }),
})

export type RuleDashboardAnalytics = z.infer<typeof RuleDashboardAnalyticsSchema>
