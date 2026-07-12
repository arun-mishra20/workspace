import type { AssetCategory } from './types.js'

/** Pairwise correlations between canonical asset categories */
const CATEGORY_CORRELATIONS: Record<AssetCategory, Record<AssetCategory, number>> = {
  indian_equity: {
    indian_equity: 1,
    us_equity: 0.7,
    gold: -0.1,
    debt: 0.2,
    cash: 0,
    other: 0.3,
  },
  us_equity: {
    indian_equity: 0.7,
    us_equity: 1,
    gold: -0.05,
    debt: 0.15,
    cash: 0,
    other: 0.25,
  },
  gold: {
    indian_equity: -0.1,
    us_equity: -0.05,
    gold: 1,
    debt: 0,
    cash: 0,
    other: 0,
  },
  debt: {
    indian_equity: 0.2,
    us_equity: 0.15,
    gold: 0,
    debt: 1,
    cash: 0,
    other: 0.1,
  },
  cash: {
    indian_equity: 0,
    us_equity: 0,
    gold: 0,
    debt: 0,
    cash: 1,
    other: 0,
  },
  other: {
    indian_equity: 0.3,
    us_equity: 0.25,
    gold: 0,
    debt: 0.1,
    cash: 0,
    other: 1,
  },
}

export function correlationBetween(
  a: AssetCategory,
  b: AssetCategory,
): number {
  return CATEGORY_CORRELATIONS[a]?.[b] ?? 0
}

/** Build symmetric positive-semi-definite correlation matrix for N assets */
export function buildCorrelationMatrix(
  categories: AssetCategory[],
): number[][] {
  const n = categories.length
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      matrix[i]![j] = correlationBetween(categories[i]!, categories[j]!)
    }
  }

  return matrix
}
