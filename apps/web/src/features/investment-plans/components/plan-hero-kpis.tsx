import { format, parseISO } from 'date-fns'
import { Flag, PiggyBank, TrendingUp, Wallet } from 'lucide-react'

import { fmtCurrency } from '@/features/investment-plans/lib/format'
import { cn } from '@/lib/utils'

import type { InvestmentPlanProjection } from '@workspace/domain'

interface PlanHeroKpisProps {
  projection: InvestmentPlanProjection
  monthlyInvestment: number
  showReal: boolean
  startDate?: string
  onAddGoal?: () => void
}

export function PlanHeroKpis({
  projection,
  monthlyInvestment,
  showReal,
  startDate,
  onAddGoal,
}: PlanHeroKpisProps) {
  const { summary, goals, snapshots } = projection
  const onTrack = goals.filter((goal) => goal.onTrack).length
  const finalDate = snapshots[snapshots.length - 1]?.date
  const projectedValue = showReal
    ? summary.finalRealValue
    : summary.finalNominalValue
  const multiple =
    summary.currentNetWorth > 0
      ? projectedValue / summary.currentNetWorth
      : 0

  const asOfLabel = startDate
    ? `as of ${format(parseISO(startDate), 'd MMM yyyy')}`
    : 'current plan balance'

  const projectedSub =
    multiple >= 1 && finalDate
      ? `↑ ${multiple.toFixed(0)}× today's value · by ${format(parseISO(finalDate), 'MMM yyyy')}`
      : finalDate
        ? `by ${format(parseISO(finalDate), 'MMM yyyy')}`
        : showReal
          ? "today's money"
          : 'nominal terms'

  const cards = [
    {
      key: 'current',
      label: 'Current net worth',
      value: fmtCurrency(summary.currentNetWorth),
      sub: asOfLabel,
      icon: Wallet,
      tone: 'primary' as const,
      subTone: 'muted' as const,
    },
    {
      key: 'projected',
      label: showReal ? 'Projected (today ₹)' : 'Projected net worth',
      value: fmtCurrency(projectedValue),
      sub: projectedSub,
      icon: TrendingUp,
      tone: 'primary' as const,
      subTone: 'positive' as const,
    },
    {
      key: 'monthly',
      label: 'Monthly investment',
      value: fmtCurrency(monthlyInvestment),
      sub: 'across all asset contributions',
      icon: PiggyBank,
      tone: 'accent' as const,
      subTone: 'muted' as const,
    },
    {
      key: 'goals',
      label: 'Goals on track',
      value:
        goals.length === 0 ? 'No goals yet' : `${onTrack}/${goals.length}`,
      sub:
        goals.length === 0
          ? 'Add a goal to start tracking →'
          : `${onTrack} on track under the base scenario`,
      icon: Flag,
      tone: 'warn' as const,
      subTone: goals.length === 0 ? ('warn' as const) : ('muted' as const),
      actionable: goals.length === 0,
    },
  ]

  return (
    <section
      aria-label="Plan summary"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map((card) => {
        const Icon = card.icon
        const subClass =
          card.subTone === 'positive'
            ? 'text-positive'
            : card.subTone === 'warn'
              ? 'text-destructive'
              : 'text-muted-foreground'

        return (
          <div
            key={card.key}
            className="rounded-[10px] border border-border bg-card px-5 pt-5 pb-4"
          >
            <div className="mb-4 flex items-center gap-2.5">
              <div
                className={cn(
                  'flex size-8 items-center justify-center rounded-lg',
                  card.tone === 'primary' && 'bg-primary/10 text-primary',
                  card.tone === 'accent' && 'bg-chart-4/15 text-chart-4',
                  card.tone === 'warn' && 'bg-destructive/10 text-destructive',
                )}
              >
                <Icon className="size-4" aria-hidden />
              </div>
              <span className="text-[12.5px] font-medium text-muted-foreground">
                {card.label}
              </span>
            </div>
            <div className="mb-2 font-serif text-[1.75rem] font-semibold tracking-tight tabular-nums">
              {card.value}
            </div>
            {card.actionable && onAddGoal ? (
              <button
                type="button"
                onClick={onAddGoal}
                className={cn(
                  'font-mono text-[11.5px] font-medium underline underline-offset-2',
                  subClass,
                )}
              >
                {card.sub}
              </button>
            ) : (
              <p className={cn('font-mono text-[11.5px]', subClass)}>
                {card.sub}
              </p>
            )}
          </div>
        )
      })}
    </section>
  )
}
