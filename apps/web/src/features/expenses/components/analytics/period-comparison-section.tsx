import type { AnalyticsPeriod, PeriodComparison } from '@workspace/domain'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import { AnalyticsEmptyHint } from '@/features/expenses/components/analytics/analytics-empty-hint'
import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
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

export function PeriodComparisonSection({
  data,
  loading,
  period,
}: {
  data?: PeriodComparison
  loading: boolean
  period: AnalyticsPeriod
}) {
  const metrics = data
    ? [
        {
          label: 'Total Spent',
          current: data.currentPeriod.totalSpent,
          change: data.changes.spentChange,
          invert: true,
        },
        {
          label: 'Total Received',
          current: data.currentPeriod.totalReceived,
          change: data.changes.receivedChange,
          invert: false,
        },
        {
          label: 'Transaction Count',
          current: data.currentPeriod.transactionCount,
          change: data.changes.countChange,
          invert: false,
          isCurrency: false,
        },
        {
          label: 'Avg Transaction',
          current: data.currentPeriod.avgTransaction,
          change: data.changes.avgChange,
          invert: true,
        },
      ]
    : []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Period Comparison</CardTitle>
        <CardDescription>
          Current {period} vs previous {period}
        </CardDescription>
        <Separator className="w-full mt-2" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-x sm:divide-y-0 divide-border">
            {metrics.map((m, index) => {
              const isPositive = m.change > 0
              const isGood = m.invert ? !isPositive : isPositive
              const isCurrency = m.isCurrency !== false
              const trendClassName = isGood ? 'text-positive' : 'text-negative'

              return (
                <div
                  key={m.label}
                  className={cn(
                    'space-y-1 py-4',
                    index === 0 && 'pt-0 sm:pt-4 sm:pl-0',
                    index === metrics.length - 1 && 'pb-0 sm:pb-4',
                    index > 0 && 'sm:pl-4',
                  )}
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {m.label}
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {isCurrency
                      ? fmtCurrency(m.current)
                      : m.current.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1">
                    {isPositive ? (
                      <ArrowUpRight className={cn('size-3', trendClassName)} />
                    ) : (
                      <ArrowDownRight className={cn('size-3', trendClassName)} />
                    )}
                    <span
                      className={cn(
                        'text-xs font-medium tabular-nums',
                        trendClassName,
                      )}
                    >
                      {Math.abs(m.change).toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">vs prev</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <AnalyticsEmptyHint title="No comparison data for this period." />
        )}
      </CardContent>
    </Card>
  )
}
