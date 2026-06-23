import type { AnalyticsPeriod, CreditCardProfile } from '@workspace/domain'
import { format, parseISO } from 'date-fns'
import { MoreHorizontal, X } from 'lucide-react'

import { CreditCardFilter } from '@/features/expenses/components/credit-card-filter'
import { DashboardDateRangeFilter } from '@/features/expenses/components/analytics/dashboard-date-range-filter'
import {
  PERIODS,
  type AnalyticsTab,
} from '@/features/expenses/components/analytics/analytics-utils'
import {
  countActiveSpendExclusions,
  formatSpendExclusionSummary,
  type SpendExclusionPreferences,
} from '@/features/expenses/lib/analytics-spend-view'
import { periodLabel } from '@/features/expenses/lib/period-to-date-range'
import { Badge } from '@workspace/ui/components/ui/badge'
import { Button } from '@workspace/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/ui/dropdown-menu'
import { Label } from '@workspace/ui/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/ui/select'
import { Switch } from '@workspace/ui/components/ui/switch'

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
  spendExclusions: SpendExclusionPreferences
  onSpendExclusionsChange: (preferences: SpendExclusionPreferences) => void
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
  spendExclusions,
  onSpendExclusionsChange,
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

  const spendExclusionControls = (
    <div className="flex items-center gap-1 rounded-md border bg-background px-2 py-1.5">
      <span className="hidden text-xs text-muted-foreground sm:inline">
        {formatSpendExclusionSummary(spendExclusions)}
      </span>
      {countActiveSpendExclusions(spendExclusions) > 0 ? (
        <Badge variant="secondary" className="text-xs sm:hidden">
          {countActiveSpendExclusions(spendExclusions)} excluded
        </Badge>
      ) : (
        <Badge variant="outline" className="text-xs sm:hidden">
          All included
        </Badge>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Adjust spend exclusions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Exclude from spend totals</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="flex items-center justify-between gap-3 px-2 py-2">
            <div className="space-y-0.5">
              <Label htmlFor="exclude-cc-bills" className="text-sm font-normal">
                Credit card bill payments
              </Label>
              <p className="text-xs text-muted-foreground">
                Bank debits that pay your card bill
              </p>
            </div>
            <Switch
              id="exclude-cc-bills"
              checked={spendExclusions.excludeCreditCardBills}
              onCheckedChange={(checked) =>
                onSpendExclusionsChange({
                  ...spendExclusions,
                  excludeCreditCardBills: checked,
                })}
            />
          </div>
          <div className="flex items-center justify-between gap-3 px-2 py-2">
            <div className="space-y-0.5">
              <Label htmlFor="exclude-self-transfers" className="text-sm font-normal">
                Personal transfer (self_transfer)
              </Label>
              <p className="text-xs text-muted-foreground">
                Transfers between your own accounts
              </p>
            </div>
            <Switch
              id="exclude-self-transfers"
              checked={spendExclusions.excludeSelfTransfers}
              onCheckedChange={(checked) =>
                onSpendExclusionsChange({
                  ...spendExclusions,
                  excludeSelfTransfers: checked,
                })}
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

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

      {spendExclusionControls}

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
        {' · '}
        {formatSpendExclusionSummary(spendExclusions)}
      </p>
    </div>
  )
}
