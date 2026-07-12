export { fmtCurrency, fmtCompact, getChartTokenColor } from '@/features/expenses/components/analytics/analytics-utils'

export function fmtPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`
}

export function fmtMultiplier(n: number): string {
  if (!Number.isFinite(n)) return '∞x'
  return `${n.toFixed(1)}x`
}
