import type { AnalyticsPeriod } from '@workspace/domain'

import type { AnalyticsTab } from '@/features/expenses/components/analytics/analytics-utils'

export interface AnalyticsFilterActions {
  onWidenPeriod?: (period: AnalyticsPeriod) => void
  onClearCard?: () => void
  onOpenTab?: (tab: AnalyticsTab) => void
}

export function buildSparsePeriodActions(
  actions: AnalyticsFilterActions,
  options: {
    hasCardFilter: boolean
    period: AnalyticsPeriod
  },
) {
  const items: Array<{
    label: string
    onClick?: () => void
  }> = []

  if (options.period !== 'quarter') {
    items.push({
      label: 'Try 90 days',
      onClick: () => actions.onWidenPeriod?.('quarter'),
    })
  }
  if (options.period !== 'year') {
    items.push({
      label: 'Try 1 year',
      onClick: () => actions.onWidenPeriod?.('year'),
    })
  }
  if (options.hasCardFilter) {
    items.push({
      label: 'Clear card filter',
      onClick: () => actions.onClearCard?.(),
    })
  }
  items.push({
    label: 'Check data quality',
    onClick: () => actions.onOpenTab?.('data-quality'),
  })

  return items
}
