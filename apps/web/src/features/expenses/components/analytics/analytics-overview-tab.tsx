import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'

import { Link, useNavigate } from 'react-router-dom'
import {
  ChartCardToolbar,
  type ChartCardView,
} from '@/features/expenses/components/analytics/chart-card-toolbar'
import {
  ChartWithSideLegend,
  type ChartLegendItem,
} from '@/features/expenses/components/analytics/chart-with-side-legend'
import { topNWithOther } from '@/features/expenses/components/analytics/chart-data-utils'
import { DaySpendExplorerSection } from '@/features/expenses/components/analytics/day-spend-explorer-section'
import { SpendHeatmapCalendar } from '@/features/expenses/components/analytics/spend-heatmap-calendar'
import { PeriodComparisonSection } from '@/features/expenses/components/analytics/period-comparison-section'
import { RankedSpendListCard } from '@/features/expenses/components/analytics/ranked-spend-list-card'
import { OverviewKpiCard } from '@/features/expenses/components/analytics/overview-kpi-card'
import { NetFlowLedgerCard } from '@/features/expenses/components/analytics/net-flow-ledger-card'
import { AvgTransactionCard } from '@/features/expenses/components/analytics/avg-transaction-card'
import { ReviewQueueBanner } from '@/features/expenses/components/analytics/review-queue-banner'
import {
  fmtCompact,
  fmtCurrency,
} from '@/features/expenses/components/analytics/analytics-utils'
import { AnalyticsEmptyHint } from '@/features/expenses/components/analytics/analytics-empty-hint'
import {
  buildSparsePeriodActions,
  type AnalyticsFilterActions,
} from '@/features/expenses/components/analytics/analytics-filter-actions'
import { useAnalyticsDrillDown } from '@/features/expenses/hooks/use-analytics-drill-down'
import { periodLabel } from '@/features/expenses/lib/period-to-date-range'
import {
  formatSpendExclusionSummary,
  type SpendExclusionPreferences,
} from '@/features/expenses/lib/analytics-spend-view'
import { getPaymentModeMeta } from '@/features/expenses/lib/payment-mode-meta'
import type { MetricTrendPoint } from '@/lib/metric-trends'
import { activateOnKeyboardClick } from '@/lib/keyboard'
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
  spendExclusions?: SpendExclusionPreferences
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
    displayLabel?: string
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
  filterActions?: AnalyticsFilterActions
}

export function AnalyticsOverviewTab({
  period,
  selectedCardLast4,
  spendExclusions = {
    excludeCreditCardBills: true,
    excludeSelfTransfers: true,
    excludePaidForSomeone: true,
  },
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
  filterActions,
}: AnalyticsOverviewTabProps) {
  const drillDown = useAnalyticsDrillDown()
  const navigate = useNavigate()
  const [dailyView, setDailyView] = useState<ChartCardView>('line')
  const [showDebited, setShowDebited] = useState(true)
  const [showCredited, setShowCredited] = useState(true)
  const [modeView, setModeView] = useState<ChartCardView>('chart')
  const [modeTopN, setModeTopN] = useState(6)

  const displayModeData = useMemo(
    () =>
      topNWithOther(modeChartData, modeTopN, (rest) => ({
        mode: '__other__',
        amount: rest.reduce((sum, item) => sum + item.amount, 0),
        count: rest.reduce((sum, item) => sum + item.count, 0),
        chartColor: 'var(--color-muted-foreground)',
      })),
    [modeChartData, modeTopN],
  )

  const sparseActions = buildSparsePeriodActions(filterActions ?? {}, {
    hasCardFilter: selectedCardLast4 != null,
    period,
  })

  const renderDailyContent = () => {
    if (dailyLoading) {
      return <Skeleton className="h-75 w-full" />
    }

    if (dailyData.length === 0) {
      return (
        <AnalyticsEmptyHint
          title="No spending data for this period."
          actions={sparseActions}
        />
      )
    }

    if (dailyView === 'heatmap') {
      return (
        <SpendHeatmapCalendar
          data={dailyData}
          metric="debited"
          onDateSelect={onSelectedDateChange}
        />
      )
    }

    if (dailyView === 'table') {
      return (
        <div className="max-h-75 overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80">
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Date</th>
                {showDebited ? (
                  <th className="px-3 py-2 font-medium text-right">Spent</th>
                ) : null}
                {showCredited ? (
                  <th className="px-3 py-2 font-medium text-right">Received</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {dailyData.map((row) => (
                <tr
                  key={row.date}
                  tabIndex={0}
                  role="button"
                  aria-label={`View spending for ${format(parseISO(row.date), 'dd MMM yyyy')}`}
                  className="cursor-pointer border-b transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  onClick={() => onSelectedDateChange(row.date)}
                  onKeyDown={(event) =>
                    activateOnKeyboardClick(event, () =>
                      onSelectedDateChange(row.date),
                    )
                  }
                >
                  <td className="px-3 py-2">
                    {format(parseISO(row.date), 'dd MMM yyyy')}
                  </td>
                  {showDebited ? (
                    <td className="px-3 py-2 text-right tabular-nums">
                      {fmtCurrency(row.debited)}
                    </td>
                  ) : null}
                  {showCredited ? (
                    <td className="px-3 py-2 text-right tabular-nums">
                      {fmtCurrency(row.credited)}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    const dailyTooltip = (
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
    )

    const dailyXAxis = (
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
    )

    const dailyYAxis = (
      <YAxis
        tickFormatter={fmtCompact}
        tickLine={false}
        axisLine={false}
        width={50}
        fontSize={12}
      />
    )

    const handleDailyChartClick = (state: unknown) => {
      const activePayload = (
        state as {
          activePayload?: Array<{ payload?: { date?: string } }>
        }
      ).activePayload
      const date = activePayload?.[0]?.payload?.date
      if (date) {
        onSelectedDateChange(date)
      }
    }

    if (dailyView === 'line') {
      return (
        <ChartContainer config={dailyChartConfig} className="h-75 w-full">
          <LineChart data={dailyData} onClick={handleDailyChartClick}>
            <CartesianGrid vertical={false} />
            {dailyXAxis}
            {dailyYAxis}
            {dailyTooltip}
            <ChartLegend content={<ChartLegendContent />} />
            {showDebited ? (
              <Line
                type="monotone"
                dataKey="debited"
                stroke="var(--color-debited)"
                strokeWidth={2}
                dot={{ r: 3, cursor: 'pointer' }}
                activeDot={{ r: 5, cursor: 'pointer' }}
              />
            ) : null}
            {showCredited ? (
              <Line
                type="monotone"
                dataKey="credited"
                stroke="var(--color-credited)"
                strokeWidth={2}
                dot={{ r: 3, cursor: 'pointer' }}
                activeDot={{ r: 5, cursor: 'pointer' }}
              />
            ) : null}
          </LineChart>
        </ChartContainer>
      )
    }

    return (
      <ChartContainer config={dailyChartConfig} className="h-75 w-full">
        <BarChart data={dailyData}>
          <CartesianGrid vertical={false} />
          {dailyXAxis}
          {dailyYAxis}
          {dailyTooltip}
          <ChartLegend content={<ChartLegendContent />} />
          {showDebited ? (
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
          ) : null}
          {showCredited ? (
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
          ) : null}
        </BarChart>
      </ChartContainer>
    )
  }

  const renderModeContent = () => {
    if (modeLoading) {
      return <Skeleton className="mx-auto size-55 rounded-full" />
    }

    if (displayModeData.length === 0) {
      return (
        <AnalyticsEmptyHint
          title="No payment mode data for this period."
          actions={sparseActions}
        />
      )
    }

    const modeDrillDown = (mode: string) =>
      drillDown({
        period,
        cardLast4: selectedCardLast4,
        mode,
      })

    if (modeView === 'table') {
      return (
        <div className="divide-y">
          {displayModeData.map((entry) => {
            const meta =
              entry.mode === '__other__' ? null : getPaymentModeMeta(entry.mode)
            const ModeIcon = meta?.icon
            const row = (
              <>
                <div className="flex items-center gap-3">
                  {ModeIcon ? (
                    <ModeIcon
                      className="size-4 shrink-0"
                      style={{ color: entry.chartColor }}
                    />
                  ) : (
                    <div
                      className="size-3 rounded-full"
                      style={{ backgroundColor: entry.chartColor }}
                    />
                  )}
                  <span className="text-sm font-medium capitalize">
                    {entry.mode === '__other__'
                      ? 'Other'
                      : (entry.displayLabel ??
                        meta?.label ??
                        entry.mode.replace(/_/g, ' '))}
                  </span>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {fmtCurrency(entry.amount)}
                </span>
              </>
            )

            if (entry.mode === '__other__') {
              return (
                <div
                  key={entry.mode}
                  className="flex items-center justify-between py-3"
                >
                  {row}
                </div>
              )
            }

            return (
              <Link
                key={entry.mode}
                to={modeDrillDown(entry.mode)}
                className="flex items-center justify-between py-3 transition-colors hover:bg-muted/50"
              >
                {row}
              </Link>
            )
          })}
        </div>
      )
    }

    const modeLegendItems: ChartLegendItem[] = displayModeData.map((entry) => {
      const meta =
        entry.mode === '__other__' ? null : getPaymentModeMeta(entry.mode)
      const ModeIcon = meta?.icon
      return {
        key: entry.mode,
        label:
          entry.mode === '__other__'
            ? 'Other'
            : (entry.displayLabel ??
              meta?.label ??
              entry.mode.replace(/_/g, ' ')),
        amount: entry.amount,
        color: entry.chartColor,
        icon: ModeIcon ? (
          <ModeIcon className="size-3.5" style={{ color: entry.chartColor }} />
        ) : undefined,
        href:
          entry.mode === '__other__' ? undefined : modeDrillDown(entry.mode),
      }
    })

    return (
      <ChartWithSideLegend items={modeLegendItems} chartClassName="max-w-56">
        <ChartContainer
          config={modeChartConfig}
          chartType="pie"
          className="mx-auto aspect-square h-56 w-full"
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
              data={displayModeData}
              dataKey="amount"
              nameKey="mode"
              innerRadius={50}
              outerRadius={88}
              paddingAngle={2}
              cursor="pointer"
              onClick={(_data, index) => {
                const entry = displayModeData[index]
                if (entry && entry.mode !== '__other__') {
                  void navigate(modeDrillDown(entry.mode))
                }
              }}
            >
              {displayModeData.map((entry) => (
                <Cell key={entry.mode} fill={entry.chartColor} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </ChartWithSideLegend>
    )
  }

  const priorWindow = periodLabel(period)
    .replace(/^Last /i, '')
    .toLowerCase()

  const spentChangeSubtitle = (() => {
    if (!summary) return
    const base = `${summary.transactionCount} transactions`
    if (!periodComparison) {
      return `${base} · ${formatSpendExclusionSummary(spendExclusions)}`
    }
    const change = periodComparison.changes.spentChange
    let vsPrior = `same as prior ${priorWindow}`
    if (change < 0) {
      vsPrior = `lower than prior ${priorWindow}`
    } else if (change > 0) {
      vsPrior = `higher than prior ${priorWindow}`
    }
    return `${base} · ${vsPrior}`
  })()

  const receivedChangeSubtitle = (() => {
    if (!summary) return
    if (!periodComparison) {
      return formatSpendExclusionSummary(spendExclusions)
    }
    const change = periodComparison.changes.receivedChange
    if (change > 0) {
      return `higher than prior ${priorWindow}`
    }
    if (change < 0) {
      return `lower than prior ${priorWindow}`
    }
    return `same as prior ${priorWindow}`
  })()

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.15fr]">
        <OverviewKpiCard
          title="Total spent"
          value={summary ? fmtCurrency(summary.totalSpent) : undefined}
          subtitle={spentChangeSubtitle}
          loading={summaryLoading}
          changePercent={periodComparison?.changes.spentChange}
          decreaseIsGood
          trendData={recentSpentTrend}
          trendColor="var(--color-negative)"
        />
        <OverviewKpiCard
          title="Total received"
          value={summary ? fmtCurrency(summary.totalReceived) : undefined}
          subtitle={receivedChangeSubtitle}
          loading={summaryLoading}
          changePercent={periodComparison?.changes.receivedChange}
          trendData={recentReceivedTrend}
          trendColor="var(--color-positive)"
        />
        <NetFlowLedgerCard
          netFlow={summary?.netFlow}
          totalReceived={summary?.totalReceived}
          totalSpent={summary?.totalSpent}
          periodLabel={periodLabel(period)}
          loading={summaryLoading}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_1.6fr]">
        <AvgTransactionCard
          avgTransaction={summary?.avgTransaction}
          transactionCount={summary?.transactionCount}
          topMerchant={summary?.topMerchant}
          loading={summaryLoading}
        />
        <ReviewQueueBanner
          reviewPending={summary?.reviewPending}
          topCategory={summary?.topCategory}
          href={drillDown({
            period,
            cardLast4: selectedCardLast4,
            review: 'true',
          })}
          loading={summaryLoading}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[2.15fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="font-serif text-lg font-semibold tracking-tight">
                  Daily spending
                </CardTitle>
                <CardDescription>
                  Debits and credits per day. Click a point to explore that day.
                </CardDescription>
              </div>
              <ChartCardToolbar
                view={dailyView}
                onViewChange={setDailyView}
                views={['line', 'chart', 'table', 'heatmap']}
                seriesOptions={[
                  { id: 'debited', label: 'Spent', checked: showDebited },
                  { id: 'credited', label: 'Received', checked: showCredited },
                ]}
                onSeriesToggle={(id, checked) => {
                  if (id === 'debited') setShowDebited(checked)
                  if (id === 'credited') setShowCredited(checked)
                }}
              />
            </div>
          </CardHeader>
          <CardContent>{renderDailyContent()}</CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="font-serif text-base font-semibold tracking-tight">
                  Payment modes
                </CardTitle>
                <CardDescription>How you pay</CardDescription>
              </div>
              <ChartCardToolbar
                view={modeView}
                onViewChange={setModeView}
                views={['chart', 'table']}
                showTopN
                topN={modeTopN}
                onTopNChange={setModeTopN}
              />
            </div>
          </CardHeader>
          <CardContent>{renderModeContent()}</CardContent>
        </Card>
      </div>

      <DaySpendExplorerSection
        periodLabel={periodLabel(period)}
        selectedDate={selectedDate}
        onSelectedDateChange={onSelectedDateChange}
        summary={daySummary}
        transactionsTotal={transactionsTotal}
        spentTransactions={spentTransactions}
        receivedTransactions={receivedTransactions}
        loading={daySummaryLoading || dayTransactionsLoading}
        selectedCardLast4={selectedCardLast4}
        viewAllHref={drillDown({
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
          href: drillDown({
            period,
            cardLast4: selectedCardLast4,
            merchant: m.merchant,
          }),
        }))}
        loading={merchantsLoading}
        emptyMessage="No merchant data for this period."
        emptyActions={sparseActions}
      />
    </div>
  )
}
