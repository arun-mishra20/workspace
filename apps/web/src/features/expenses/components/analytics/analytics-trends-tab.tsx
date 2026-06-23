import { useState } from 'react'
import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns'
import { Gauge, Layers, PiggyBank, Receipt, TrendingUp } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from 'recharts'

import { AnalyticsEmptyHint } from '@/features/expenses/components/analytics/analytics-empty-hint'
import {
  buildSparsePeriodActions,
  type AnalyticsFilterActions,
} from '@/features/expenses/components/analytics/analytics-filter-actions'
import { PeriodComparisonSection } from '@/features/expenses/components/analytics/period-comparison-section'
import {
  ChartCardToolbar,
  type ChartCardView,
} from '@/features/expenses/components/analytics/chart-card-toolbar'
import {
  fmtCompact,
  fmtCurrency,
  getChartTokenColor,
} from '@/features/expenses/components/analytics/analytics-utils'
import { RankedSpendListCard } from '@/features/expenses/components/analytics/ranked-spend-list-card'
import { TransactionCategoryTile } from '@/features/expenses/components/transaction-category-tile'
import { getPaymentModeMeta } from '@/features/expenses/lib/payment-mode-meta'
import { TransactionMetadataBadges } from '@/features/expenses/components/analytics/transaction-metadata-badges'
import { useAnalyticsDrillDown } from '@/features/expenses/hooks/use-analytics-drill-down'
import type {
  AnalyticsPeriod,
  LargestTransactionItem,
  PeriodComparison,
  TopVpaItem,
} from '@workspace/domain'
import { Badge } from '@workspace/ui/components/ui/badge'
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@workspace/ui/components/ui/chart'
import { Separator } from '@workspace/ui/components/ui/separator'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'

interface AnalyticsTrendsTabProps {
  period: AnalyticsPeriod
  selectedCardLast4?: string
  monthlyTrend: Array<{
    month: string
    debited: number
    credited: number
    net: number
  }>
  monthlyTrendLoading: boolean
  trendChartConfig: ChartConfig
  dayOfWeekData: Array<{ dayName: string; amount: number }>
  dayOfWeekLoading: boolean
  dayOfWeekConfig: ChartConfig
  cumulativeData: Array<{ date: string; cumulative: number }>
  cumulativeLoading: boolean
  cumulativeConfig: ChartConfig
  categoryTrendPivoted: Array<Record<string, string | number>>
  trendCategories: string[]
  categoryTrendConfig: ChartConfig
  categoryTrendLoading: boolean
  savingsRateData: Array<{
    month: string
    income: number
    expenses: number
    savingsRate: number
  }>
  savingsRateLoading: boolean
  savingsRateConfig: ChartConfig
  velocityData: Array<{ date: string; velocity: number }>
  velocityLoading: boolean
  velocityConfig: ChartConfig
  topVpas?: TopVpaItem[]
  topVpasLoading: boolean
  largestTransactions?: LargestTransactionItem[]
  largestLoading: boolean
  periodComparison?: PeriodComparison
  periodComparisonLoading: boolean
  filterActions?: AnalyticsFilterActions
}

export function AnalyticsTrendsTab({
  period,
  selectedCardLast4,
  monthlyTrend,
  monthlyTrendLoading,
  trendChartConfig,
  dayOfWeekData,
  dayOfWeekLoading,
  dayOfWeekConfig,
  cumulativeData,
  cumulativeLoading,
  cumulativeConfig,
  categoryTrendPivoted,
  trendCategories,
  categoryTrendConfig,
  categoryTrendLoading,
  savingsRateData,
  savingsRateLoading,
  savingsRateConfig,
  velocityData,
  velocityLoading,
  velocityConfig,
  topVpas,
  topVpasLoading,
  largestTransactions,
  largestLoading,
  periodComparison,
  periodComparisonLoading,
  filterActions,
}: AnalyticsTrendsTabProps) {
  const [dayOfWeekView, setDayOfWeekView] = useState<ChartCardView>('chart')
  const drillDown = useAnalyticsDrillDown()
  const navigate = useNavigate()

  const sparseActions = buildSparsePeriodActions(filterActions ?? {}, {
    hasCardFilter: selectedCardLast4 != null,
    period,
  })

  const drillDownMonth = (month: string) => {
    const monthStart = parseISO(`${month}-01`)
    return drillDown({
      cardLast4: selectedCardLast4,
      dateFrom: format(startOfMonth(monthStart), 'yyyy-MM-dd'),
      dateTo: format(endOfMonth(monthStart), 'yyyy-MM-dd'),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PeriodComparisonSection
        data={periodComparison}
        loading={periodComparisonLoading}
        period={period}
      />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Monthly Trend</CardTitle>
            <CardDescription>Last 12 months overview</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyTrendLoading ? (
              <Skeleton className="h-75 w-full" />
            ) : monthlyTrend.length > 0 ? (
              <ChartContainer config={trendChartConfig} className="h-75 w-full">
                <LineChart
                  data={monthlyTrend}
                  onClick={(state) => {
                    const activePayload = (
                      state as {
                        activePayload?: Array<{ payload?: { month?: string } }>
                      }
                    ).activePayload
                    const month = activePayload?.[0]?.payload?.month
                    if (month) {
                      void navigate(drillDownMonth(month))
                    }
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(v: string) => {
                      try {
                        return format(parseISO(`${v}-01`), 'MMM yy')
                      } catch {
                        return v
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
                  <ChartTooltip
                    wrapperStyle={{ zIndex: 100 }}
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">
                              {name === 'debited'
                                ? 'Spent'
                                : name === 'credited'
                                  ? 'Received'
                                  : 'Net'}
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {fmtCurrency(Number(value))}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="debited"
                    stroke="var(--color-debited)"
                    strokeWidth={2}
                    dot={{ r: 3, cursor: 'pointer' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="credited"
                    stroke="var(--color-credited)"
                    strokeWidth={2}
                    dot={{ r: 3, cursor: 'pointer' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="var(--color-net)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <AnalyticsEmptyHint
                title="No trend data yet."
                actions={sparseActions}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">
                    Day-of-Week Spending
                  </CardTitle>
                  <CardDescription>When do you spend the most?</CardDescription>
                </div>
              </div>
              <ChartCardToolbar
                view={dayOfWeekView}
                onViewChange={setDayOfWeekView}
                views={['chart', 'radar']}
              />
            </div>
            <Separator className="w-full mt-2" />
          </CardHeader>
          <CardContent>
            {dayOfWeekLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : dayOfWeekData.length > 0 ? (
              dayOfWeekView === 'radar' ? (
                <ChartContainer config={dayOfWeekConfig} className="h-60 w-full">
                  <RadarChart data={dayOfWeekData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dayName" tick={{ fontSize: 11 }} />
                    <ChartTooltip
                      wrapperStyle={{ zIndex: 100 }}
                      content={
                        <ChartTooltipContent
                          formatter={(value) => (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">
                                Amount Spent
                              </span>
                              <span className="font-mono font-medium tabular-nums">
                                {fmtCurrency(Number(value))}
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Radar
                      dataKey="amount"
                      stroke="var(--color-chart-1)"
                      fill="var(--color-chart-1)"
                      fillOpacity={0.45}
                    />
                  </RadarChart>
                </ChartContainer>
              ) : (
                <ChartContainer config={dayOfWeekConfig} className="h-60 w-full">
                  <BarChart data={dayOfWeekData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="dayName"
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
                    <ChartTooltip
                      wrapperStyle={{ zIndex: 100 }}
                      content={
                        <ChartTooltipContent
                          formatter={(value) => (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">
                                Amount Spent
                              </span>
                              <span className="font-mono font-medium tabular-nums">
                                {fmtCurrency(Number(value))}
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Bar
                      dataKey="amount"
                      fill="var(--color-chart-1)"
                      radius={[4, 4, 0, 0]}
                    >
                      {dayOfWeekData.map((entry) => {
                        const maxAmt = Math.max(
                          ...dayOfWeekData.map((d) => d.amount),
                        )
                        const opacity =
                          maxAmt > 0 ? 0.4 + (entry.amount / maxAmt) * 0.6 : 0.5
                        return (
                          <Cell
                            key={entry.dayName}
                            fill="var(--color-chart-1)"
                            fillOpacity={opacity}
                          />
                        )
                      })}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )
            ) : (
              <AnalyticsEmptyHint
                title="No day-of-week data for this period."
                actions={sparseActions}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Cumulative Spend</CardTitle>
                <CardDescription>Running total over the period</CardDescription>
              </div>
            </div>
            <Separator className="w-full mt-2" />
          </CardHeader>
          <CardContent>
            {cumulativeLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : cumulativeData.length > 0 ? (
              <ChartContainer config={cumulativeConfig} className="h-60 w-full">
                <AreaChart
                  data={cumulativeData}
                  onClick={(state) => {
                    const activePayload = (
                      state as {
                        activePayload?: Array<{ payload?: { date?: string } }>
                      }
                    ).activePayload
                    const date = activePayload?.[0]?.payload?.date
                    if (date) {
                      void navigate(
                        drillDown({
                          date,
                          cardLast4: selectedCardLast4,
                        }),
                      )
                    }
                  }}
                >
                  <defs>
                    <linearGradient
                      id="cumulativeFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-chart-1)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-chart-1)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => {
                      try {
                        return format(parseISO(v), 'dd MMM')
                      } catch {
                        return v
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
                  <ChartTooltip
                    wrapperStyle={{ zIndex: 100 }}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">
                              Cumulative Spend
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {fmtCurrency(Number(value))}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="var(--color-chart-1)"
                    fill="url(#cumulativeFill)"
                    strokeWidth={2}
                    activeDot={{ r: 5, cursor: 'pointer' }}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <AnalyticsEmptyHint
                title="No cumulative spend data for this period."
                actions={sparseActions}
              />
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Category Trend (6m)</CardTitle>
                <CardDescription>Category spending over time</CardDescription>
              </div>
            </div>
            <Separator className="w-full mt-2" />
          </CardHeader>
          <CardContent>
            {categoryTrendLoading ? (
              <Skeleton className="h-75 w-full" />
            ) : categoryTrendPivoted.length > 0 ? (
              <ChartContainer
                config={categoryTrendConfig}
                className="h-75 w-full"
              >
                <LineChart data={categoryTrendPivoted}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(v: string) => {
                      try {
                        return format(parseISO(`${v}-01`), 'MMM yy')
                      } catch {
                        return v
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
                  <ChartTooltip
                    wrapperStyle={{ zIndex: 100 }}
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">
                              {String(name).replace(/_/g, ' ')}
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {fmtCurrency(Number(value))}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  {trendCategories.map((cat, i) => (
                    <Line
                      key={cat}
                      type="monotone"
                      dataKey={cat}
                      stroke={getChartTokenColor(i)}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
            ) : (
              <AnalyticsEmptyHint
                title="Not enough data for category trends."
                actions={sparseActions}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PiggyBank className="size-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Savings Rate</CardTitle>
                <CardDescription>Income vs expenses over time</CardDescription>
              </div>
            </div>
            <Separator className="w-full mt-2" />
          </CardHeader>
          <CardContent>
            {savingsRateLoading ? (
              <Skeleton className="h-75 w-full" />
            ) : savingsRateData.length > 0 ? (
              <ChartContainer
                config={savingsRateConfig}
                className="h-75 w-full"
              >
                <ComposedChart data={savingsRateData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(v: string) => {
                      try {
                        return format(parseISO(`${v}-01`), 'MMM')
                      } catch {
                        return v
                      }
                    }}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={fmtCompact}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                    fontSize={12}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(v: number) => `${v}%`}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    fontSize={12}
                  />
                  <ChartTooltip
                    wrapperStyle={{ zIndex: 100 }}
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">
                              {name === 'savingsRate'
                                ? 'Savings Rate'
                                : name === 'income'
                                  ? 'Income'
                                  : 'Expenses'}
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {name === 'savingsRate'
                                ? `${Number(value).toFixed(1)}%`
                                : fmtCurrency(Number(value))}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    yAxisId="left"
                    dataKey="income"
                    fill="var(--color-chart-2)"
                    radius={[4, 4, 0, 0]}
                    fillOpacity={0.7}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="expenses"
                    fill="var(--color-chart-1)"
                    radius={[4, 4, 0, 0]}
                    fillOpacity={0.7}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="savingsRate"
                    stroke="var(--color-chart-3)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ChartContainer>
            ) : (
              <AnalyticsEmptyHint
                title="Not enough months for savings rate."
                actions={sparseActions}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gauge className="size-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Spending Velocity</CardTitle>
                <CardDescription>
                  7-day rolling average spend per day
                </CardDescription>
              </div>
            </div>
            <Separator className="w-full mt-2" />
          </CardHeader>
          <CardContent>
            {velocityLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : velocityData.length > 0 ? (
              <ChartContainer config={velocityConfig} className="h-60 w-full">
                <AreaChart data={velocityData}>
                  <defs>
                    <linearGradient
                      id="velocityFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-chart-4)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-chart-4)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => {
                      try {
                        return format(parseISO(v), 'dd MMM')
                      } catch {
                        return v
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
                  <ChartTooltip
                    wrapperStyle={{ zIndex: 100 }}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">
                              Avg. Spend
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {fmtCurrency(Number(value))}/day
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="velocity"
                    stroke="var(--color-chart-4)"
                    fill="url(#velocityFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <AnalyticsEmptyHint
                title="Not enough data for spending velocity."
                actions={sparseActions}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <RankedSpendListCard
        title="Top UPI Payees"
        description="Most-paid VPA addresses"
        items={(topVpas ?? []).map((v) => {
          const upiMeta = getPaymentModeMeta('upi')
          const UpiIcon = upiMeta.icon
          return {
            key: v.vpa,
            label: v.merchant,
            sublabel: v.vpa,
            amount: v.amount,
            count: v.count,
            href: drillDown({
              period,
              cardLast4: selectedCardLast4,
              merchant: v.merchant,
            }),
            leading: (
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                aria-hidden
              >
                <UpiIcon className="size-3.5" style={{ color: upiMeta.color }} />
              </span>
            ),
          }
        })}
        loading={topVpasLoading}
        emptyMessage="No UPI data for this period."
        emptyActions={sparseActions}
        barColor="var(--color-chart-3)"
      />

      <Card className="gap-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Largest Transactions</CardTitle>
              <CardDescription>Biggest spends this period</CardDescription>
            </div>
          </div>
          <Separator className="w-full mt-2" />
        </CardHeader>
        <CardContent>
          {largestLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : largestTransactions && largestTransactions.length > 0 ? (
            <div className="divide-y">
              {largestTransactions.map((txn, i) => (
                <Link
                  key={txn.id}
                  to={drillDown({
                    date: txn.transactionDate,
                    cardLast4: selectedCardLast4,
                    merchant: txn.merchant,
                  })}
                  className="flex items-center justify-between py-3 transition-colors hover:bg-muted/50 rounded-sm px-1 -mx-1"
                >
                  <div className="flex items-center gap-3">
                    <TransactionCategoryTile
                      category={txn.category}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-medium">{txn.merchant}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="text-muted-foreground/70">#{i + 1}</span>
                        <span>
                          {(() => {
                            try {
                              return format(
                                parseISO(txn.transactionDate),
                                'dd MMM yyyy',
                              )
                            } catch {
                              return txn.transactionDate
                            }
                          })()}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                        >
                          {txn.displayName}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase"
                        >
                          {txn.transactionMode.replace(/_/g, ' ')}
                        </Badge>
                        {txn.categorizationMethod ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] capitalize"
                          >
                            {txn.categorizationMethod.replace(/_/g, ' ')}
                          </Badge>
                        ) : null}
                        {txn.requiresReview ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Review
                          </Badge>
                        ) : null}
                      </div>
                      {txn.confidence !== undefined ? (
                        <div className="mt-1">
                          <TransactionMetadataBadges
                            transaction={{
                              confidence: txn.confidence,
                              categorizationMethod:
                                txn.categorizationMethod ?? 'default',
                              requiresReview: txn.requiresReview ?? false,
                              vpa: txn.vpa ?? undefined,
                              merchantRaw: undefined,
                              cardLast4: txn.cardLast4 ?? undefined,
                            }}
                            compact
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-destructive">
                    {fmtCurrency(txn.amount)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <AnalyticsEmptyHint
              title="No transactions for this period."
              actions={sparseActions}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
