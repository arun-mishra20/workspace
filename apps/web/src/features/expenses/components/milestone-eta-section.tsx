import { useEffect, useMemo, useState } from 'react'
import type { CreditCardProfile, MilestoneEta } from '@workspace/domain'
import { format, parseISO } from 'date-fns'
import groupBy from 'lodash/groupBy'
import { Target } from 'lucide-react'

import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import { CreditCardTile } from '@/features/expenses/components/credit-card-tile'
import { cn } from '@/lib/utils'
import { Badge } from '@workspace/ui/components/ui/badge'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import { Separator } from '@workspace/ui/components/ui/separator'

interface MilestoneEtaSectionProps {
  etas: MilestoneEta[]
  cards: CreditCardProfile[]
  headerSelectedCardLast4?: string
}

function partitionCardsWithMilestones(
  cards: CreditCardProfile[],
  etasByCard: Record<string, MilestoneEta[]>,
) {
  const last4WithEtas = new Set(Object.keys(etasByCard))
  const withMilestones = cards.filter((card) =>
    last4WithEtas.has(card.cardLast4),
  )
  return {
    active: withMilestones.filter((card) => card.status !== 'upgraded'),
    archived: withMilestones.filter((card) => card.status === 'upgraded'),
  }
}

function CardMilestoneTab({
  card,
  isSelected,
  milestoneCount,
  onSelect,
}: {
  card: CreditCardProfile
  isSelected: boolean
  milestoneCount: number
  onSelect: () => void
}) {
  const isArchived = card.status === 'upgraded'

  return (
    <Button
      type="button"
      role="tab"
      aria-selected={isSelected}
      variant={isSelected ? 'default' : 'outline'}
      size="sm"
      className={cn(
        'h-auto shrink-0 gap-2 px-2.5 py-2',
        !isSelected && 'bg-background',
        isArchived && !isSelected && 'opacity-80',
      )}
      onClick={onSelect}
    >
      <CreditCardTile card={card} compact />
      <span className="flex flex-col items-start gap-0.5 text-left">
        <span className="max-w-28 truncate text-xs font-medium leading-none">
          {card.cardName}
        </span>
        <span className="text-[10px] opacity-80">••{card.cardLast4}</span>
      </span>
      <Badge
        variant={isSelected ? 'secondary' : 'outline'}
        className="h-5 min-w-5 px-1.5 text-[10px] tabular-nums"
      >
        {milestoneCount}
      </Badge>
    </Button>
  )
}

function formatPeriodDate(value: string) {
  try {
    return format(parseISO(value), 'dd MMM yyyy')
  } catch {
    return value
  }
}

export function MilestoneEtaSection({
  etas,
  cards,
  headerSelectedCardLast4,
}: MilestoneEtaSectionProps) {
  const etasByCard = useMemo(() => groupBy(etas, 'cardLast4'), [etas])

  const { active, archived } = useMemo(
    () => partitionCardsWithMilestones(cards, etasByCard),
    [cards, etasByCard],
  )

  const cardsWithMilestones = useMemo(
    () => [...active, ...archived],
    [active, archived],
  )

  const [selectedLast4, setSelectedLast4] = useState<string | undefined>()

  useEffect(() => {
    if (cardsWithMilestones.length === 0) return

    if (
      headerSelectedCardLast4 &&
      cardsWithMilestones.some(
        (card) => card.cardLast4 === headerSelectedCardLast4,
      )
    ) {
      setSelectedLast4(headerSelectedCardLast4)
      return
    }

    const stillValid = cardsWithMilestones.some(
      (card) => card.cardLast4 === selectedLast4,
    )
    if (!selectedLast4 || !stillValid) {
      setSelectedLast4(cardsWithMilestones[0]!.cardLast4)
    }
  }, [cardsWithMilestones, headerSelectedCardLast4, selectedLast4])

  if (etas.length === 0 || cardsWithMilestones.length === 0) return null

  const selectedCard = cardsWithMilestones.find(
    (card) => card.cardLast4 === selectedLast4,
  )
  const visibleEtas = selectedLast4 ? (etasByCard[selectedLast4] ?? []) : []
  const periodSample = visibleEtas[0]

  const successorCard = selectedCard?.upgradedTo
    ? cards.find((card) => card.cardLast4 === selectedCard.upgradedTo)
    : undefined

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="size-4 text-muted-foreground" />
          <div>
            <CardTitle className="text-base">Milestone ETA Forecast</CardTitle>
            <CardDescription>
              Predicted completion based on current spend rate
            </CardDescription>
          </div>
        </div>
        <Separator className="w-full mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="tablist"
          aria-label="Credit cards with milestones"
          className="space-y-3"
        >
          {active.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {active.map((card) => (
                <CardMilestoneTab
                  key={card.cardLast4}
                  card={card}
                  isSelected={card.cardLast4 === selectedLast4}
                  milestoneCount={etasByCard[card.cardLast4]?.length ?? 0}
                  onSelect={() => setSelectedLast4(card.cardLast4)}
                />
              ))}
            </div>
          )}

          {archived.length > 0 && (
            <div className="space-y-2">
              <p className="px-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Archived
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {archived.map((card) => (
                  <CardMilestoneTab
                    key={card.cardLast4}
                    card={card}
                    isSelected={card.cardLast4 === selectedLast4}
                    milestoneCount={etasByCard[card.cardLast4]?.length ?? 0}
                    onSelect={() => setSelectedLast4(card.cardLast4)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedCard && periodSample && (
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              Membership period:{' '}
            </span>
            ends {formatPeriodDate(periodSample.periodEnd)}
            {' · '}
            {periodSample.daysLeftInPeriod} days left
          </div>
        )}

        {selectedCard && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {selectedCard.status === 'upgraded' && (
              <Badge variant="secondary" className="text-[10px]">
                Upgraded · not in use
              </Badge>
            )}
            {successorCard && (
              <span>
                Replaced by {successorCard.cardName} ••{successorCard.cardLast4}
              </span>
            )}
            {selectedCard.cardTier && (
              <Badge variant="outline" className="text-[10px]">
                {selectedCard.cardTier}
              </Badge>
            )}
            {selectedCard.network && <span>{selectedCard.network}</span>}
            {selectedCard.annualFee != null && (
              <span>Annual fee: {fmtCurrency(selectedCard.annualFee)}</span>
            )}
          </div>
        )}

        <div
          role="tabpanel"
          className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visibleEtas.map((eta) => (
            <MilestoneEtaCard key={`${eta.cardLast4}-${eta.id}`} eta={eta} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function MilestoneEtaCard({ eta }: { eta: MilestoneEta }) {
  const pctColor =
    eta.percentage >= 100
      ? 'var(--color-chart-2)'
      : eta.onTrack
        ? 'var(--color-chart-4)'
        : 'var(--color-chart-1)'

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{eta.description}</p>
        <span
          className="shrink-0 text-lg font-bold tabular-nums"
          style={{ color: pctColor }}
        >
          {eta.percentage.toFixed(0)}%
        </span>
      </div>

      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, eta.percentage)}%`,
            backgroundColor: pctColor,
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {fmtCurrency(eta.currentSpend)} / {fmtCurrency(eta.targetAmount)}
        </span>
        <span className="tabular-nums">{fmtCurrency(eta.dailyRate)}/day</span>
      </div>

      <div className="text-[10px] text-muted-foreground">
        Period ends {formatPeriodDate(eta.periodEnd)} · {eta.daysLeftInPeriod}{' '}
        days left
      </div>

      <div className="flex items-center justify-between text-xs">
        {eta.percentage >= 100 ? (
          <span
            className="font-medium"
            style={{ color: 'var(--color-chart-2)' }}
          >
            ✓ Milestone reached!
          </span>
        ) : eta.estimatedCompletionDate ? (
          <span className="text-muted-foreground">
            ETA: {formatPeriodDate(eta.estimatedCompletionDate)}
          </span>
        ) : (
          <span className="text-muted-foreground">
            Need {fmtCurrency(eta.requiredDailyRate ?? 0)}/day by{' '}
            {formatPeriodDate(eta.periodEnd)}
          </span>
        )}

        {eta.percentage < 100 && (
          <Badge
            variant={eta.onTrack ? 'secondary' : 'destructive'}
            className="text-[10px]"
          >
            {eta.onTrack
              ? `${eta.daysRemaining}d to go`
              : `${eta.daysLeftInPeriod}d left in period`}
          </Badge>
        )}
      </div>
    </div>
  )
}
