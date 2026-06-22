import { format, parseISO } from 'date-fns'
import {
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  TrendingDown,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'

import { Link } from 'react-router-dom'
import { appPaths } from '@/config/app-paths'
import { DaySpendExplorerSection } from '@/features/expenses/components/analytics/day-spend-explorer-section'
import { PeriodComparisonSection } from '@/features/expenses/components/analytics/period-comparison-section'
import { RankedSpendListCard } from '@/features/expenses/components/analytics/ranked-spend-list-card'
import { SummaryCard } from '@/features/expenses/components/analytics/summary-card'
import {
  fmtCompact,
  fmtCurrency,
} from '@/features/expenses/components/analytics/analytics-utils'
import { buildExpensesDrillDownUrl } from '@/features/expenses/lib/build-expenses-drill-down-url'
import type { MetricTrendPoint } from '@/lib/metric-trends'
import type {
  AnalyticsPeriod,
  PeriodComparison,
  SpendingSummary,
  SpendingByMerchantItem,
  Transaction,
} from '@workspace/domain'
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
import { Skeleton } from '@workspace/ui/components/ui/skeleton'

interface AnalyticsOverviewTabProps {
  period: AnalyticsPeriod
  selectedCardLast4?: string
  summary?: SpendingSummary
  summaryLoading: boolean
  recentSpentTrend: MetricTrendPoint[]
  recentReceivedTrend: MetricTrendPoint[]
  dailyData: Array<{ date: string; debited: number; credited: number }>
  dailyLoading: boolean
  dailyChartConfig: ChartConfig
  modeChartData: Array<{
    mode: string
    amount: number
    count: number
    chartColor: string
  }>
  modeChartConfig: ChartConfig
  modeLoading: boolean
  selectedDate: string
  onSelectedDateChange: (date: string) => void
  daySummary?: {
    totalSpent: number
    totalReceived: number
    netFlow: number
    transactionCount: number
  }
  daySummaryLoading: boolean
  transactionsTotal: number
  spentTransactions: Transaction[]
  receivedTransactions: Transaction[]
  dayTransactionsLoading: boolean
  periodComparison?: PeriodComparison
  periodComparisonLoading: boolean
  merchants?: SpendingByMerchantItem[]
  merchantsLoading: boolean
}

export function AnalyticsOverviewTab({
  period,
  selectedCardLast4,
  summary,
  summaryLoading,
  recentSpentTrend,
  recentReceivedTrend,
  dailyData,
  dailyLoading,
  dailyChartConfig,
  modeChartData,
  modeChartConfig,
  modeLoading,
  selectedDate,
  onSelectedDateChange,
  daySummary,
  daySummaryLoading,
  transactionsTotal,
  spentTransactions,
  receivedTransactions,
  dayTransactionsLoading,
  periodComparison,
  periodComparisonLoading,
  merchants,
  merchantsLoading,
}: AnalyticsOverviewTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Spent"
          value={summary ? fmtCurrency(summary.totalSpent) : undefined}
          icon={<ArrowDownRight className="size-4 text-destructive" />}
          subtitle={
            summary ? `${summary.transactionCount} transactions` : undefined
          }
          loading={summaryLoading}
          trendData={recentSpentTrend}
          formatTrendValue={fmtCurrency}
        />
        <SummaryCard
          title="Total Received"
          value={summary ? fmtCurrency(summary.totalReceived) : undefined}
          icon={<ArrowUpRight className="size-4 text-chart-2" />}
          subtitle={
            summary ? `Net flow: ${fmtCurrency(summary.netFlow)}` : undefined
          }
          loading={summaryLoading}
          trendData={recentReceivedTrend}
          formatTrendValue={fmtCurrency}
        />
        <SummaryCard
          title="Avg Transaction"
          value={summary ? fmtCurrency(summary.avgTransaction) : undefined}
          icon={<Receipt className="size-4 text-chart-3" />}
          subtitle={summary ? `Top: ${summary.topMerchant}` : undefined}
          loading={summaryLoading}
        />
        <SummaryCard
          title="Pending Review"
          value={summary ? String(summary.reviewPending) : undefined}
          icon={<TrendingDown className="size-4 text-chart-4" />}
          subtitle={
            summary
              ? `Top category: ${summary.topCategory.replace(/_/g, ' ')}`
              : undefined
          }
          loading={summaryLoading}
          footer={
            summary && summary.reviewPending > 0 ? (
              <Link
                to={`${appPaths.auth.expensesEmails.getHref()}?review=true`}
                className="text-xs text-primary hover:underline"
              >
                Open review queue →
              </Link>
            ) : undefined
          }
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Daily Spending</CardTitle>
            <CardDescription>
              Debits &amp; credits per day — click a bar to explore that day
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dailyLoading ? (
              <Skeleton className="h-75 w-full" />
            ) : dailyData.length > 0 ? (
              <ChartContainer config={dailyChartConfig} className="h-75 w-full">
                <BarChart data={dailyData}>
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
                        formatter={(value, name) => (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">
                              {name === 'debited' ? 'Spent' : 'Received'}
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
                  <Bar
                    dataKey="debited"
                    fill="var(--color-debited)"
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(data) => {
                      const payload = data as { date?: string }
                      if (payload.date) {
                        onSelectedDateChange(payload.date)
                      }
                    }}
                  />
                  <Bar
                    dataKey="credited"
                    fill="var(--color-credited)"
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(data) => {
                      const payload = data as { date?: string }
                      if (payload.date) {
                        onSelectedDateChange(payload.date)
                      }
                    }}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No data for this period.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Modes</CardTitle>
            <CardDescription>How you pay</CardDescription>
          </CardHeader>
          <CardContent>
            {modeLoading ? (
              <Skeleton className="mx-auto size-55 rounded-full" />
            ) : modeChartData.length > 0 ? (
              <ChartContainer
                config={modeChartConfig}
                chartType="pie"
                className="mx-auto aspect-square h-65"
              >
                <PieChart>
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
                  <Pie
                    data={modeChartData}
                    dataKey="amount"
                    nameKey="mode"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {modeChartData.map((entry) => (
                      <Cell key={entry.mode} fill={entry.chartColor} />
                    ))}
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="mode" />}
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No mode data.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <DaySpendExplorerSection
        selectedDate={selectedDate}
        onSelectedDateChange={onSelectedDateChange}
        summary={daySummary}
        transactionsTotal={transactionsTotal}
        spentTransactions={spentTransactions}
        receivedTransactions={receivedTransactions}
        loading={daySummaryLoading || dayTransactionsLoading}
        selectedCardLast4={selectedCardLast4}
        viewAllHref={buildExpensesDrillDownUrl({
          date: selectedDate,
          cardLast4: selectedCardLast4,
        })}
      />

      <PeriodComparisonSection
        data={periodComparison}
        loading={periodComparisonLoading}
        period={period}
      />

      <RankedSpendListCard
        title="Top Merchants"
        description="Where you spend the most"
        items={(merchants ?? []).map((m) => ({
          key: m.merchant,
          label: m.merchant,
          amount: m.amount,
          count: m.count,
          href: buildExpensesDrillDownUrl({
            period,
            cardLast4: selectedCardLast4,
            merchant: m.merchant,
          }),
        }))}
        loading={merchantsLoading}
        emptyMessage="No merchant data."
      />
    </div>
  )
}
