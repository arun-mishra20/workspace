import type { AnalyticsPeriod } from '@workspace/domain'

export const ANALYTICS_TABS = [
  'overview',
  'cards',
  'categories',
  'trends',
  'data-quality',
  'rules',
  'patterns',
  'dashboards',
] as const
export type AnalyticsTab = (typeof ANALYTICS_TABS)[number]

export const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: '7 days', value: 'week' },
  { label: '30 days', value: 'month' },
  { label: '90 days', value: 'quarter' },
  { label: '1 year', value: 'year' },
]

const CHART_TOKEN_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
]

export const getChartTokenColor = (index: number) =>
  CHART_TOKEN_COLORS[index % CHART_TOKEN_COLORS.length]

export const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)

export const fmtCompact = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)

export function isAnalyticsTab(value: string | null): value is AnalyticsTab {
  return ANALYTICS_TABS.includes(value as AnalyticsTab)
}

export function isAnalyticsPeriod(value: string | null): value is AnalyticsPeriod {
  return PERIODS.some((p) => p.value === value)
}
