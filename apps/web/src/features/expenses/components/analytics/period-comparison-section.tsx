import type { AnalyticsPeriod, PeriodComparison } from '@workspace/domain'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

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
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((m) => {
              const isPositive = m.change > 0
              const isGood = m.invert ? !isPositive : isPositive
              const isCurrency = m.isCurrency !== false
              return (
                <div
                  key={m.label}
                  className="rounded-lg border p-4 space-y-1"
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
                      <ArrowUpRight
                        className={`size-3 ${isGood ? 'text-emerald-500' : 'text-red-500'}`}
                      />
                    ) : (
                      <ArrowDownRight
                        className={`size-3 ${isGood ? 'text-emerald-500' : 'text-red-500'}`}
                      />
                    )}
                    <span
                      className={`text-xs font-medium tabular-nums ${isGood ? 'text-emerald-500' : 'text-red-500'}`}
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
          <p className="py-8 text-center text-sm text-muted-foreground">
            No comparison data.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
