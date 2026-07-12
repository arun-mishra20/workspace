import { TrendingUp, Wallet, PiggyBank, Percent, Sparkles } from 'lucide-react'
import type { SummaryMetrics } from '@workspace/domain'
import { fmtCurrency, fmtMultiplier, fmtPercent } from '../lib/format-utils'

interface ProjectionKpiCardsProps {
  summary: SummaryMetrics
  showReal?: boolean
}

const KPI_CONFIG = [
  { key: 'totalInvested' as const, label: 'Total Invested', icon: Wallet },
  { key: 'estimatedReturns' as const, label: 'Estimated Returns', icon: TrendingUp },
  { key: 'finalCorpus' as const, label: 'Final Corpus', icon: PiggyBank },
  { key: 'cagr' as const, label: 'CAGR', icon: Percent },
  { key: 'wealthMultiplier' as const, label: 'Wealth Multiplier', icon: Sparkles },
]

export function ProjectionKpiCards({ summary, showReal }: ProjectionKpiCardsProps) {
  const formatValue = (key: (typeof KPI_CONFIG)[number]['key']): string => {
    switch (key) {
      case 'cagr': {
        return fmtPercent(summary.cagr)
      }
      case 'wealthMultiplier': {
        return fmtMultiplier(summary.wealthMultiplier)
      }
      case 'finalCorpus': {
        return fmtCurrency(showReal ? summary.realFinalCorpus : summary.finalCorpus)
      }
      case 'totalInvested': {
        return fmtCurrency(summary.totalInvested)
      }
      case 'estimatedReturns': {
        return fmtCurrency(summary.estimatedReturns)
      }
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x sm:grid sm:gap-4 sm:grid-cols-2 lg:grid-cols-5 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0">
      {KPI_CONFIG.map(({ key, label, icon: Icon }) => (
        <div
          key={key}
          className="bg-card border rounded-xl p-3 sm:p-4 space-y-1.5 sm:space-y-2 min-w-[140px] snap-start shrink-0 sm:min-w-0 sm:shrink"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            <span className="text-xs font-medium whitespace-nowrap">{label}</span>
          </div>
          <p className="text-lg sm:text-xl font-semibold tabular-nums tracking-tight">
            {formatValue(key)}
          </p>
        </div>
      ))}
    </div>
  )
}

export function ProjectionKpiSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:gap-4 sm:grid-cols-2 lg:grid-cols-5 sm:overflow-visible">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="bg-card border rounded-xl p-4 space-y-2 animate-pulse min-w-[140px] sm:min-w-0"
        >
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-7 w-32 bg-muted rounded" />
        </div>
      ))}
    </div>
  )
}
