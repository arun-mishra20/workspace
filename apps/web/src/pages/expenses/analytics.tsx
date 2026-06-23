import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
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
import { fetchBusAnalytics } from '@/features/expenses/api/bus-analytics'
import { fetchInvestmentAnalytics } from '@/features/expenses/api/investment-analytics'
import {
  fetchClassificationHealth,
  fetchSpendAnomalies,
} from '@/features/expenses/api/classification-health'
import type { AnalyticsFilterActions } from '@/features/expenses/components/analytics/analytics-filter-actions'
import { AnalyticsCardsTab } from '@/features/expenses/components/analytics/analytics-cards-tab'
import { AnalyticsCategoriesTab } from '@/features/expenses/components/analytics/analytics-categories-tab'
import { AnalyticsDataQualityTab } from '@/features/expenses/components/analytics/analytics-data-quality-tab'
import { AnalyticsOverviewTab } from '@/features/expenses/components/analytics/analytics-overview-tab'
import { AnalyticsContextBar } from '@/features/expenses/components/analytics/analytics-context-bar'
import { AnalyticsPageHeader } from '@/features/expenses/components/analytics/analytics-page-header'
import { AnalyticsPatternsTab } from '@/features/expenses/components/analytics/analytics-patterns-tab'
import {
  AnalyticsRulesTab,
  buildRuleSeedFromMerchant,
  type RuleEditorSeed,
} from '@/features/expenses/components/analytics/analytics-rules-tab'
import { AnalyticsDashboardsTab } from '@/features/expenses/components/analytics/analytics-dashboards-tab'
import { AnalyticsQueryBoundary } from '@/features/expenses/components/analytics/analytics-query-boundary'
import { AnalyticsTrendsTab } from '@/features/expenses/components/analytics/analytics-trends-tab'
import {
  getChartTokenColor,
  isAnalyticsPeriod,
  isAnalyticsTab,
  type AnalyticsTab,
} from '@/features/expenses/components/analytics/analytics-utils'
import { createCategoryChartIcon } from '@/features/expenses/components/category-icon'
import {
  getCategoryColor,
  getSubcategoryParentCategory,
} from '@/features/expenses/lib/category-meta'
import {
  getPaymentModeLabel,
  getPaymentModeMeta,
} from '@/features/expenses/lib/payment-mode-meta'
import { useSyncJob } from '@/features/expenses/hooks/use-sync-job'
import {
  periodLabel,
  periodToDateRange,
} from '@/features/expenses/lib/period-to-date-range'
import {
  resolveSpendExclusionPreferences,
  writeSpendExclusionPreferences,
  buildSpendExclusionSearchParams,
  type SpendExclusionPreferences,
} from '@/features/expenses/lib/analytics-spend-view'
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
  const spendExclusions = resolveSpendExclusionPreferences(searchParams)

  const analyticsOptions = useMemo<AnalyticsQueryOptions>(
    () => ({
      ...(selectedCard ? { cardLast4: selectedCard } : {}),
      spendExclusions,
    }),
    [selectedCard, spendExclusions],
  )

  const dashboardPeriodParam = searchParams.get('dashboardPeriod')
  const dashboardPeriod: AnalyticsPeriod = isAnalyticsPeriod(
    dashboardPeriodParam,
  )
    ? dashboardPeriodParam
    : 'month'

  const dashboardRangeCustom =
    searchParams.get('dashboardRange') === 'custom' ||
    (searchParams.has('from') && searchParams.has('to'))

  const dashboardDateRange = useMemo(
    () => periodToDateRange(dashboardPeriod),
    [dashboardPeriod],
  )

  const dashboardStartDate =
    searchParams.get('from') ?? dashboardDateRange.startDate
  const dashboardEndDate = searchParams.get('to') ?? dashboardDateRange.endDate

  const effectiveDashboardRange = useMemo(() => {
    if (dashboardRangeCustom) {
      return { startDate: dashboardStartDate, endDate: dashboardEndDate }
    }
    return dashboardDateRange
  }, [
    dashboardRangeCustom,
    dashboardStartDate,
    dashboardEndDate,
    dashboardDateRange,
  ])

  const dashboardRangeSummary = useMemo(() => {
    if (dashboardRangeCustom) {
      return `${format(parseISO(dashboardStartDate), 'dd MMM yyyy')} – ${format(parseISO(dashboardEndDate), 'dd MMM yyyy')}`
    }
    return periodLabel(dashboardPeriod)
  }, [
    dashboardEndDate,
    dashboardPeriod,
    dashboardRangeCustom,
    dashboardStartDate,
  ])

  const today = format(new Date(), 'yyyy-MM-dd')
  const selectedDate = searchParams.get('date') ?? today

  const handleSelectedDateChange = (date: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (date === today) {
          next.delete('date')
        } else {
          next.set('date', date)
        }
        return next
      },
      { replace: true },
    )
  }

  const [ruleSeed, setRuleSeed] = useState<RuleEditorSeed | null>(null)
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

  const openRulesTabWithSeed = (seed: RuleEditorSeed) => {
    setRuleSeed(seed)
    handleTabChange('rules')
  }

  const handleSpendExclusionsChange = (
    nextSpendExclusions: SpendExclusionPreferences,
  ) => {
    writeSpendExclusionPreferences(nextSpendExclusions)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('spendExclusions')
        for (const [key, value] of Object.entries(
          buildSpendExclusionSearchParams(nextSpendExclusions),
        )) {
          next.set(key, value)
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

  const handleDashboardPeriodChange = (nextPeriod: AnalyticsPeriod) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (nextPeriod === 'month') {
          next.delete('dashboardPeriod')
        } else {
          next.set('dashboardPeriod', nextPeriod)
        }
        next.delete('dashboardRange')
        next.delete('from')
        next.delete('to')
        return next
      },
      { replace: true },
    )
  }

  const handleDashboardCustomRangeApply = (from: string, to: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('dashboardRange', 'custom')
        next.set('from', from)
        next.set('to', to)
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
  const isDataQuality = activeTab === 'data-quality'
  const isDashboards = activeTab === 'dashboards'
  const isPatterns = activeTab === 'patterns'

  const comparisonPeriod =
    isDashboards && !dashboardRangeCustom ? dashboardPeriod : period

  const filterActions: AnalyticsFilterActions = {
    onWidenPeriod: handlePeriodChange,
    onClearCard: () => handleCardSelect(undefined),
    onOpenTab: handleTabChange,
  }

  const creditCardsQ = useQuery({
    queryKey: ['expenses', 'credit-cards'],
    queryFn: fetchCreditCards,
  })

  const summaryQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'summary',
      period,
      selectedCard,
      spendExclusions,
    ],
    queryFn: () => fetchSpendingSummary(period, analyticsOptions),
    enabled: isOverview,
  })

  const categoryQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'by-category',
      period,
      selectedCard,
      spendExclusions,
    ],
    queryFn: () => fetchSpendingByCategory(period, analyticsOptions),
    enabled: isCategories,
  })

  const subcategoryQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'by-subcategory',
      period,
      selectedCard,
      spendExclusions,
    ],
    queryFn: () => fetchSpendingBySubcategory(period, analyticsOptions),
    enabled: isCategories,
  })

  const modeQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'by-mode',
      period,
      selectedCard,
      spendExclusions,
    ],
    queryFn: () => fetchSpendingByMode(period, analyticsOptions),
    enabled: isOverview,
  })

  const merchantQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'top-merchants',
      period,
      selectedCard,
      spendExclusions,
    ],
    queryFn: () => fetchTopMerchants(period, 10, analyticsOptions),
    enabled: isOverview,
  })

  const dailyQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'daily',
      period,
      selectedCard,
      spendExclusions,
    ],
    queryFn: () => fetchDailySpending(period, analyticsOptions),
    enabled: isOverview,
  })

  const trendQ = useQuery({
    queryKey: ['expenses', 'analytics', 'monthly-trend', spendExclusions],
    queryFn: () => fetchMonthlyTrend(12, analyticsOptions),
    enabled: isOverview || isTrends,
  })

  const cardQ = useQuery({
    queryKey: ['expenses', 'analytics', 'by-card', period, selectedCard],
    queryFn: () => fetchSpendingByCard(period, analyticsOptions),
    enabled: isCards,
  })

  const dayOfWeekQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'day-of-week',
      period,
      selectedCard,
      spendExclusions,
    ],
    queryFn: () => fetchDayOfWeekSpending(period, analyticsOptions),
    enabled: isTrends,
  })

  const categoryTrendQ = useQuery({
    queryKey: ['expenses', 'analytics', 'category-trend', spendExclusions],
    queryFn: () => fetchCategoryTrend(6, analyticsOptions),
    enabled: isTrends,
  })

  const periodComparisonQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'period-comparison',
      comparisonPeriod,
      selectedCard,
      spendExclusions,
    ],
    queryFn: () => fetchPeriodComparison(comparisonPeriod, analyticsOptions),
    enabled:
      isOverview ||
      isTrends ||
      isCategories ||
      (isDashboards && !dashboardRangeCustom),
  })

  const cumulativeQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'cumulative',
      period,
      selectedCard,
      spendExclusions,
    ],
    queryFn: () => fetchCumulativeSpend(period, analyticsOptions),
    enabled: isTrends,
  })

  const savingsRateQ = useQuery({
    queryKey: ['expenses', 'analytics', 'savings-rate', spendExclusions],
    queryFn: () => fetchSavingsRate(6, analyticsOptions),
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
    queryFn: () => fetchCardCategories(period, analyticsOptions),
    enabled: isCards,
  })

  const topVpasQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'top-vpas',
      period,
      selectedCard,
      spendExclusions,
    ],
    queryFn: () => fetchTopVpas(period, 10, analyticsOptions),
    enabled: isTrends,
  })

  const velocityQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'velocity',
      period,
      selectedCard,
      spendExclusions,
    ],
    queryFn: () => fetchSpendingVelocity(period, analyticsOptions),
    enabled: isTrends,
  })

  const milestoneEtaQ = useQuery({
    queryKey: ['expenses', 'analytics', 'milestone-etas'],
    queryFn: () => fetchMilestoneEtas(),
    enabled: isCards,
  })

  const largestQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'largest',
      period,
      selectedCard,
      spendExclusions,
    ],
    queryFn: () => fetchLargestTransactions(period, 10, analyticsOptions),
    enabled: isTrends,
  })

  const classificationHealthQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'classification-health',
      period,
      selectedCard,
    ],
    queryFn: () => fetchClassificationHealth(period, analyticsOptions),
    enabled: isDataQuality,
  })

  const spendAnomaliesQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'spend-anomalies',
      period,
      selectedCard,
      spendExclusions,
    ],
    queryFn: () => fetchSpendAnomalies(period, analyticsOptions),
    enabled: isDataQuality,
  })

  const busAnalyticsQ = useQuery({
    queryKey: ['expenses', 'analytics', 'bus', period],
    queryFn: () => fetchBusAnalytics(period),
    enabled: isPatterns,
  })

  const investmentAnalyticsQ = useQuery({
    queryKey: ['expenses', 'analytics', 'investment', period],
    queryFn: () => fetchInvestmentAnalytics(period),
    enabled: isPatterns,
  })

  const daySummaryQ = useQuery({
    queryKey: [
      'expenses',
      'analytics',
      'day-summary',
      selectedDate,
      selectedCard,
      spendExclusions,
    ],
    queryFn: () => fetchSpendingSummaryForDate(selectedDate, analyticsOptions),
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
    chartColor: category.color ?? getCategoryColor(category.category, index),
  }))

  const subcategoryChartData = (subcategoryQ.data ?? [])
    .slice(0, 12)
    .map((item, index) => {
      const parentCategory = getSubcategoryParentCategory(item.subcategory)
      return {
        ...item,
        chartColor: parentCategory
          ? getCategoryColor(parentCategory, index)
          : getChartTokenColor(index),
      }
    })

  const modeChartData = (modeQ.data ?? []).map((mode, index) => {
    const meta = getPaymentModeMeta(mode.mode, index)
    return {
      ...mode,
      chartColor: meta.color,
      displayLabel: meta.label,
    }
  })

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
      {
        label: c.displayName,
        color: c.chartColor,
        icon: createCategoryChartIcon(c.category),
      },
    ]),
  )

  const subcategoryChartConfig: ChartConfig = Object.fromEntries(
    subcategoryChartData.map((item) => [
      `${item.category}:${item.subcategory}`,
      { label: item.displayName, color: item.chartColor },
    ]),
  )

  const modeChartConfig: ChartConfig = Object.fromEntries(
    modeChartData.map((m, index) => {
      const meta = getPaymentModeMeta(m.mode, index)
      return [
        m.mode,
        {
          label: m.displayLabel ?? getPaymentModeLabel(m.mode),
          color: m.chartColor,
          icon: meta.icon,
        },
      ]
    }),
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
    (isOverview &&
      (summaryQ.isError ||
        dailyQ.isError ||
        modeQ.isError ||
        merchantQ.isError ||
        periodComparisonQ.isError ||
        daySummaryQ.isError ||
        dayTransactionsQ.isError)) ||
    (isCards &&
      (cardQ.isError || milestoneEtaQ.isError || cardCategoriesQ.isError)) ||
    (isCategories &&
      (categoryQ.isError ||
        subcategoryQ.isError ||
        periodComparisonQ.isError)) ||
    (isTrends &&
      (trendQ.isError ||
        dayOfWeekQ.isError ||
        cumulativeQ.isError ||
        categoryTrendQ.isError ||
        savingsRateQ.isError ||
        velocityQ.isError ||
        topVpasQ.isError ||
        largestQ.isError ||
        periodComparisonQ.isError)) ||
    (isDataQuality &&
      (classificationHealthQ.isError || spendAnomaliesQ.isError)) ||
    (isPatterns && (busAnalyticsQ.isError || investmentAnalyticsQ.isError)) ||
    (isDashboards && !dashboardRangeCustom && periodComparisonQ.isError)

  const retryTabQueries = () => {
    if (isOverview) {
      void summaryQ.refetch()
      void dailyQ.refetch()
      void modeQ.refetch()
      void merchantQ.refetch()
      void periodComparisonQ.refetch()
      void daySummaryQ.refetch()
      void dayTransactionsQ.refetch()
    }
    if (isCards) {
      void cardQ.refetch()
      void milestoneEtaQ.refetch()
      void cardCategoriesQ.refetch()
    }
    if (isCategories) {
      void categoryQ.refetch()
      void subcategoryQ.refetch()
      void periodComparisonQ.refetch()
    }
    if (isTrends) {
      void trendQ.refetch()
      void dayOfWeekQ.refetch()
      void cumulativeQ.refetch()
      void categoryTrendQ.refetch()
      void savingsRateQ.refetch()
      void velocityQ.refetch()
      void topVpasQ.refetch()
      void largestQ.refetch()
      void periodComparisonQ.refetch()
    }
    if (isDataQuality) {
      void classificationHealthQ.refetch()
      void spendAnomaliesQ.refetch()
    }
    if (isPatterns) {
      void busAnalyticsQ.refetch()
      void investmentAnalyticsQ.refetch()
    }
    if (isDashboards && !dashboardRangeCustom) {
      void periodComparisonQ.refetch()
    }
  }

  return (
    <MainLayout>
      <div className="flex flex-1 flex-col p-4 sm:p-6">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="gap-4"
        >
          <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 bg-background/95 px-4 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <AnalyticsPageHeader
              isSyncing={isSyncing}
              job={job}
              onReprocess={startReprocess}
            />

            <TabsList className="h-auto w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="cards">Cards</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="data-quality">Data Quality</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
            </TabsList>

            <div className="py-3">
              <AnalyticsContextBar
                activeTab={activeTab}
                period={period}
                onPeriodChange={handlePeriodChange}
                cards={creditCardsQ.data ?? []}
                selectedCardLast4={selectedCard || undefined}
                onCardSelect={handleCardSelect}
                spendExclusions={spendExclusions}
                onSpendExclusionsChange={handleSpendExclusionsChange}
                dashboardPeriod={dashboardPeriod}
                onDashboardPeriodChange={handleDashboardPeriodChange}
                dashboardRangeCustom={dashboardRangeCustom}
                dashboardStartDate={dashboardStartDate}
                dashboardEndDate={dashboardEndDate}
                onDashboardCustomRangeApply={handleDashboardCustomRangeApply}
              />
            </div>
          </div>

          <AnalyticsQueryBoundary isError={tabError} onRetry={retryTabQueries}>
            <TabsContent value="overview" className="mt-2">
              <AnalyticsOverviewTab
                period={period}
                selectedCardLast4={selectedCard || undefined}
                spendExclusions={spendExclusions}
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
                onSelectedDateChange={handleSelectedDateChange}
                filterActions={filterActions}
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
                periodComparison={periodComparisonQ.data}
                periodComparisonLoading={periodComparisonQ.isLoading}
                filterActions={filterActions}
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
                periodComparison={periodComparisonQ.data}
                periodComparisonLoading={periodComparisonQ.isLoading}
                filterActions={filterActions}
              />
            </TabsContent>

            <TabsContent value="data-quality" className="mt-2">
              <AnalyticsDataQualityTab
                period={period}
                selectedCardLast4={selectedCard || undefined}
                health={classificationHealthQ.data}
                healthLoading={classificationHealthQ.isLoading}
                anomalies={spendAnomaliesQ.data}
                anomaliesLoading={spendAnomaliesQ.isLoading}
                filterActions={filterActions}
                onCreateRuleForMerchant={(merchant) =>
                  openRulesTabWithSeed(buildRuleSeedFromMerchant(merchant))
                }
              />
            </TabsContent>

            <TabsContent value="rules" className="mt-2">
              <AnalyticsRulesTab
                seed={ruleSeed}
                onSeedConsumed={() => setRuleSeed(null)}
              />
            </TabsContent>

            <TabsContent value="patterns" className="mt-2">
              <AnalyticsPatternsTab
                period={period}
                busData={busAnalyticsQ.data}
                busLoading={busAnalyticsQ.isLoading}
                investmentData={investmentAnalyticsQ.data}
                investmentLoading={investmentAnalyticsQ.isLoading}
                filterActions={filterActions}
              />
            </TabsContent>

            <TabsContent value="dashboards" className="mt-2">
              <AnalyticsDashboardsTab
                selectedCardLast4={selectedCard || undefined}
                startDate={effectiveDashboardRange.startDate}
                endDate={effectiveDashboardRange.endDate}
                rangeSummary={dashboardRangeSummary}
                dashboardPeriod={dashboardPeriod}
                dashboardRangeCustom={dashboardRangeCustom}
                periodComparison={periodComparisonQ.data}
                periodComparisonLoading={periodComparisonQ.isLoading}
              />
            </TabsContent>
          </AnalyticsQueryBoundary>
        </Tabs>
      </div>
    </MainLayout>
  )
}

export default AnalyticsPage
