import { z } from 'zod'

export const AssetCategorySchema = z.enum([
  'indian_equity', 'us_equity', 'mutual_fund', 'etf', 'gold', 'debt',
  'fixed_deposit', 'cash', 'crypto', 'other',
])
export type InvestmentPlanAssetCategory = z.infer<typeof AssetCategorySchema>

export const ReturnBasisSchema = z.enum(['nominal', 'real'])
export const GrowthModelSchema = z.enum(['market_return', 'fixed_rate'])
export const GoalTypeSchema = z.enum(['custom', 'retirement', 'financial_independence'])
export const EventTypeSchema = z.enum(['investment', 'withdrawal'])
export const ScenarioKindSchema = z.enum(['conservative', 'base', 'optimistic'])
export type InvestmentPlanScenarioKind = z.infer<typeof ScenarioKindSchema>

const IdSchema = z.string().min(1).max(100)
const DateSchema = z.string().date()
const BpsSchema = z.number().int().min(-10_000).max(10_000)
const NonNegativeBpsSchema = z.number().int().min(0).max(10_000)

export const InvestmentPlanAssetSchema = z.object({
  id: IdSchema,
  category: AssetCategorySchema,
  name: z.string().trim().min(1).max(100),
  currentValue: z.number().finite().min(0),
  monthlyContribution: z.number().finite().min(0),
  contributionEndDate: DateSchema.optional(),
  annualEscalationBps: NonNegativeBpsSchema.default(0),
  expectedAnnualReturnBps: BpsSchema,
  returnBasis: ReturnBasisSchema.default('nominal'),
  growthModel: GrowthModelSchema.default('market_return'),
  volatilityBps: NonNegativeBpsSchema.optional(),
  notes: z.string().trim().max(2_000).optional(),
  order: z.number().int().min(0),
})
export type InvestmentPlanAsset = z.infer<typeof InvestmentPlanAssetSchema>

export const InvestmentPlanEventSchema = z.object({
  id: IdSchema,
  assetId: IdSchema,
  type: EventTypeSchema,
  effectiveDate: DateSchema,
  amount: z.number().finite().positive(),
  note: z.string().trim().max(500).optional(),
})
export type InvestmentPlanEvent = z.infer<typeof InvestmentPlanEventSchema>

export const InvestmentPlanGoalSchema = z.object({
  id: IdSchema,
  name: z.string().trim().min(1).max(100),
  type: GoalTypeSchema,
  targetDate: DateSchema,
  targetValueToday: z.number().finite().positive().optional(),
  inflationRateBps: NonNegativeBpsSchema.optional(),
  annualSpendingToday: z.number().finite().positive().optional(),
  safeWithdrawalRateBps: z.number().int().min(100).max(2_000).optional(),
}).superRefine((goal, ctx) => {
  const isFi = goal.type === 'retirement' || goal.type === 'financial_independence'
  if (isFi && (!goal.annualSpendingToday || !goal.safeWithdrawalRateBps)) {
    ctx.addIssue({ code: 'custom', message: 'FI goals require annual spending and a safe withdrawal rate' })
  }
  if (!isFi && !goal.targetValueToday) {
    ctx.addIssue({ code: 'custom', message: 'Custom goals require a target value' })
  }
})
export type InvestmentPlanGoal = z.infer<typeof InvestmentPlanGoalSchema>

export const InvestmentPlanGoalAllocationSchema = z.object({
  id: IdSchema,
  assetId: IdSchema,
  goalId: IdSchema,
  currentValueAllocationBps: NonNegativeBpsSchema,
  contributionAllocationBps: NonNegativeBpsSchema,
})
export type InvestmentPlanGoalAllocation = z.infer<typeof InvestmentPlanGoalAllocationSchema>

export const InvestmentPlanScenarioSchema = z.object({
  id: IdSchema,
  kind: ScenarioKindSchema,
  name: z.string().trim().min(1).max(50),
  marketReturnDeltaBps: z.number().int().min(-5_000).max(5_000),
  inflationDeltaBps: z.number().int().min(-2_000).max(2_000),
})
export type InvestmentPlanScenario = z.infer<typeof InvestmentPlanScenarioSchema>

export const InvestmentPlanInputSchema = z.object({
  version: z.literal(1),
  id: IdSchema,
  name: z.string().trim().min(1).max(100),
  startDate: DateSchema,
  projectionHorizonMonths: z.number().int().min(12).max(720),
  inflationRateBps: z.number().int().min(0).max(3_000),
  contributionTiming: z.enum(['beginning', 'end']).default('end'),
  assets: z.array(InvestmentPlanAssetSchema).min(1).max(50),
  events: z.array(InvestmentPlanEventSchema).max(250).default([]),
  goals: z.array(InvestmentPlanGoalSchema).max(20).default([]),
  goalAllocations: z.array(InvestmentPlanGoalAllocationSchema).max(500).default([]),
  scenarios: z.array(InvestmentPlanScenarioSchema).length(3),
}).superRefine((plan, ctx) => {
  const scenarioKinds = new Set(plan.scenarios.map((scenario) => scenario.kind))
  if (scenarioKinds.size !== 3) {
    ctx.addIssue({ code: 'custom', message: 'Plan must include unique conservative, base, and optimistic scenarios' })
  }
  const assetIds = new Set(plan.assets.map((asset) => asset.id))
  const goalIds = new Set(plan.goals.map((goal) => goal.id))
  for (const event of plan.events) {
    if (!assetIds.has(event.assetId)) ctx.addIssue({ code: 'custom', message: 'Event references an unknown asset' })
  }
  const totals = new Map<string, { current: number; contribution: number }>()
  for (const allocation of plan.goalAllocations) {
    if (!assetIds.has(allocation.assetId) || !goalIds.has(allocation.goalId)) {
      ctx.addIssue({ code: 'custom', message: 'Goal allocation references an unknown asset or goal' })
      continue
    }
    const total = totals.get(allocation.assetId) ?? { current: 0, contribution: 0 }
    total.current += allocation.currentValueAllocationBps
    total.contribution += allocation.contributionAllocationBps
    totals.set(allocation.assetId, total)
  }
  for (const total of totals.values()) {
    if (total.current > 10_000 || total.contribution > 10_000) {
      ctx.addIssue({ code: 'custom', message: 'Goal allocations cannot exceed 100% of an asset' })
    }
  }
})
export type InvestmentPlanInput = z.infer<typeof InvestmentPlanInputSchema>

export interface InvestmentPlanSnapshot {
  month: number
  date: string
  totalValue: number
  invested: number
  gains: number
  realValue: number
  monthlyContribution: number
  assetValues: Record<string, number>
  goalValues: Record<string, number>
}

export interface InvestmentPlanGoalResult {
  goalId: string
  targetValueNominal: number
  projectedValue: number
  gap: number
  onTrack: boolean
}

export interface InvestmentPlanProjection {
  scenario: InvestmentPlanScenario
  snapshots: InvestmentPlanSnapshot[]
  summary: {
    currentNetWorth: number
    finalNominalValue: number
    finalRealValue: number
    totalContributions: number
    totalGains: number
    weightedExpectedAnnualReturnBps: number
    projectedXirr: number | null
  }
  goals: InvestmentPlanGoalResult[]
  warnings: string[]
}

export interface InvestmentPlanProjectionBundle {
  base: InvestmentPlanProjection
  scenarios: Record<InvestmentPlanScenarioKind, InvestmentPlanProjection>
  sensitivity: { returnDeltaBps: number; contributionMultiplier: number; finalRealValue: number; goalsOnTrack: number }[][]
}
