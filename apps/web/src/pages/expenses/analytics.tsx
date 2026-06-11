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
} from '@/features/expenses/api/analytics'
import { listExpenses } from '@/features/expenses/api/list-expenses'
import { fetchCreditCards } from '@/features/expenses/api/credit-cards'
import { AnalyticsCardsTab } from '@/features/expenses/components/analytics/analytics-cards-tab'
import { AnalyticsCategoriesTab } from '@/features/expenses/components/analytics/analytics-categories-tab'
import { AnalyticsOverviewTab } from '@/features/expenses/components/analytics/analytics-overview-tab'
import { AnalyticsPageHeader } from '@/features/expenses/components/analytics/analytics-page-header'
import { AnalyticsTrendsTab } from '@/features/expenses/components/analytics/analytics-trends-tab'
import {
  getChartTokenColor,
  isAnalyticsTab,
  type AnalyticsTab,
} from '@/features/expenses/components/analytics/analytics-utils'
import { useSyncJob } from '@/features/expenses/hooks/use-sync-job'
import {
  takeLastMetricTrendPoints,
} from '@/lib/metric-trends'

import type { AnalyticsPeriod } from '@workspace/domain'

import {
  type ChartConfig,
} from '@workspace/ui/components/ui/chart'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/ui/tabs'

const AnalyticsPage = () => {
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const [selectedDate, setSelectedDate] = useState(() =>
    format(new Date(), 'yyyy-MM-dd'),
  )
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedCard = searchParams.get('card') ?? ''
  const tabParam = searchParams.get('tab')
  const activeTab: AnalyticsTab = isAnalyticsTab(tabParam) ? tabParam : 'overview'
  const queryClient = useQueryClient()

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

  const summaryQ = useQuery({
    queryKey: ['expenses', 'analytics', 'summary', period],
    queryFn: () => fetchSpendingSummary(period),
  })

  const categoryQ = useQuery({
    queryKey: ['expenses', 'analytics', 'by-category', period],
    queryFn: () => fetchSpendingByCategory(period),
  })

  const subcategoryQ = useQuery({
    queryKey: ['expenses', 'analytics', 'by-subcategory', period],
    queryFn: () => fetchSpendingBySubcategory(period),
  })

  const modeQ = useQuery({
    queryKey: ['expenses', 'analytics', 'by-mode', period],
    queryFn: () => fetchSpendingByMode(period),
  })

  const merchantQ = useQuery({
    queryKey: ['expenses', 'analytics', 'top-merchants', period],
    queryFn: () => fetchTopMerchants(period),
  })

  const dailyQ = useQuery({
    queryKey: ['expenses', 'analytics', 'daily', period],
    queryFn: () => fetchDailySpending(period),
  })

  const trendQ = useQuery({
    queryKey: ['expenses', 'analytics', 'monthly-trend'],
    queryFn: () => fetchMonthlyTrend(12),
  })

  const cardQ = useQuery({
    queryKey: ['expenses', 'analytics', 'by-card', period],
    queryFn: () => fetchSpendingByCard(period),
  })

  const dayOfWeekQ = useQuery({
    queryKey: ['expenses', 'analytics', 'day-of-week', period],
    queryFn: () => fetchDayOfWeekSpending(period),
  })

  const categoryTrendQ = useQuery({
    queryKey: ['expenses', 'analytics', 'category-trend'],
    queryFn: () => fetchCategoryTrend(6),
  })

  const periodComparisonQ = useQuery({
    queryKey: ['expenses', 'analytics', 'period-comparison', period],
    queryFn: () => fetchPeriodComparison(period),
  })

  const cumulativeQ = useQuery({
    queryKey: ['expenses', 'analytics', 'cumulative', period],
    queryFn: () => fetchCumulativeSpend(period),
  })

  const savingsRateQ = useQuery({
    queryKey: ['expenses', 'analytics', 'savings-rate'],
    queryFn: () => fetchSavingsRate(6),
  })

  const cardCategoriesQ = useQuery({
    queryKey: ['expenses', 'analytics', 'card-categories', period],
    queryFn: () => fetchCardCategories(period),
  })

  const topVpasQ = useQuery({
    queryKey: ['expenses', 'analytics', 'top-vpas', period],
    queryFn: () => fetchTopVpas(period, 10),
  })

  const velocityQ = useQuery({
    queryKey: ['expenses', 'analytics', 'velocity', period],
    queryFn: () => fetchSpendingVelocity(period),
  })

  const milestoneEtaQ = useQuery({
    queryKey: ['expenses', 'analytics', 'milestone-etas'],
    queryFn: () => fetchMilestoneEtas(),
  })

  const largestQ = useQuery({
    queryKey: ['expenses', 'analytics', 'largest', period],
    queryFn: () => fetchLargestTransactions(period, 10),
  })

  const creditCardsQ = useQuery({
    queryKey: ['expenses', 'credit-cards'],
    queryFn: fetchCreditCards,
  })

  const daySummaryQ = useQuery({
    queryKey: ['expenses', 'analytics', 'day-summary', selectedDate],
    queryFn: () => fetchSpendingSummaryForDate(selectedDate),
    enabled: Boolean(selectedDate),
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
    enabled: Boolean(selectedDate),
  })

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

  return (
    <MainLayout>
      <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        <AnalyticsPageHeader
          period={period}
          onPeriodChange={setPeriod}
          cards={creditCardsQ.data ?? []}
          selectedCardLast4={selectedCard || undefined}
          onCardSelect={handleCardSelect}
          isSyncing={isSyncing}
          job={job}
          onReprocess={startReprocess}
        />

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cards">Cards</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <AnalyticsOverviewTab
              period={period}
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

          <TabsContent value="cards" className="mt-6">
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

          <TabsContent value="categories" className="mt-6">
            <AnalyticsCategoriesTab
              categoryChartData={categoryChartData}
              categoryChartConfig={categoryChartConfig}
              categoryLoading={categoryQ.isLoading}
              subcategoryChartData={subcategoryChartData}
              subcategoryChartConfig={subcategoryChartConfig}
              subcategoryLoading={subcategoryQ.isLoading}
            />
          </TabsContent>

          <TabsContent value="trends" className="mt-6">
            <AnalyticsTrendsTab
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
        </Tabs>
      </div>
    </MainLayout>
  )
}

export default AnalyticsPage
