import { ArrowDown, ArrowUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { Area, AreaChart, XAxis, YAxis } from 'recharts'

import type { MetricTrendPoint } from '@/lib/metric-trends'
import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@workspace/ui/components/ui/chart'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'
import { cn } from '@workspace/ui/lib/utils'

interface OverviewKpiCardProps {
  title: string
  value?: string
  subtitle?: string
  loading?: boolean
  /** Percent change vs prior period (e.g. -8.4). */
  changePercent?: number
  /**
   * When true, a decrease is treated as “good” (e.g. spending down).
   * When false, an increase is “good” (e.g. received up).
   */
  decreaseIsGood?: boolean
  trendData?: MetricTrendPoint[]
  trendColor?: string
}

function formatChangePercent(value: number): string {
  return `${Math.abs(value).toFixed(1)}%`
}

function changeIsGood(
  changePercent: number,
  decreaseIsGood: boolean,
): boolean {
  if (decreaseIsGood) {
    return changePercent <= 0
  }
  return changePercent >= 0
}

export function OverviewKpiCard({
  title,
  value,
  subtitle,
  loading = false,
  changePercent,
  decreaseIsGood = false,
  trendData,
  trendColor = 'var(--color-chart-1)',
}: OverviewKpiCardProps) {
  const chartConfig = {
    value: {
      label: 'Recent trend',
      color: trendColor,
    },
  } satisfies ChartConfig

  const hasTrend = Boolean(trendData && trendData.length > 0)
  const hasChange = changePercent != null && Number.isFinite(changePercent)
  const isDown = hasChange && changePercent < 0
  const isGood =
    hasChange && changeIsGood(changePercent, decreaseIsGood)

  let changeBadge: ReactNode = null
  if (loading) {
    changeBadge = <Skeleton className="h-5 w-14 rounded-full" />
  } else if (hasChange) {
    changeBadge = (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11.5px] font-bold',
          isGood
            ? 'bg-positive/15 text-positive'
            : 'bg-negative/15 text-negative',
        )}
      >
        {isDown ? (
          <ArrowDown className="size-3" aria-hidden />
        ) : (
          <ArrowUp className="size-3" aria-hidden />
        )}
        {formatChangePercent(changePercent)}
      </span>
    )
  }

  const valueContent: ReactNode = loading ? (
    <Skeleton className="h-9 w-36" />
  ) : (
    <div className="font-mono text-[1.8rem] font-semibold tracking-tight tabular-nums text-foreground">
      {value}
    </div>
  )

  let subtitleContent: ReactNode = null
  if (loading) {
    subtitleContent = <Skeleton className="mt-2 h-4 w-48" />
  } else if (subtitle) {
    subtitleContent = (
      <p className="mt-1.5 text-xs text-muted-foreground">{subtitle}</p>
    )
  }

  let sparkline: ReactNode = null
  if (loading) {
    sparkline = <Skeleton className="mt-3 h-11 w-full" />
  } else if (hasTrend) {
    sparkline = (
      <ChartContainer config={chartConfig} className="mt-3 h-11 w-full">
        <AreaChart
          data={trendData}
          margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
        >
          <XAxis dataKey="label" hide />
          <YAxis hide />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={String}
                formatter={(nextValue) => fmtCurrency(Number(nextValue))}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-value)"
            fill="var(--color-value)"
            fillOpacity={0.14}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    )
  }

  return (
    <Card data-slot="overview-kpi-card" className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-[12.5px] font-semibold text-muted-foreground">
          {title}
        </CardTitle>
        {changeBadge}
      </CardHeader>
      <CardContent>
        {valueContent}
        {subtitleContent}
        {sparkline}
      </CardContent>
    </Card>
  )
}
