import type { AssetClass } from '../projection.schema.js'
import type { AssetCategory } from './types.js'

/** Default annual volatilities (%) by asset category / name pattern */
export const DEFAULT_VOLATILITY_PERCENT: Record<string, number> = {
  indian_equity: 18,
  us_equity: 20,
  mid_cap: 24,
  small_cap: 28,
  mutual_fund: 15,
  gold: 14,
  debt: 4,
  fixed_deposit: 0,
  ppf: 0,
  cash: 0,
  real_estate: 10,
  other: 12,
}

export function classifyAsset(name: string): AssetCategory {
  const lower = name.toLowerCase()
  if (lower.includes('us') && lower.includes('equity')) return 'us_equity'
  if (lower.includes('mid') && lower.includes('cap')) return 'indian_equity'
  if (lower.includes('small') && lower.includes('cap')) return 'indian_equity'
  if (
    lower.includes('equity') ||
    lower.includes('stock') ||
    lower.includes('mutual')
  ) {
    return lower.includes('us') ? 'us_equity' : 'indian_equity'
  }
  if (lower.includes('gold')) return 'gold'
  if (
    lower.includes('debt') ||
    lower.includes('fd') ||
    lower.includes('fixed') ||
    lower.includes('ppf')
  ) {
    return 'debt'
  }
  if (lower.includes('cash')) return 'cash'
  return 'other'
}

function volatilityKey(name: string, category: AssetCategory): string {
  const lower = name.toLowerCase()
  if (lower.includes('mid') && lower.includes('cap')) return 'mid_cap'
  if (lower.includes('small') && lower.includes('cap')) return 'small_cap'
  if (lower.includes('fixed') || lower === 'fd') return 'fixed_deposit'
  if (lower.includes('ppf')) return 'ppf'
  if (category === 'indian_equity') return 'indian_equity'
  if (category === 'us_equity') return 'us_equity'
  if (category === 'gold') return 'gold'
  if (category === 'debt') return 'debt'
  if (category === 'cash') return 'cash'
  return 'other'
}

export function resolveAssetVolatility(asset: AssetClass): number {
  if (asset.volatility !== undefined) return asset.volatility
  const category = classifyAsset(asset.name)
  const key = volatilityKey(asset.name, category)
  return DEFAULT_VOLATILITY_PERCENT[key] ?? DEFAULT_VOLATILITY_PERCENT['other']!
}
