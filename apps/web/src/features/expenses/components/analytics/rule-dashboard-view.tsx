import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  TrendingDown,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from 'recharts'

import { SummaryCard } from '@/features/expenses/components/analytics/summary-card'
import { DataTablePagination } from '@/components/data-table'
import {
  ChartCardToolbar,
  type ChartCardView,
} from '@/features/expenses/components/analytics/chart-card-toolbar'
import {
  ChartWithSideLegend,
  type ChartLegendItem,
} from '@/features/expenses/components/analytics/chart-with-side-legend'
import { PeriodComparisonSection } from '@/features/expenses/components/analytics/period-comparison-section'
import { SpendHeatmapCalendar } from '@/features/expenses/components/analytics/spend-heatmap-calendar'
import { TransactionMetadataBadges } from '@/features/expenses/components/analytics/transaction-metadata-badges'
import {
  fmtCompact,
  fmtCurrency,
  getChartTokenColor,
} from '@/features/expenses/components/analytics/analytics-utils'
import { useAnalyticsDrillDown } from '@/features/expenses/hooks/use-analytics-drill-down'
import type {
  AnalyticsPeriod,
  PeriodComparison,
  RuleDashboardAnalytics,
} from '@workspace/domain'
import { Alert, AlertDescription } from '@workspace/ui/components/ui/alert'
import { Badge } from '@workspace/ui/components/ui/badge'
import { Button } from '@workspace/ui/components/ui/button'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/ui/table'

const dailyChartConfig: ChartConfig = {
  debited: { label: 'Spent', color: 'var(--color-chart-1)' },
  credited: { label: 'Received', color: 'var(--color-chart-2)' },
}

interface RuleDashboardViewProps {
  title: string
  analytics?: RuleDashboardAnalytics
  loading: boolean
  error?: boolean
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  startDate: string
  endDate: string
  rangeSummary: string
  selectedCardLast4?: string
  dashboardPeriod?: AnalyticsPeriod
  periodComparison?: PeriodComparison
  periodComparisonLoading?: boolean
  onRefresh: () => void
  onBack: () => void
}

export function RuleDashboardView({
  title,
  analytics,
  loading,
  error,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  startDate,
  endDate,
  rangeSummary,
  selectedCardLast4,
  dashboardPeriod = 'month',
  periodComparison,
  periodComparisonLoading = false,
  onRefresh,
  onBack,
}: RuleDashboardViewProps) {
  const [dailyView, setDailyView] = useState<ChartCardView>('chart')
  const [byRuleView, setByRuleView] = useState<ChartCardView>('chart')
  const drillDown = useAnalyticsDrillDown()
  const navigate = useNavigate()

  const transactionTotal = analytics?.transactions.total ?? 0

  const byRuleChartConfig: ChartConfig = Object.fromEntries(
    (analytics?.byRule ?? []).map((item, index) => [
      item.ruleId,
      { label: item.name, color: getChartTokenColor(index) },
    ]),
  )

  const byRuleLegendItems: ChartLegendItem[] = (analytics?.byRule ?? []).map(
    (item, index) => ({
      key: item.ruleId,
      label: item.name,
      amount: item.amount,
      color: getChartTokenColor(index),
    }),
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={onBack}>
            ← Back to dashboards
          </Button>
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="flex flex-wrap gap-1.5">
            {analytics?.rules.map((rule) => (
              <Badge key={rule.id} variant="secondary">
                {rule.name}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {format(parseISO(startDate), 'dd MMM yyyy')} –{' '}
            {format(parseISO(endDate), 'dd MMM yyyy')}
            {' · '}
            <span className="font-medium text-foreground">{rangeSummary}</span>
          </p>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Refresh
          </Button>
        </div>
      </div>

      {analytics?.missingRuleIds && analytics.missingRuleIds.length > 0 ? (
        <Alert>
          <AlertDescription>
            Some saved rules no longer exist and were skipped.
          </AlertDescription>
        </Alert>
      ) : null}

      {analytics?.truncated ? (
        <Alert>
          <AlertDescription>
            Results are limited to the first 10,000 transactions in this date range.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>Failed to load dashboard analytics.</AlertDescription>
        </Alert>
      ) : null}

      {periodComparison || periodComparisonLoading ? (
        <PeriodComparisonSection
          data={periodComparison}
          loading={periodComparisonLoading}
          period={dashboardPeriod}
        />
      ) : null}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total spent"
          value={analytics ? fmtCurrency(analytics.summary.totalSpent) : undefined}
          icon={<ArrowUpRight className="size-4 text-chart-1" />}
          loading={loading}
        />
        <SummaryCard
          title="Total received"
          value={analytics ? fmtCurrency(analytics.summary.totalReceived) : undefined}
          icon={<ArrowDownRight className="size-4 text-chart-2" />}
          loading={loading}
        />
        <SummaryCard
          title="Net flow"
          value={analytics ? fmtCurrency(analytics.summary.netFlow) : undefined}
          icon={<TrendingDown className="size-4 text-chart-3" />}
          loading={loading}
        />
        <SummaryCard
          title="Transactions"
          value={analytics ? String(analytics.summary.transactionCount) : undefined}
          icon={<Receipt className="size-4 text-chart-4" />}
          subtitle={
            analytics
              ? `Avg ${fmtCurrency(analytics.summary.avgTransaction)}`
              : undefined
          }
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base">Daily spend</CardTitle>
                <CardDescription>Matched transactions by day</CardDescription>
              </div>
              <ChartCardToolbar
                view={dailyView}
                onViewChange={setDailyView}
                views={['chart', 'heatmap']}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-56 w-full" />
            ) : (analytics?.daily.length ?? 0) > 0 ? (
              dailyView === 'heatmap' ? (
                <SpendHeatmapCalendar data={analytics!.daily} metric="debited" />
              ) : (
                <ChartContainer config={dailyChartConfig} className="h-56 w-full">
                  <BarChart data={analytics!.daily}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => format(parseISO(value), 'dd MMM')}
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
                          void navigate(
                            drillDown({
                              date: payload.date,
                              cardLast4: selectedCardLast4,
                            }),
                          )
                        }
                      }}
                    />
                    <Bar dataKey="credited" fill="var(--color-credited)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No matching transactions in this range.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base">Contribution by rule</CardTitle>
                <CardDescription>Overlap allowed — totals are deduped above</CardDescription>
              </div>
              <ChartCardToolbar
                view={byRuleView}
                onViewChange={setByRuleView}
                views={['chart', 'radial']}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-56 w-full" />
            ) : (analytics?.byRule.length ?? 0) > 0 ? (
              byRuleView === 'radial' ? (
                <ChartWithSideLegend items={byRuleLegendItems}>
                  <ChartContainer
                    config={byRuleChartConfig}
                    className="mx-auto aspect-square h-56 w-full"
                  >
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="15%"
                      outerRadius="90%"
                      data={analytics!.byRule.map((item, index) => ({
                        ...item,
                        label: item.name,
                        fill: getChartTokenColor(index),
                      }))}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, _name, item) => (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">
                                  {item.payload?.name ?? item.name}
                                </span>
                                <span className="font-mono font-medium tabular-nums">
                                  {fmtCurrency(Number(value))}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <RadialBar dataKey="amount" background cornerRadius={4} />
                    </RadialBarChart>
                  </ChartContainer>
                </ChartWithSideLegend>
              ) : (
                <ChartContainer config={byRuleChartConfig} className="h-56 w-full">
                  <BarChart
                    data={analytics!.byRule.map((item) => ({
                      ...item,
                      label: item.name,
                    }))}
                    layout="vertical"
                    margin={{ left: 8 }}
                  >
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickFormatter={fmtCompact} fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={100}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => fmtCurrency(Number(value))}
                        />
                      }
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {analytics!.byRule.map((item, index) => (
                        <Cell key={item.ruleId} fill={getChartTokenColor(index)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No rule matches yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transactions</CardTitle>
          <CardDescription>
            {analytics
              ? `${analytics.transactions.total} matching transactions`
              : 'Matched transactions'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (analytics?.transactions.data.length ?? 0) > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Rules</TableHead>
                      <TableHead>Metadata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics!.transactions.data.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(parseISO(txn.transactionDate), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="max-w-48 truncate text-sm">
                          {txn.merchant}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">
                          {fmtCurrency(txn.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {txn.matchedRuleNames.map((name) => (
                              <Badge key={name} variant="outline" className="text-[10px]">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TransactionMetadataBadges transaction={txn} compact />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <DataTablePagination
                page={page}
                pageSize={pageSize}
                totalItems={transactionTotal}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
                itemLabel="transactions"
              />
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No transactions matched the selected rules in this date range.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
