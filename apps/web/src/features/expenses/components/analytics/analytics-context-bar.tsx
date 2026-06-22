import type { AnalyticsPeriod, CreditCardProfile } from '@workspace/domain'
import { format, parseISO } from 'date-fns'
import { X } from 'lucide-react'

import { CreditCardFilter } from '@/features/expenses/components/credit-card-filter'
import { DashboardDateRangeFilter } from '@/features/expenses/components/analytics/dashboard-date-range-filter'
import {
  PERIODS,
  type AnalyticsTab,
} from '@/features/expenses/components/analytics/analytics-utils'
import { periodLabel } from '@/features/expenses/lib/period-to-date-range'
import { Badge } from '@workspace/ui/components/ui/badge'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/ui/select'

const ANALYTICS_TABS_WITH_PERIOD: AnalyticsTab[] = [
  'overview',
  'cards',
  'categories',
  'trends',
  'data-quality',
  'patterns',
]

interface AnalyticsContextBarProps {
  activeTab: AnalyticsTab
  period: AnalyticsPeriod
  onPeriodChange: (period: AnalyticsPeriod) => void
  cards: CreditCardProfile[]
  selectedCardLast4?: string
  onCardSelect: (last4: string | undefined) => void
  dashboardPeriod: AnalyticsPeriod
  onDashboardPeriodChange: (period: AnalyticsPeriod) => void
  dashboardRangeCustom: boolean
  dashboardStartDate: string
  dashboardEndDate: string
  onDashboardCustomRangeApply: (startDate: string, endDate: string) => void
}

export function AnalyticsContextBar({
  activeTab,
  period,
  onPeriodChange,
  cards,
  selectedCardLast4,
  onCardSelect,
  dashboardPeriod,
  onDashboardPeriodChange,
  dashboardRangeCustom,
  dashboardStartDate,
  dashboardEndDate,
  onDashboardCustomRangeApply,
}: AnalyticsContextBarProps) {
  if (activeTab === 'rules') {
    return null
  }

  const selectedCard = cards.find((card) => card.cardLast4 === selectedCardLast4)
  const periodSummary = PERIODS.find((p) => p.value === period)?.label ?? period

  if (activeTab === 'dashboards') {
    const rangeSummary = dashboardRangeCustom
      ? `${format(parseISO(dashboardStartDate), 'dd MMM yyyy')} – ${format(parseISO(dashboardEndDate), 'dd MMM yyyy')}`
      : periodLabel(dashboardPeriod)

    return (
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center">
        <DashboardDateRangeFilter
          mode={dashboardRangeCustom ? 'custom' : 'preset'}
          period={dashboardPeriod}
          startDate={dashboardStartDate}
          endDate={dashboardEndDate}
          onPresetChange={onDashboardPeriodChange}
          onCustomRangeApply={onDashboardCustomRangeApply}
        />

        <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
          <CreditCardFilter
            cards={cards}
            selectedLast4={selectedCardLast4}
            onSelect={onCardSelect}
          />
          {selectedCard ? (
            <Badge variant="secondary" className="gap-1.5 pl-2.5 pr-1.5 text-xs">
              {selectedCard.cardName} ••{selectedCard.cardLast4}
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-muted"
                aria-label="Clear card filter"
                onClick={() => onCardSelect(undefined)}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Showing:{' '}
            <span className="font-medium text-foreground">{rangeSummary}</span>
            {' · '}
            {selectedCard
              ? `${selectedCard.cardName} ••${selectedCard.cardLast4}`
              : 'All cards'}
          </p>
        </div>
      </div>
    )
  }

  if (!ANALYTICS_TABS_WITH_PERIOD.includes(activeTab)) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="hidden sm:flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p.value}
            variant={period === p.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPeriodChange(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <Select
        value={period}
        onValueChange={(value) => onPeriodChange(value as AnalyticsPeriod)}
      >
        <SelectTrigger className="w-36 sm:hidden" size="sm">
          <SelectValue placeholder="Period" />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <CreditCardFilter
        cards={cards}
        selectedLast4={selectedCardLast4}
        onSelect={onCardSelect}
      />

      {selectedCard ? (
        <Badge variant="secondary" className="h-8 gap-1.5 pl-2.5 pr-1.5 text-xs">
          {selectedCard.cardName} ••{selectedCard.cardLast4}
          <button
            type="button"
            className="rounded-sm p-0.5 hover:bg-muted"
            aria-label="Clear card filter"
            onClick={() => onCardSelect(undefined)}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ) : null}

      <p className="text-xs text-muted-foreground sm:ml-auto">
        Showing: <span className="font-medium text-foreground">{periodSummary}</span>
        {' · '}
        {selectedCard ? `${selectedCard.cardName} ••${selectedCard.cardLast4}` : 'All cards'}
      </p>
    </div>
  )
}
