import { format, parseISO } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'

import { AnalyticsEmptyHint } from '@/features/expenses/components/analytics/analytics-empty-hint'
import {
  fmtCompact,
  fmtCurrency,
} from '@/features/expenses/components/analytics/analytics-utils'
import type { RuleDashboardInsights } from '@workspace/domain'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@workspace/ui/components/ui/chart'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'

const monthlyChartConfig: ChartConfig = {
  debited: { label: 'Spent', color: 'var(--color-chart-1)' },
}

interface RuleDashboardMonthlyTrendCardProps {
  insights?: RuleDashboardInsights
  loading: boolean
  startDate: string
  endDate: string
}

function monthInRange(month: string, startDate: string, endDate: string) {
  const rangeStartMonth = startDate.slice(0, 7)
  const rangeEndMonth = endDate.slice(0, 7)

  return month >= rangeStartMonth && month <= rangeEndMonth
}

export function RuleDashboardMonthlyTrendCard({
  insights,
  loading,
  startDate,
  endDate,
}: RuleDashboardMonthlyTrendCardProps) {
  const baselineValue =
    insights?.cadence === 'recurring'
      ? insights.baselines.avgMonthlySpend
      : insights?.baselines.medianMonthlySpend

  const chartData =
    insights?.monthlyTrend.map((item) => ({
      ...item,
      inRange: monthInRange(item.month, startDate, endDate),
    })) ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly trend</CardTitle>
        <CardDescription>
          Rule-matched spend over the last {insights?.lookbackMonths ?? 12} months
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-56 w-full" />
        ) : chartData.length > 0 ? (
          <ChartContainer config={monthlyChartConfig} className="h-56 w-full">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={(value: string) => {
                  try {
                    return format(parseISO(`${value}-01`), 'MMM yy')
                  } catch {
                    return value
                  }
                }}
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                tickFormatter={fmtCompact}
                tickLine={false}
                axisLine={false}
                width={50}
                fontSize={12}
              />
              {baselineValue && baselineValue > 0 ? (
                <ReferenceLine
                  y={baselineValue}
                  stroke="var(--color-muted-foreground)"
                  strokeDasharray="4 4"
                  label={{
                    value:
                      insights?.cadence === 'recurring'
                        ? 'Avg month'
                        : 'Typical month',
                    position: 'insideTopRight',
                    fill: 'var(--color-muted-foreground)',
                    fontSize: 11,
                  }}
                />
              ) : null}
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => fmtCurrency(Number(value))}
                  />
                }
              />
              <Bar dataKey="debited" radius={[4, 4, 0, 0]}>
                {chartData.map((item) => (
                  <Cell
                    key={item.month}
                    fill={
                      item.inRange
                        ? 'var(--color-chart-1)'
                        : 'color-mix(in srgb, var(--color-chart-1) 45%, transparent)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <AnalyticsEmptyHint title="No monthly trend yet for these rules." />
        )}
      </CardContent>
    </Card>
  )
}
