import { format, parseISO } from 'date-fns'
import {
  Gauge,
  Layers,
  PiggyBank,
  Receipt,
  TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
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
  XAxis,
  YAxis,
} from 'recharts'

import { RankedSpendListCard } from '@/features/expenses/components/analytics/ranked-spend-list-card'
import {
  fmtCompact,
  fmtCurrency,
  getChartTokenColor,
} from '@/features/expenses/components/analytics/analytics-utils'
import { buildExpensesDrillDownUrl } from '@/features/expenses/lib/build-expenses-drill-down-url'
import type {
  AnalyticsPeriod,
  LargestTransactionItem,
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
}: AnalyticsTrendsTabProps) {
  return (
    <div className="flex flex-col gap-6">
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
              <ChartContainer
                config={trendChartConfig}
                className="h-75 w-full"
              >
                <LineChart data={monthlyTrend}>
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
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="credited"
                    stroke="var(--color-credited)"
                    strokeWidth={2}
                    dot={false}
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
              <p className="py-12 text-center text-sm text-muted-foreground">
                No trend data yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Day-of-Week Spending</CardTitle>
                <CardDescription>When do you spend the most?</CardDescription>
              </div>
            </div>
            <Separator className="w-full mt-2" />
          </CardHeader>
          <CardContent>
            {dayOfWeekLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : dayOfWeekData.length > 0 ? (
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
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No data for this period.
              </p>
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
                <AreaChart data={cumulativeData}>
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
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No data for this period.
              </p>
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
              <p className="py-12 text-center text-sm text-muted-foreground">
                Not enough data for trends.
              </p>
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
              <p className="py-12 text-center text-sm text-muted-foreground">
                Not enough months of data.
              </p>
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
              <p className="py-12 text-center text-sm text-muted-foreground">
                Not enough data for velocity.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <RankedSpendListCard
        title="Top UPI Payees"
        description="Most-paid VPA addresses"
        items={(topVpas ?? []).map((v) => ({
          key: v.vpa,
          label: v.merchant,
          sublabel: v.vpa,
          amount: v.amount,
          count: v.count,
          href: buildExpensesDrillDownUrl({
            period,
            cardLast4: selectedCardLast4,
            merchant: v.merchant,
          }),
        }))}
        loading={topVpasLoading}
        emptyMessage="No UPI data available."
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
                  to={buildExpensesDrillDownUrl({
                    date: txn.transactionDate,
                    cardLast4: selectedCardLast4,
                    merchant: txn.merchant,
                  })}
                  className="flex items-center justify-between py-3 transition-colors hover:bg-muted/50 rounded-sm px-1 -mx-1"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{txn.merchant}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-destructive">
                    {fmtCurrency(txn.amount)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No transactions for this period.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
