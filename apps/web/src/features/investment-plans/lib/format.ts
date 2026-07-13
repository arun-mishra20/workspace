export { fmtCurrency, fmtCompact } from '@/features/expenses/components/analytics/analytics-utils'

export function fmtPercentFromBps(bps: number, decimals = 1): string {
  return `${(bps / 100).toFixed(decimals)}%`
}

export function fmtXirr(rate: number | null): string {
  if (rate === null || !Number.isFinite(rate)) return '—'
  return `${(rate * 100).toFixed(1)}%`
}
