import type { AnalyticsPeriod, CreditCardProfile, SyncJob } from '@workspace/domain'
import { MoreVertical, RotateCw, X } from 'lucide-react'

import { CreditCardFilter } from '@/features/expenses/components/credit-card-filter'
import { PERIODS } from '@/features/expenses/components/analytics/analytics-utils'
import { Badge } from '@workspace/ui/components/ui/badge'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/ui/popover'

interface AnalyticsPageHeaderProps {
  period: AnalyticsPeriod
  onPeriodChange: (period: AnalyticsPeriod) => void
  cards: CreditCardProfile[]
  selectedCardLast4?: string
  onCardSelect: (last4: string | undefined) => void
  isSyncing: boolean
  job?: SyncJob | null
  onReprocess: (force: boolean) => void
}

export function AnalyticsPageHeader({
  period,
  onPeriodChange,
  cards,
  selectedCardLast4,
  onCardSelect,
  isSyncing,
  job,
  onReprocess,
}: AnalyticsPageHeaderProps) {
  const selectedCard = cards.find((card) => card.cardLast4 === selectedCardLast4)

  return (
    <header className="sticky top-0 z-10 -mx-4 sm:-mx-6 border-b bg-background/95 px-4 sm:px-6 pb-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-col gap-4 pt-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.12em] text-muted-foreground">
            Expenses
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Spending patterns, category breakdowns and trends.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <CreditCardFilter
            cards={cards}
            selectedLast4={selectedCardLast4}
            onSelect={onCardSelect}
          />

          {selectedCard && (
            <Badge variant="secondary" className="h-9 gap-1.5 pl-2.5 pr-1.5 text-xs">
              Filtering: {selectedCard.cardName} ••{selectedCard.cardLast4}
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-muted"
                aria-label="Clear card filter"
                onClick={() => onCardSelect(undefined)}
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReprocess(false)}
              disabled={isSyncing}
            >
              <RotateCw className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing && job?.totalEmails
                ? `Reprocessing (${job.processedEmails}/${job.totalEmails})`
                : job?.status === 'completed'
                  ? 'Reprocessed ✓'
                  : 'Reprocess Emails'}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={isSyncing}
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Reprocess options</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-3">
                <Button
                  variant="ghost"
                  className="h-auto w-full justify-start px-2 py-2 text-left whitespace-normal"
                  onClick={() => onReprocess(true)}
                  disabled={isSyncing}
                >
                  <div className="space-y-1">
                    <p className="font-medium">Force refresh all</p>
                    <p className="text-xs text-muted-foreground">
                      Re-parses every stored email, including ones already
                      processed. Use after parser updates.
                    </p>
                  </div>
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </header>
  )
}
