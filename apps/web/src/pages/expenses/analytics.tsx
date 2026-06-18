import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useSearchParams } from 'react-router-dom'

import { MainLayout } from '@/components/layouts'
import { useAiPageContext } from '@/features/ai-assistant/ai-assistant-context'
import { buildExpensesAnalyticsPageContext } from '@/features/ai-assistant/adapters/expenses-analytics-context'
import {
  fetchSpendingSummary,
  fetchSpendingSummaryForDate,
  fetchSpendingByCategory,
  fetchSpendingBySubcategory,
  fetchSpendingByMode,
  fetchTopMerchants,
  fetchDailySpending,
  fetchMonthlyTrend,
  fetchSpendingByCard,
  fetchDayOfWeekSpending,
  fetchCategoryTrend,
  fetchPeriodComparison,
  fetchCumulativeSpend,
  fetchSavingsRate,
  fetchCardCategories,
  fetchTopVpas,
  fetchSpendingVelocity,
  fetchMilestoneEtas,
  fetchLargestTransactions,
  type AnalyticsQueryOptions,
} from '@/features/expenses/api/analytics'
import { listExpenses } from '@/features/expenses/api/list-expenses'
import { fetchCreditCards } from '@/features/expenses/api/credit-cards'
import { AnalyticsCardsTab } from '@/features/expenses/components/analytics/analytics-cards-tab'
import { AnalyticsCategoriesTab } from '@/features/expenses/components/analytics/analytics-categories-tab'
import { AnalyticsFilterBar } from '@/features/expenses/components/analytics/analytics-filter-bar'
import { AnalyticsOverviewTab } from '@/features/expenses/components/analytics/analytics-overview-tab'
import { AnalyticsPageHeader } from '@/features/expenses/components/analytics/analytics-page-header'
import { AnalyticsQueryBoundary } from '@/features/expenses/components/analytics/analytics-query-boundary'
import { AnalyticsTrendsTab } from '@/features/expenses/components/analytics/analytics-trends-tab'
import {
  getChartTokenColor,
  isAnalyticsPeriod,
  isAnalyticsTab,
  type AnalyticsTab,
} from '@/features/expenses/components/analytics/analytics-utils'
import { useSyncJob } from '@/features/expenses/hooks/use-sync-job'
import { takeLastMetricTrendPoints } from '@/lib/metric-trends'

import type { AnalyticsPeriod } from '@workspace/domain'

import { type ChartConfig } from '@workspace/ui/components/ui/chart'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/ui/tabs'

const AnalyticsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const periodParam = searchParams.get('period')
  const period: AnalyticsPeriod = isAnalyticsPeriod(periodParam)
    ? periodParam
    : 'month'
  const selectedCard = searchParams.get('card') ?? ''
  const tabParam = searchParams.get('tab')
  const activeTab: AnalyticsTab = isAnalyticsTab(tabParam)
    ? tabParam
    : 'overview'
  const cardOptions: AnalyticsQueryOptions | undefined = selectedCard
    ? { cardLast4: selectedCard }
    : undefined

  const [selectedDate, setSelectedDate] = useState(() =>
    format(new Date(), 'yyyy-MM-dd'),
  )
  const queryClient = useQueryClient()

  const handlePeriodChange = (nextPeriod: AnalyticsPeriod) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (nextPeriod === 'month') {
          next.delete('period')
        } else {
          next.set('period', nextPeriod)
        }
        return next
      },
      { replace: true },
    )
  }

  const handleTabChange = (tab: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (tab === 'overview') {
          next.delete('tab')
        } else {
          next.set('tab', tab)
        }
        return next
      },
      { replace: true },
    )
  }

  const handleCardSelect = (last4: string | undefined) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (last4) {
          next.set('card', last4)
        } else {
          next.delete('card')
        }
        return next
      },
      { replace: true },
    )
  }

  const { startReprocess, job, isSyncing } = useSyncJob({
    onComplete: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', 'analytics'] })
    },
  })

  const isOverview = activeTab === 'overview'
  const isCards = activeTab === 'cards'
  const isCategories = activeTab === 'categories'
  const isTrends = activeTab === 'trends'

  const creditCardsQ = useQuery({
    queryKey: ['expenses', 'credit-cards'],
    queryFn: fetchCreditCards,
  })

  const summaryQ = useQuery({
    queryKey: ['expenses', 'analytics', 'summary', period, selectedCard],
    queryFn: () => fetchSpendingSummary(period, cardOptions),
    enabled: isOverview,
  })

  const categoryQ = useQuery({
    queryKey: ['expenses', 'analytics', 'by-category', period, selectedCard],
    queryFn: () => fetchSpendingByCategory(period, cardOptions),
    enabled: isCategories,
  })

  const subcategoryQ = useQuery({
    queryKey: ['expenses', 'analytics', 'by-subcategory', period, selectedCard],
    queryFn: () => fetchSpendingBySubcategory(period, cardOptions),
    enabled: isCategories,
  })

  const modeQ = useQuery({
    queryKey: ['expenses', 'analytics', 'by-mode', period, selectedCard],
    queryFn: () => fetchSpendingByMode(period, cardOptions),
    enabled: isOverview,
  })

  const merchantQ = useQuery({
    queryKey: ['expenses', 'analytics', 'top-merchants', period, selectedCard],
    queryFn: () => fetchTopMerchants(period, 10, cardOptions),
    enabled: isOverview,
  })

  const dailyQ = useQuery({
    queryKey: ['expenses', 'analytics', 'daily', period, selectedCard],
    queryFn: () => fetchDailySpending(period, cardOptions),
    enabled: isOverview,
  })

  const trendQ = useQuery({
    queryKey: ['expenses', 'analytics', 'monthly-trend'],
    queryFn: () => fetchMonthlyTrend(12),
    enabled: isOverview || isTrends,
  })

  const cardQ = useQuery({
    queryKey: ['expenses', 'analytics', 'by-card', period, selectedCard],
    queryFn: () => fetchSpendingByCard(period, cardOptions),
    enabled: isCards,
  })

  const dayOfWeekQ = useQuery({
    queryKey: ['expenses', 'analytics', 'day-of-week', period, selectedCard],
    queryFn: () => fetchDayOfWeekSpending(period, cardOptions),
    enabled: isTrends,
  })

  const categoryTrendQ = useQuery({
    queryKey: ['expenses', 'analytics', 'category-trend'],
    queryFn: () => fetchCategoryTrend(6),
    enabled: isTrends,
  })

  const periodComparisonQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'period-comparison',
      period,
      selectedCard,
    ],
    queryFn: () => fetchPeriodComparison(period, cardOptions),
    enabled: isOverview,
  })

  const cumulativeQ = useQuery({
    queryKey: ['expenses', 'analytics', 'cumulative', period, selectedCard],
    queryFn: () => fetchCumulativeSpend(period, cardOptions),
    enabled: isTrends,
  })

  const savingsRateQ = useQuery({
    queryKey: ['expenses', 'analytics', 'savings-rate'],
    queryFn: () => fetchSavingsRate(6),
    enabled: isTrends,
  })

  const cardCategoriesQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'card-categories',
      period,
      selectedCard,
    ],
    queryFn: () => fetchCardCategories(period, cardOptions),
    enabled: isCards,
  })

  const topVpasQ = useQuery({
    queryKey: ['expenses', 'analytics', 'top-vpas', period, selectedCard],
    queryFn: () => fetchTopVpas(period, 10, cardOptions),
    enabled: isTrends,
  })

  const velocityQ = useQuery({
    queryKey: ['expenses', 'analytics', 'velocity', period, selectedCard],
    queryFn: () => fetchSpendingVelocity(period, cardOptions),
    enabled: isTrends,
  })

  const milestoneEtaQ = useQuery({
    queryKey: ['expenses', 'analytics', 'milestone-etas'],
    queryFn: () => fetchMilestoneEtas(),
    enabled: isCards,
  })

  const largestQ = useQuery({
    queryKey: ['expenses', 'analytics', 'largest', period, selectedCard],
    queryFn: () => fetchLargestTransactions(period, 10, cardOptions),
    enabled: isTrends,
  })

  const daySummaryQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'day-summary',
      selectedDate,
      selectedCard,
    ],
    queryFn: () => fetchSpendingSummaryForDate(selectedDate, cardOptions),
    enabled: isOverview && Boolean(selectedDate),
  })

  const dayTransactionsQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'day-transactions',
      selectedDate,
      selectedCard,
    ],
    queryFn: () =>
      listExpenses({
        page: 1,
        page_size: 100,
        date_from: selectedDate,
        date_to: selectedDate,
        ...(selectedCard && { card_last4: selectedCard }),
      }),
    enabled: isOverview && Boolean(selectedDate),
  })

  const selectedCardProfile = (creditCardsQ.data ?? []).find(
    (card) => card.cardLast4 === selectedCard,
  )
  const cardFilterLabel = selectedCardProfile
    ? `${selectedCardProfile.cardName} ••${selectedCardProfile.cardLast4}`
    : undefined

  const aiPageContext = useMemo(
    () =>
      buildExpensesAnalyticsPageContext({
        period,
        summary: summaryQ.data,
      }),
    [period, summaryQ.data],
  )

  useAiPageContext(aiPageContext)

  const recentSpentTrend = takeLastMetricTrendPoints(
    (trendQ.data ?? []).map((item) => ({
      label: item.month,
      value: item.debited,
    })),
  )
  const recentReceivedTrend = takeLastMetricTrendPoints(
    (trendQ.data ?? []).map((item) => ({
      label: item.month,
      value: item.credited,
    })),
  )

  const categoryChartData = (categoryQ.data ?? []).map((category, index) => ({
    ...category,
    chartColor: getChartTokenColor(index),
  }))

  const subcategoryChartData = (subcategoryQ.data ?? [])
    .slice(0, 12)
    .map((item, index) => ({
      ...item,
      chartColor: getChartTokenColor(index),
    }))

  const modeChartData = (modeQ.data ?? []).map((mode, index) => ({
    ...mode,
    chartColor: getChartTokenColor(index),
  }))

  const dailyChartConfig: ChartConfig = {
    debited: { label: 'Spent', color: 'var(--color-chart-1)' },
    credited: { label: 'Received', color: 'var(--color-chart-2)' },
  }

  const trendChartConfig: ChartConfig = {
    debited: { label: 'Spent', color: 'var(--color-chart-1)' },
    credited: { label: 'Received', color: 'var(--color-chart-2)' },
    net: { label: 'Net', color: 'var(--color-chart-3)' },
  }

  const categoryChartConfig: ChartConfig = Object.fromEntries(
    categoryChartData.map((c) => [
      c.category,
      { label: c.displayName, color: c.chartColor },
    ]),
  )

  const subcategoryChartConfig: ChartConfig = Object.fromEntries(
    subcategoryChartData.map((item) => [
      item.subcategory,
      { label: item.displayName, color: item.chartColor },
    ]),
  )

  const modeChartConfig: ChartConfig = Object.fromEntries(
    modeChartData.map((m) => [
      m.mode,
      {
        label: m.mode.replace(/_/g, ' '),
        color: m.chartColor,
      },
    ]),
  )

  const dayOfWeekConfig: ChartConfig = {
    amount: { label: 'Spent', color: 'var(--color-chart-1)' },
  }

  const cumulativeConfig: ChartConfig = {
    cumulative: { label: 'Cumulative Spend', color: 'var(--color-chart-1)' },
  }

  const savingsRateConfig: ChartConfig = {
    income: { label: 'Income', color: 'var(--color-chart-2)' },
    expenses: { label: 'Expenses', color: 'var(--color-chart-1)' },
    savingsRate: { label: 'Savings Rate %', color: 'var(--color-chart-3)' },
  }

  const velocityConfig: ChartConfig = {
    velocity: { label: '₹/day (7d avg)', color: 'var(--color-chart-4)' },
  }

  const trendCategories = [
    ...new Set((categoryTrendQ.data ?? []).map((d) => d.category)),
  ]
  const categoryTrendConfig: ChartConfig = Object.fromEntries(
    trendCategories.map((cat, i) => [
      cat,
      {
        label: cat.replace(/_/g, ' '),
        color: getChartTokenColor(i),
      },
    ]),
  )

  const categoryTrendPivoted = (() => {
    const byMonth = new Map<string, Record<string, number>>()
    for (const item of categoryTrendQ.data ?? []) {
      if (!byMonth.has(item.month)) byMonth.set(item.month, {})
      byMonth.get(item.month)![item.category] = item.amount
    }
    return [...byMonth.entries()]
      .map(([month, cats]) => ({ month, ...cats }))
      .sort((a, b) => a.month.localeCompare(b.month))
  })()

  const dayTransactions = dayTransactionsQ.data?.data ?? []
  const spentTransactions = dayTransactions.filter(
    (transaction) => transaction.transactionType === 'debited',
  )
  const receivedTransactions = dayTransactions.filter(
    (transaction) => transaction.transactionType === 'credited',
  )

  const tabError =
    (isOverview && summaryQ.isError) ||
    (isCards && cardQ.isError) ||
    (isCategories && categoryQ.isError) ||
    (isTrends && trendQ.isError)

  const retryTabQueries = () => {
    if (isOverview) void summaryQ.refetch()
    if (isCards) void cardQ.refetch()
    if (isCategories) void categoryQ.refetch()
    if (isTrends) void trendQ.refetch()
  }

  return (
    <MainLayout>
      <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        <AnalyticsPageHeader
          period={period}
          onPeriodChange={handlePeriodChange}
          cards={creditCardsQ.data ?? []}
          selectedCardLast4={selectedCard || undefined}
          onCardSelect={handleCardSelect}
          isSyncing={isSyncing}
          job={job}
          onReprocess={startReprocess}
        />

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="gap-4"
        >
          <div className="sticky top-[var(--analytics-header-offset,9.5rem)] z-10 -mx-4 sm:-mx-6 bg-background/95 px-4 sm:px-6 pb-0 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <TabsList className="h-auto w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="cards">Cards</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>
          </div>

          {/* <AnalyticsFilterBar
            period={period}
            activeTab={activeTab}
            cardLabel={cardFilterLabel}
          /> */}

          <AnalyticsQueryBoundary isError={tabError} onRetry={retryTabQueries}>
            <TabsContent value="overview" className="mt-2">
              <AnalyticsOverviewTab
                period={period}
                selectedCardLast4={selectedCard || undefined}
                summary={summaryQ.data}
                summaryLoading={summaryQ.isLoading}
                recentSpentTrend={recentSpentTrend}
                recentReceivedTrend={recentReceivedTrend}
                dailyData={dailyQ.data ?? []}
                dailyLoading={dailyQ.isLoading}
                dailyChartConfig={dailyChartConfig}
                modeChartData={modeChartData}
                modeChartConfig={modeChartConfig}
                modeLoading={modeQ.isLoading}
                selectedDate={selectedDate}
                onSelectedDateChange={setSelectedDate}
                daySummary={daySummaryQ.data}
                daySummaryLoading={daySummaryQ.isLoading}
                transactionsTotal={dayTransactionsQ.data?.total ?? 0}
                spentTransactions={spentTransactions}
                receivedTransactions={receivedTransactions}
                dayTransactionsLoading={dayTransactionsQ.isLoading}
                periodComparison={periodComparisonQ.data}
                periodComparisonLoading={periodComparisonQ.isLoading}
                merchants={merchantQ.data}
                merchantsLoading={merchantQ.isLoading}
              />
            </TabsContent>

            <TabsContent value="cards" className="mt-2">
              <AnalyticsCardsTab
                cards={creditCardsQ.data ?? []}
                cardSpend={cardQ.data ?? []}
                cardSpendLoading={cardQ.isLoading}
                selectedCardLast4={selectedCard || undefined}
                milestoneEtas={milestoneEtaQ.data}
                cardCategories={cardCategoriesQ.data}
                cardCategoriesLoading={cardCategoriesQ.isLoading}
              />
            </TabsContent>

            <TabsContent value="categories" className="mt-2">
              <AnalyticsCategoriesTab
                period={period}
                selectedCardLast4={selectedCard || undefined}
                categoryChartData={categoryChartData}
                categoryChartConfig={categoryChartConfig}
                categoryLoading={categoryQ.isLoading}
                subcategoryChartData={subcategoryChartData}
                subcategoryChartConfig={subcategoryChartConfig}
                subcategoryLoading={subcategoryQ.isLoading}
              />
            </TabsContent>

            <TabsContent value="trends" className="mt-2">
              <AnalyticsTrendsTab
                period={period}
                selectedCardLast4={selectedCard || undefined}
                monthlyTrend={trendQ.data ?? []}
                monthlyTrendLoading={trendQ.isLoading}
                trendChartConfig={trendChartConfig}
                dayOfWeekData={dayOfWeekQ.data ?? []}
                dayOfWeekLoading={dayOfWeekQ.isLoading}
                dayOfWeekConfig={dayOfWeekConfig}
                cumulativeData={cumulativeQ.data ?? []}
                cumulativeLoading={cumulativeQ.isLoading}
                cumulativeConfig={cumulativeConfig}
                categoryTrendPivoted={categoryTrendPivoted}
                trendCategories={trendCategories}
                categoryTrendConfig={categoryTrendConfig}
                categoryTrendLoading={categoryTrendQ.isLoading}
                savingsRateData={savingsRateQ.data ?? []}
                savingsRateLoading={savingsRateQ.isLoading}
                savingsRateConfig={savingsRateConfig}
                velocityData={velocityQ.data ?? []}
                velocityLoading={velocityQ.isLoading}
                velocityConfig={velocityConfig}
                topVpas={topVpasQ.data}
                topVpasLoading={topVpasQ.isLoading}
                largestTransactions={largestQ.data}
                largestLoading={largestQ.isLoading}
              />
            </TabsContent>
          </AnalyticsQueryBoundary>
        </Tabs>
      </div>
    </MainLayout>
  )
}

export default AnalyticsPage
