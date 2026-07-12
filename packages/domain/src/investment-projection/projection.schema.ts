import { z } from 'zod'

export const InvestmentFrequencySchema = z.enum([
  'monthly',
  'weekly',
  'quarterly',
  'yearly',
])
export type InvestmentFrequency = z.infer<typeof InvestmentFrequencySchema>

export const DurationUnitSchema = z.enum(['years', 'months'])
export type DurationUnit = z.infer<typeof DurationUnitSchema>

export const BasicSIPConfigSchema = z.object({
  frequency: InvestmentFrequencySchema.default('monthly'),
  amount: z.number().min(0).default(10_000),
  durationValue: z.number().min(1).default(10),
  durationUnit: DurationUnitSchema.default('years'),
  annualReturn: z.number().min(0).max(100).default(12),
})
export type BasicSIPConfig = z.infer<typeof BasicSIPConfigSchema>

export const InflationViewModeSchema = z.enum(['nominal', 'real'])
export type InflationViewMode = z.infer<typeof InflationViewModeSchema>

export const InflationConfigSchema = z.object({
  enabled: z.boolean().default(false),
  rate: z.number().min(0).max(30).default(6),
  viewMode: InflationViewModeSchema.default('nominal'),
})
export type InflationConfig = z.infer<typeof InflationConfigSchema>

export const StepUpConfigSchema = z.object({
  enabled: z.boolean().default(false),
  annualIncrementPercent: z.number().min(0).max(100).default(10),
})
export type StepUpConfig = z.infer<typeof StepUpConfigSchema>

export const LumpSumEntrySchema = z.object({
  month: z.number().min(0),
  amount: z.number().min(0),
})
export type LumpSumEntry = z.infer<typeof LumpSumEntrySchema>

export const ExistingInvestmentsConfigSchema = z.object({
  enabled: z.boolean().default(false),
  currentPortfolio: z.number().min(0).default(0),
  lumpSums: z.array(LumpSumEntrySchema).default([]),
  futureLumpSums: z.array(LumpSumEntrySchema).default([]),
  existingMonthly: z.number().min(0).default(0),
})
export type ExistingInvestmentsConfig = z.infer<
  typeof ExistingInvestmentsConfigSchema
>

export const AssetClassSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number().int().min(0),
  currentValue: z.number().min(0).default(0),
  monthlyInvestment: z.number().min(0).default(0),
  expectedReturn: z.number().min(0).max(100).default(12),
  volatility: z.number().min(0).max(100).optional(),
  inflationRate: z.number().min(0).max(30).optional(),
  expenseRatio: z.number().min(0).max(10).optional(),
})
export type AssetClass = z.infer<typeof AssetClassSchema>

export const TaxConfigSchema = z.object({
  enabled: z.boolean().default(false),
  ltcgRate: z.number().min(0).max(100).default(12.5),
  stcgRate: z.number().min(0).max(100).default(20),
  dividendTaxRate: z.number().min(0).max(100).default(10),
  exitTaxRate: z.number().min(0).max(100).default(0),
})
export type TaxConfig = z.infer<typeof TaxConfigSchema>

export const WithdrawalEntrySchema = z.object({
  month: z.number().min(0),
  amount: z.number().min(0),
})
export type WithdrawalEntry = z.infer<typeof WithdrawalEntrySchema>

export const BonusInvestmentSchema = z.object({
  month: z.number().min(0),
  amount: z.number().min(0),
  label: z.string().optional(),
})
export type BonusInvestment = z.infer<typeof BonusInvestmentSchema>

export const CurrencyConversionSchema = z.object({
  enabled: z.boolean().default(false),
  usdInrRate: z.number().min(0).default(83),
  usdReturnAssumption: z.number().min(0).max(100).default(10),
})
export type CurrencyConversion = z.infer<typeof CurrencyConversionSchema>

export const AdvancedControlsSchema = z.object({
  expenseRatio: z.number().min(0).max(10).default(0),
  tax: TaxConfigSchema.default({
    enabled: false,
    ltcgRate: 12.5,
    stcgRate: 20,
    dividendTaxRate: 10,
    exitTaxRate: 0,
  }),
  dividendReinvestment: z.boolean().default(true),
  bonusInvestments: z.array(BonusInvestmentSchema).default([]),
  skipMonths: z.array(z.number().min(0)).default([]),
  withdrawalSchedule: z.array(WithdrawalEntrySchema).default([]),
  retirementTarget: z.number().min(0).optional(),
  safeWithdrawalRate: z.number().min(0).max(20).default(4),
  currencyConversion: CurrencyConversionSchema.default({
    enabled: false,
    usdInrRate: 83,
    usdReturnAssumption: 10,
  }),
})
export type AdvancedControls = z.infer<typeof AdvancedControlsSchema>

export const ScenarioTypeSchema = z.enum([
  'conservative',
  'expected',
  'optimistic',
  'custom',
])
export type ScenarioType = z.infer<typeof ScenarioTypeSchema>

export const TimelinePresetSchema = z.enum([
  'today',
  '1y',
  '3y',
  '5y',
  '10y',
  '15y',
  '20y',
  '25y',
  '30y',
  'custom',
])
export type TimelinePreset = z.infer<typeof TimelinePresetSchema>

export const ProjectionTimelineSchema = z.object({
  preset: TimelinePresetSchema.default('10y'),
  customMonths: z.number().min(1).optional(),
})
export type ProjectionTimeline = z.infer<typeof ProjectionTimelineSchema>

export const MultiAssetConfigSchema = z.object({
  enabled: z.boolean().default(false),
  assetClasses: z.array(AssetClassSchema).default([]),
})
export type MultiAssetConfig = z.infer<typeof MultiAssetConfigSchema>

export const ContributionTimingSchema = z.enum(['beginning', 'end'])
export type ContributionTiming = z.infer<typeof ContributionTimingSchema>

export const RebalanceFrequencySchema = z.enum([
  'yearly',
  'half-yearly',
  'quarterly',
])
export type RebalanceFrequency = z.infer<typeof RebalanceFrequencySchema>

export const MonteCarloFeesSchema = z.object({
  enabled: z.boolean().default(false),
  expenseRatio: z.number().min(0).max(10).default(0),
  advisoryFee: z.number().min(0).max(10).default(0),
  brokerage: z.number().min(0).max(5).default(0),
  annualMaintenance: z.number().min(0).default(0),
})
export type MonteCarloFees = z.infer<typeof MonteCarloFeesSchema>

export const MonteCarloCorrelationSchema = z.object({
  enabled: z.boolean().default(true),
})
export type MonteCarloCorrelation = z.infer<typeof MonteCarloCorrelationSchema>

export const MonteCarloRebalancingSchema = z.object({
  enabled: z.boolean().default(false),
  frequency: RebalanceFrequencySchema.default('yearly'),
})
export type MonteCarloRebalancing = z.infer<typeof MonteCarloRebalancingSchema>

export const MonteCarloConfigSchema = z.object({
  enabled: z.boolean().default(false),
  simulations: z.number().min(100).max(20_000).default(5000),
  targetCorpus: z.number().min(0).optional(),
  contributionTiming: ContributionTimingSchema.default('end'),
  correlation: MonteCarloCorrelationSchema.default({ enabled: true }),
  rebalancing: MonteCarloRebalancingSchema.default({
    enabled: false,
    frequency: 'yearly',
  }),
  fees: MonteCarloFeesSchema.default({
    enabled: false,
    expenseRatio: 0,
    advisoryFee: 0,
    brokerage: 0,
    annualMaintenance: 0,
  }),
  trackInflation: z.boolean().default(true),
})
export type MonteCarloConfig = z.infer<typeof MonteCarloConfigSchema>

export const InflationScenarioSchema = z.object({
  enabled: z.boolean().default(false),
  rates: z.array(z.number().min(0).max(30)).default([4, 5, 6, 7]),
})
export type InflationScenario = z.infer<typeof InflationScenarioSchema>

export const ProjectionScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ScenarioTypeSchema.default('expected'),
  basicSIP: BasicSIPConfigSchema,
  inflation: InflationConfigSchema,
  stepUp: StepUpConfigSchema,
  existingInvestments: ExistingInvestmentsConfigSchema,
  multiAsset: MultiAssetConfigSchema,
  advanced: AdvancedControlsSchema,
  timeline: ProjectionTimelineSchema,
  monteCarlo: MonteCarloConfigSchema,
  inflationScenarios: InflationScenarioSchema,
})
export type ProjectionScenario = z.infer<typeof ProjectionScenarioSchema>

export const ProjectionConfigSchema = ProjectionScenarioSchema
export type ProjectionConfig = ProjectionScenario

/** Monthly snapshot in projection time series */
export interface ProjectionMonthSnapshot {
  month: number
  label: string
  date: Date
  totalValue: number
  totalInvested: number
  totalGains: number
  realValue: number
  assetValues: Record<string, number>
  assetInvested: Record<string, number>
  monthlyContribution: number
}

export interface AllocationSnapshot {
  name: string
  value: number
  percentage: number
}

export interface SummaryMetrics {
  totalInvested: number
  estimatedReturns: number
  finalCorpus: number
  realFinalCorpus: number
  cagr: number
  wealthMultiplier: number
  inflationImpact: number
}

export interface ProjectionResult {
  config: ProjectionConfig
  horizonMonths: number
  snapshots: ProjectionMonthSnapshot[]
  summary: SummaryMetrics
}

export interface ScenarioComparisonPoint {
  month: number
  label: string
  [scenarioId: string]: number | string
}

export interface InflationScenarioPoint {
  month: number
  label: string
  [rateKey: string]: number | string
}

/** Rich monthly snapshot from a single Monte Carlo path */
export interface MonteCarloMonthSnapshot {
  month: number
  totalInvested: number
  portfolioValue: number
  inflationAdjustedValue: number
  portfolioGain: number
  assetBreakdown: Record<string, number>
  monthlyContribution: number
  monthlyReturn: number
  allocation: Record<string, number>
}

export interface MonteCarloResult {
  simulations: number
  bestCase: number[]
  averageCase: number[]
  worstCase: number[]
  percentile10: number[]
  percentile25: number[]
  percentile50: number[]
  percentile75: number[]
  percentile90: number[]
  percentile95: number[]
  /** Inflation-adjusted percentile bands (present when inflation tracking is on) */
  realPercentile10?: number[]
  realPercentile50?: number[]
  realPercentile90?: number[]
  probabilityOfTarget: number
  finalDistribution: { bucket: string; count: number }[]
  /** Median simulation path with full monthly snapshots */
  medianPath?: MonteCarloMonthSnapshot[]
}

export interface MilestoneHit {
  label: string
  targetINR: number
  month: number
  yearsFromNow: number
  date: Date
  composition: AllocationSnapshot[]
  investedAtHit: number
  gainsAtHit: number
  achieved: boolean
}

export interface ProjectionInsight {
  id: string
  type: 'milestone' | 'inflation' | 'stepup' | 'allocation' | 'growth' | 'history'
  message: string
  highlight?: string
}
