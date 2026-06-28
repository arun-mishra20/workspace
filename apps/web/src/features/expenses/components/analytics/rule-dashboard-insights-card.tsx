import { ArrowDownRight, ArrowUpRight, Lightbulb } from 'lucide-react'

import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import type { RuleDashboardInsights } from '@workspace/domain'
import { Badge } from '@workspace/ui/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import { Separator } from '@workspace/ui/components/ui/separator'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface RuleDashboardInsightsCardProps {
  insights?: RuleDashboardInsights
  loading: boolean
}

export function RuleDashboardInsightsCard({
  insights,
  loading,
}: RuleDashboardInsightsCardProps) {
  const comparison = insights?.primaryComparison
  const isSpendMetric = true
  const isPositive = (comparison?.changePct ?? 0) > 0
  const isGood = isSpendMetric ? !isPositive : isPositive
  const trendClassName = isGood ? 'text-positive' : 'text-negative'
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Spending insights</CardTitle>
            <CardDescription>
              Habit patterns based on the last 12 months of matched spend
            </CardDescription>
          </div>
          {insights ? (
            <Badge variant="secondary">{insights.cadenceLabel}</Badge>
          ) : null}
        </div>
        <Separator className="mt-2 w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : insights ? (
          <>
            {comparison ? (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">{comparison.label}</p>
                <div className="mt-1 flex flex-wrap items-end gap-3">
                  <p className="text-2xl font-semibold tabular-nums">
                    {fmtCurrency(comparison.currentValue)}
                  </p>
                  <div className={cn('flex items-center gap-1 text-sm', trendClassName)}>
                    <TrendIcon className="size-4" />
                    <span className="font-medium tabular-nums">
                      {comparison.changePct > 0 ? '+' : ''}
                      {comparison.changePct}%
                    </span>
                    <span className="text-muted-foreground">
                      vs {comparison.referenceLabel.toLowerCase()} (
                      {fmtCurrency(comparison.referenceValue)})
                    </span>
                  </div>
                </div>
                {insights.daysSinceLastSpend !== undefined ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Last matching spend: {insights.daysSinceLastSpend} day
                    {insights.daysSinceLastSpend === 1 ? '' : 's'} ago
                  </p>
                ) : null}
              </div>
            ) : null}

            {insights.highlights.length > 0 ? (
              <ul className="space-y-2">
                {insights.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-chart-4" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
