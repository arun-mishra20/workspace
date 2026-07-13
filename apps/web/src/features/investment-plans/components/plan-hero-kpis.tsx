import { Flag, PiggyBank, TrendingUp, Wallet } from 'lucide-react'

import { fmtCurrency, fmtXirr } from '@/features/investment-plans/lib/format'

import type { InvestmentPlanProjection } from '@workspace/domain'

interface PlanHeroKpisProps {
  projection: InvestmentPlanProjection
  monthlyInvestment: number
  showReal: boolean
}

export function PlanHeroKpis({ projection, monthlyInvestment, showReal }: PlanHeroKpisProps) {
  const { summary, goals } = projection
  const onTrack = goals.filter((goal) => goal.onTrack).length
  const cards = [
    {
      label: 'Current net worth',
      value: fmtCurrency(summary.currentNetWorth),
      icon: Wallet,
    },
    {
      label: showReal ? 'Projected (today ₹)' : 'Projected net worth',
      value: fmtCurrency(showReal ? summary.finalRealValue : summary.finalNominalValue),
      icon: TrendingUp,
    },
    {
      label: 'Monthly investment',
      value: fmtCurrency(monthlyInvestment),
      icon: PiggyBank,
    },
    {
      label: 'Goals on track',
      value: goals.length === 0 ? 'No goals' : `${onTrack}/${goals.length}`,
      icon: Flag,
    },
  ]

  return (
    <section aria-label="Plan summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="size-4" aria-hidden />
            <span className="text-xs font-medium">{label}</span>
          </div>
          <p className="text-xl font-semibold tabular-nums tracking-tight">{value}</p>
        </div>
      ))}
      <p className="sr-only">
        Projected XIRR {fmtXirr(summary.projectedXirr)}. Weighted assumed annual return{' '}
        {(summary.weightedExpectedAnnualReturnBps / 100).toFixed(1)} percent.
      </p>
    </section>
  )
}
