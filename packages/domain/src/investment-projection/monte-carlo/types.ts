import type { AssetClass, MonteCarloMonthSnapshot, ProjectionConfig } from '../projection.schema.js'

/** Canonical asset categories for correlation lookup */
export type AssetCategory =
  | 'indian_equity'
  | 'us_equity'
  | 'gold'
  | 'debt'
  | 'cash'
  | 'other'

export interface ResolvedSimulationAsset {
  id: string
  name: string
  category: AssetCategory
  currentValue: number
  monthlyInvestment: number
  annualReturnPercent: number
  annualVolPercent: number
  expenseRatioPercent: number
  /** GBM drift (μ - σ²/2) per month */
  drift: number
  /** Monthly volatility σ */
  sigmaMonthly: number
}

export interface SimulationContext {
  config: ProjectionConfig
  assets: ResolvedSimulationAsset[]
  horizonMonths: number
  targetWeights: Float64Array
  rebalanceIntervalMonths: number
  monthlyInflationRate: number
  trackInflation: boolean
  contributionAtBeginning: boolean
  correlationEnabled: boolean
  choleskyL: Float64Array[]
  feesEnabled: boolean
  monthlyExpenseDrag: Float64Array
  monthlyAdvisoryDrag: Float64Array
  monthlyBrokerageDrag: Float64Array
  monthlyMaintenanceDrag: number
  lumpSumByMonth: Map<number, number>
  /** Extension point for future tax modelling */
  taxHandlers: MonteCarloTaxHandler[]
}

export interface PathState {
  month: number
  values: Float64Array
  invested: Float64Array
  costBasis: Float64Array
  cumulativeInflationFactor: number
  monthlyContribution: number
  monthlyReturn: number
}

export interface PathResult {
  snapshots: MonteCarloMonthSnapshot[]
  finalValue: number
  finalRealValue: number
}

/** Extension point — plug in capital gains / withdrawal / exit tax later */
export interface MonteCarloTaxContext {
  month: number
  state: PathState
  assets: ResolvedSimulationAsset[]
}

export type MonteCarloTaxHandler = (ctx: MonteCarloTaxContext) => void

export interface RawPathData {
  nominal: Float64Array
  real: Float64Array
  snapshots: MonteCarloMonthSnapshot[]
}

export function resolveAssetsFromConfig(config: ProjectionConfig): AssetClass[] {
  const { multiAsset, basicSIP, existingInvestments } = config

  if (multiAsset.enabled && multiAsset.assetClasses.length > 0) {
    return [...multiAsset.assetClasses].sort((a, b) => a.order - b.order)
  }

  return [
    {
      id: 'portfolio',
      name: 'Portfolio',
      order: 0,
      currentValue: existingInvestments.enabled
        ? existingInvestments.currentPortfolio
        : 0,
      monthlyInvestment: basicSIP.amount,
      expectedReturn: basicSIP.annualReturn,
      volatility: 18,
    },
  ]
}
