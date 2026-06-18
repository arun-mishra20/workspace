import type { AnalyticsPeriod } from '@workspace/domain'

import {
  PERIODS,
  type AnalyticsTab,
} from '@/features/expenses/components/analytics/analytics-utils'

interface AnalyticsFilterBarProps {
  period: AnalyticsPeriod
  activeTab: AnalyticsTab
  cardLabel?: string
}

const TAB_LABELS: Record<AnalyticsTab, string> = {
  overview: 'Overview',
  cards: 'Cards',
  categories: 'Categories',
  trends: 'Trends',
}

export function AnalyticsFilterBar({
  period,
  activeTab,
  cardLabel,
}: AnalyticsFilterBarProps) {
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? period

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Showing:</span>
      <span>{periodLabel}</span>
      <span aria-hidden="true">·</span>
      <span>{cardLabel ?? 'All cards'}</span>
      <span aria-hidden="true">·</span>
      <span>{TAB_LABELS[activeTab]}</span>
    </div>
  )
}
