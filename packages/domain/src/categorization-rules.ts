import { z } from 'zod'

import { TransactionAttributesSchema } from './finance.js'

// ── Rule condition model ──

export const RuleConditionSchema = z.discriminatedUnion('field', [
  z.object({
    field: z.literal('amount'),
    op: z.enum(['eq', 'between', 'gte', 'lte']),
    value: z.number(),
    valueTo: z.number().optional(),
  }),
  z.object({
    field: z.literal('transaction_type'),
    op: z.literal('eq'),
    value: z.enum(['debited', 'credited']),
  }),
  z.object({
    field: z.enum(['merchant', 'merchant_raw', 'vpa']),
    op: z.enum(['eq', 'contains', 'regex']),
    value: z.string().min(1),
  }),
  z.object({
    field: z.literal('transaction_mode'),
    op: z.literal('eq'),
    value: z.string().min(1),
  }),
  z.object({
    field: z.literal('card_last4'),
    op: z.literal('eq'),
    value: z.string().min(1),
  }),
  z.object({
    field: z.literal('day_of_month'),
    op: z.enum(['eq', 'between']),
    value: z.number().int().min(1).max(31),
    valueTo: z.number().int().min(1).max(31).optional(),
  }),
])

export type RuleCondition = z.infer<typeof RuleConditionSchema>

export const RuleConditionGroupSchema: z.ZodType<RuleConditionGroup> = z.lazy(() =>
  z.object({
    logic: z.enum(['AND', 'OR']),
    conditions: z.array(RuleConditionSchema),
    groups: z.array(RuleConditionGroupSchema).optional(),
  }),
)

export interface RuleConditionGroup {
  logic: 'AND' | 'OR'
  conditions: RuleCondition[]
  groups?: RuleConditionGroup[]
}

export const RuleActionSchema = z.object({
  category: z.string().min(1),
  subcategory: z.string().min(1),
  requiresReview: z.boolean().optional(),
  setAttributes: TransactionAttributesSchema.optional(),
})

export type RuleAction = z.infer<typeof RuleActionSchema>

export const CategorizationRuleSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  enabled: z.boolean(),
  priority: z.number().int(),
  conditions: RuleConditionGroupSchema,
  action: RuleActionSchema,
  hitCount: z.number().int(),
  lastMatchedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type CategorizationRule = z.infer<typeof CategorizationRuleSchema>

export const CreateCategorizationRuleInputSchema = z.object({
  name: z.string().min(1).max(200),
  enabled: z.boolean().default(true),
  priority: z.number().int().optional(),
  conditions: RuleConditionGroupSchema,
  action: RuleActionSchema,
})

export type CreateCategorizationRuleInput = z.infer<
  typeof CreateCategorizationRuleInputSchema
>

export const UpdateCategorizationRuleInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().optional(),
  conditions: RuleConditionGroupSchema.optional(),
  action: RuleActionSchema.optional(),
})

export type UpdateCategorizationRuleInput = z.infer<
  typeof UpdateCategorizationRuleInputSchema
>

export const RulePreviewRequestSchema = z.object({
  conditions: RuleConditionGroupSchema,
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

export type RulePreviewRequest = z.infer<typeof RulePreviewRequestSchema>

export const RulePreviewTransactionSchema = z.object({
  id: z.string(),
  merchant: z.string(),
  amount: z.number(),
  transactionDate: z.string(),
  transactionType: z.string(),
  category: z.string(),
  subcategory: z.string(),
  categorizationMethod: z.string(),
})

export type RulePreviewTransaction = z.infer<typeof RulePreviewTransactionSchema>

export const RulePreviewResponseSchema = z.object({
  matchedCount: z.number(),
  totalAmount: z.number(),
  transactions: z.array(RulePreviewTransactionSchema),
})

export type RulePreviewResponse = z.infer<typeof RulePreviewResponseSchema>

export const RuleApplyRequestSchema = z.object({
  force: z.boolean().default(false),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

export type RuleApplyRequest = z.infer<typeof RuleApplyRequestSchema>

export const RuleApplyResponseSchema = z.object({
  appliedCount: z.number(),
  skippedManualCount: z.number(),
  totalAmount: z.number(),
})

export type RuleApplyResponse = z.infer<typeof RuleApplyResponseSchema>

export const RuleConflictItemSchema = z.object({
  transactionId: z.string(),
  merchant: z.string(),
  amount: z.number(),
  ruleIds: z.array(z.string()),
  ruleNames: z.array(z.string()),
})

export type RuleConflictItem = z.infer<typeof RuleConflictItemSchema>

export const CategoryOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  icon: z.string(),
  color: z.string(),
  parent: z.string().nullable(),
  subcategories: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    }),
  ),
})

export type CategoryOption = z.infer<typeof CategoryOptionSchema>

export const SuggestedRuleSchema = z.object({
  name: z.string(),
  conditions: RuleConditionGroupSchema,
  action: RuleActionSchema,
  matchCount: z.number(),
  totalAmount: z.number(),
  sampleMerchant: z.string().optional(),
})

export type SuggestedRule = z.infer<typeof SuggestedRuleSchema>

export const ReapplyAllRulesResponseSchema = z.object({
  appliedCount: z.number(),
  skippedManualCount: z.number(),
  rulesProcessed: z.number(),
})

export type ReapplyAllRulesResponse = z.infer<typeof ReapplyAllRulesResponseSchema>
