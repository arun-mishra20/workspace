import type { AssetClass, ProjectionScenario, ScenarioType } from './projection.schema.js'
import { ProjectionScenarioSchema } from './projection.schema.js'

let assetIdCounter = 0
function createAssetId(): string {
  assetIdCounter += 1
  return `asset-${assetIdCounter}-${Date.now()}`
}

export const DEFAULT_ASSET_PRESETS: Omit<AssetClass, 'id'>[] = [
  {
    name: 'Indian Equity',
    order: 0,
    currentValue: 0,
    monthlyInvestment: 0,
    expectedReturn: 12,
    volatility: 18,
  },
  {
    name: 'Mutual Funds',
    order: 1,
    currentValue: 0,
    monthlyInvestment: 0,
    expectedReturn: 12,
    volatility: 15,
  },
  {
    name: 'US Equity',
    order: 2,
    currentValue: 0,
    monthlyInvestment: 0,
    expectedReturn: 10,
    volatility: 20,
  },
  {
    name: 'Gold',
    order: 3,
    currentValue: 0,
    monthlyInvestment: 0,
    expectedReturn: 6,
    volatility: 14,
  },
  {
    name: 'Debt Funds',
    order: 4,
    currentValue: 0,
    monthlyInvestment: 0,
    expectedReturn: 7,
    volatility: 4,
  },
  {
    name: 'Fixed Deposits',
    order: 5,
    currentValue: 0,
    monthlyInvestment: 0,
    expectedReturn: 6.5,
    volatility: 0,
  },
  {
    name: 'PPF',
    order: 6,
    currentValue: 0,
    monthlyInvestment: 0,
    expectedReturn: 7.1,
    volatility: 0,
  },
  {
    name: 'Cash',
    order: 7,
    currentValue: 0,
    monthlyInvestment: 0,
    expectedReturn: 3,
    volatility: 0,
  },
  {
    name: 'Real Estate',
    order: 8,
    currentValue: 0,
    monthlyInvestment: 0,
    expectedReturn: 8,
    volatility: 10,
  },
]

export function createDefaultAssetClasses(): AssetClass[] {
  return DEFAULT_ASSET_PRESETS.map((preset, index) => ({
    ...preset,
    id: createAssetId(),
    order: index,
  }))
}

export function createDefaultScenario(
  overrides?: Partial<ProjectionScenario>,
): ProjectionScenario {
  const id = overrides?.id ?? `scenario-${Date.now()}`
  const scenario: ProjectionScenario = {
    id,
    name: overrides?.name ?? 'My Projection',
    type: overrides?.type ?? 'expected',
    basicSIP: {
      frequency: 'monthly',
      amount: 10_000,
      durationValue: 10,
      durationUnit: 'years',
      annualReturn: 12,
      ...overrides?.basicSIP,
    },
    inflation: {
      enabled: false,
      rate: 6,
      viewMode: 'nominal',
      ...overrides?.inflation,
    },
    stepUp: {
      enabled: false,
      annualIncrementPercent: 10,
      ...overrides?.stepUp,
    },
    existingInvestments: {
      enabled: false,
      currentPortfolio: 0,
      lumpSums: [],
      futureLumpSums: [],
      existingMonthly: 0,
      ...overrides?.existingInvestments,
    },
    multiAsset: {
      enabled: false,
      assetClasses: createDefaultAssetClasses(),
      ...overrides?.multiAsset,
    },
    advanced: {
      expenseRatio: 0,
      tax: {
        enabled: false,
        ltcgRate: 12.5,
        stcgRate: 20,
        dividendTaxRate: 10,
        exitTaxRate: 0,
      },
      dividendReinvestment: true,
      bonusInvestments: [],
      skipMonths: [],
      withdrawalSchedule: [],
      safeWithdrawalRate: 4,
      currencyConversion: {
        enabled: false,
        usdInrRate: 83,
        usdReturnAssumption: 10,
      },
      ...overrides?.advanced,
    },
    timeline: {
      preset: '10y',
      ...overrides?.timeline,
    },
    monteCarlo: {
      enabled: false,
      simulations: 5000,
      contributionTiming: 'end',
      correlation: { enabled: true },
      rebalancing: { enabled: false, frequency: 'yearly' },
      fees: {
        enabled: false,
        expenseRatio: 0,
        advisoryFee: 0,
        brokerage: 0,
        annualMaintenance: 0,
      },
      trackInflation: true,
      ...overrides?.monteCarlo,
    },
    inflationScenarios: {
      enabled: false,
      rates: [4, 5, 6, 7],
      ...overrides?.inflationScenarios,
    },
  }

  return ProjectionScenarioSchema.parse(scenario)
}

const SCENARIO_RETURN_ADJUSTMENTS: Record<
  Exclude<ScenarioType, 'custom' | 'expected'>,
  { equity: number; gold: number; debt: number }
> = {
  conservative: { equity: 10, gold: 5, debt: 6 },
  optimistic: { equity: 15, gold: 8, debt: 7 },
}

function isEquityLike(name: string): boolean {
  const lower = name.toLowerCase()
  return lower.includes('equity') || lower.includes('mutual') || lower.includes('stock')
}

function isGoldLike(name: string): boolean {
  return name.toLowerCase().includes('gold')
}

function isDebtLike(name: string): boolean {
  const lower = name.toLowerCase()
  return (
    lower.includes('debt') ||
    lower.includes('fd') ||
    lower.includes('fixed') ||
    lower.includes('ppf') ||
    lower.includes('cash')
  )
}

export function createPresetScenario(type: ScenarioType): ProjectionScenario {
  const base = createDefaultScenario({
    id: `preset-${type}`,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    type,
  })

  if (type === 'expected' || type === 'custom') {
    return base
  }

  const adjustments = SCENARIO_RETURN_ADJUSTMENTS[type]
  const assetClasses = base.multiAsset.assetClasses.map((asset) => {
    if (isEquityLike(asset.name)) {
      return { ...asset, expectedReturn: adjustments.equity }
    }
    if (isGoldLike(asset.name)) {
      return { ...asset, expectedReturn: adjustments.gold }
    }
    if (isDebtLike(asset.name)) {
      return { ...asset, expectedReturn: adjustments.debt }
    }
    return asset
  })

  return {
    ...base,
    basicSIP: {
      ...base.basicSIP,
      annualReturn: adjustments.equity,
    },
    multiAsset: {
      ...base.multiAsset,
      assetClasses,
    },
  }
}

export const MILESTONE_TARGETS = [
  { label: '50 Lakhs', targetINR: 5_000_000 },
  { label: '1 Crore', targetINR: 10_000_000 },
  { label: '2 Crore', targetINR: 20_000_000 },
  { label: '5 Crore', targetINR: 50_000_000 },
  { label: '10 Crore', targetINR: 100_000_000 },
] as const

export function timelinePresetToMonths(
  preset: ProjectionScenario['timeline']['preset'],
  customMonths?: number,
  durationMonths?: number,
): number {
  switch (preset) {
    case 'today':
      return 0
    case '1y':
      return 12
    case '3y':
      return 36
    case '5y':
      return 60
    case '10y':
      return 120
    case '15y':
      return 180
    case '20y':
      return 240
    case '25y':
      return 300
    case '30y':
      return 360
    case 'custom':
      return customMonths ?? durationMonths ?? 120
    default:
      return durationMonths ?? 120
  }
}
