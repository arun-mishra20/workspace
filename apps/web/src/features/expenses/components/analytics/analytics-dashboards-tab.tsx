import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'

import { fetchCategorizationRules } from '@/features/expenses/api/categorization-rules'
import {
  fetchRuleDashboard,
  fetchRuleDashboardAnalytics,
  fetchRuleDashboards,
} from '@/features/expenses/api/rule-dashboards'
import { RuleDashboardBuilder } from '@/features/expenses/components/analytics/rule-dashboard-builder'
import { RuleDashboardView } from '@/features/expenses/components/analytics/rule-dashboard-view'
import { SavedDashboardsList } from '@/features/expenses/components/analytics/saved-dashboards-list'
import { periodToDateRange } from '@/features/expenses/lib/period-to-date-range'
import { readStoredPageSize, writeStoredPageSize } from '@/lib/pagination'
import type {
  AnalyticsPeriod,
  DashboardInlineRule,
  PeriodComparison,
  RuleDashboardListItem,
} from '@workspace/domain'

type DashboardMode = 'library' | 'view'

interface AnalyticsDashboardsTabProps {
  selectedCardLast4?: string
  startDate: string
  endDate: string
  rangeSummary: string
  dashboardPeriod: AnalyticsPeriod
  dashboardRangeCustom: boolean
  periodComparison?: PeriodComparison
  periodComparisonLoading: boolean
}

export function AnalyticsDashboardsTab({
  selectedCardLast4,
  startDate,
  endDate,
  rangeSummary,
  dashboardPeriod,
  dashboardRangeCustom,
  periodComparison,
  periodComparisonLoading,
}: AnalyticsDashboardsTabProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const builderRef = useRef<HTMLDivElement>(null)

  const dashboardParam = searchParams.get('dashboard')
  const rulesParam = searchParams.get('rules')

  const [mode, setMode] = useState<DashboardMode>(
    dashboardParam || rulesParam ? 'view' : 'library',
  )
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>(() =>
    rulesParam ? rulesParam.split(',').filter(Boolean) : [],
  )
  const [inlineRules, setInlineRules] = useState<DashboardInlineRule[]>([])
  const [activeDashboardId, setActiveDashboardId] = useState<string | null>(
    dashboardParam,
  )
  const [editingDashboard, setEditingDashboard] =
    useState<RuleDashboardListItem | null>(null)
  const [viewTitle, setViewTitle] = useState('Custom view')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => readStoredPageSize(25))

  const rulesQ = useQuery({
    queryKey: ['expenses', 'rules'],
    queryFn: fetchCategorizationRules,
  })

  const dashboardsQ = useQuery({
    queryKey: ['expenses', 'rule-dashboards'],
    queryFn: fetchRuleDashboards,
  })

  const savedDashboardQ = useQuery({
    queryKey: ['expenses', 'rule-dashboards', activeDashboardId],
    queryFn: () => fetchRuleDashboard(activeDashboardId!),
    enabled: Boolean(activeDashboardId),
  })

  const activeRuleIds = useMemo(() => {
    if (mode !== 'view') return []
    if (activeDashboardId && savedDashboardQ.data) {
      return savedDashboardQ.data.ruleIds
    }
    return selectedRuleIds
  }, [activeDashboardId, mode, savedDashboardQ.data, selectedRuleIds])

  const activeInlineRules = useMemo(() => {
    if (mode !== 'view') return []
    if (activeDashboardId && savedDashboardQ.data) {
      return savedDashboardQ.data.inlineRules
    }
    return inlineRules
  }, [activeDashboardId, inlineRules, mode, savedDashboardQ.data])

  const hasActiveRules =
    activeRuleIds.length > 0 || activeInlineRules.length > 0

  const analyticsQ = useQuery({
    queryKey: [
      'expenses',
      'rule-dashboards',
      'analytics',
      activeRuleIds,
      activeInlineRules,
      startDate,
      endDate,
      selectedCardLast4,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchRuleDashboardAnalytics({
        ruleIds: activeRuleIds,
        inlineRules: activeInlineRules,
        startDate,
        endDate,
        cardLast4: selectedCardLast4,
        page,
        pageSize,
      }),
    enabled: mode === 'view' && hasActiveRules,
  })

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  useEffect(() => {
    if (dashboardParam) {
      setMode('view')
      setActiveDashboardId(dashboardParam)
      setEditingDashboard(null)
      setPage(1)
    } else if (rulesParam) {
      setMode('view')
      setActiveDashboardId(null)
      setEditingDashboard(null)
      setSelectedRuleIds(rulesParam.split(',').filter(Boolean))
      setViewTitle('Custom view')
      setPage(1)
    }
  }, [dashboardParam, rulesParam])

  useEffect(() => {
    if (savedDashboardQ.data) {
      setViewTitle(savedDashboardQ.data.name)
    }
  }, [savedDashboardQ.data])

  useEffect(() => {
    if (editingDashboard) {
      builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [editingDashboard])

  const syncUrl = (next: {
    dashboard?: string | null
    rules?: string[] | null
  }) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.set('tab', 'dashboards')

        if (next.dashboard) {
          params.set('dashboard', next.dashboard)
          params.delete('rules')
        } else if (next.rules && next.rules.length > 0) {
          params.set('rules', next.rules.join(','))
          params.delete('dashboard')
        } else {
          params.delete('dashboard')
          params.delete('rules')
        }

        return params
      },
      { replace: true },
    )
  }

  const openCustomView = () => {
    setMode('view')
    setActiveDashboardId(null)
    setEditingDashboard(null)
    setViewTitle('Custom view')
    setPage(1)
    syncUrl({ rules: selectedRuleIds })
  }

  const openSavedDashboard = (dashboard: RuleDashboardListItem) => {
    setMode('view')
    setActiveDashboardId(dashboard.id)
    setEditingDashboard(null)
    setViewTitle(dashboard.name)
    setPage(1)
    syncUrl({ dashboard: dashboard.id })
  }

  const editSavedDashboard = (dashboard: RuleDashboardListItem) => {
    setMode('library')
    setActiveDashboardId(null)
    setEditingDashboard(dashboard)
    setSelectedRuleIds(dashboard.ruleIds)
    setInlineRules(dashboard.inlineRules)
    syncUrl({ rules: null, dashboard: null })
  }

  const cancelEdit = () => {
    setEditingDashboard(null)
    setSelectedRuleIds([])
    setInlineRules([])
  }

  const backToLibrary = () => {
    setMode('library')
    setActiveDashboardId(null)
    setEditingDashboard(null)
    setPage(1)
    syncUrl({ dashboard: null, rules: null })
  }

  if (mode === 'view') {
    return (
      <RuleDashboardView
        title={viewTitle}
        analytics={analyticsQ.data}
        globalRules={rulesQ.data ?? []}
        loading={analyticsQ.isLoading || savedDashboardQ.isLoading}
        error={analyticsQ.isError}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          writeStoredPageSize(nextPageSize)
          setPageSize(nextPageSize)
          setPage(1)
        }}
        startDate={startDate}
        endDate={endDate}
        rangeSummary={rangeSummary}
        selectedCardLast4={selectedCardLast4}
        dashboardPeriod={dashboardPeriod}
        periodComparison={
          dashboardRangeCustom ? undefined : periodComparison
        }
        periodComparisonLoading={periodComparisonLoading}
        onRefresh={() => void analyticsQ.refetch()}
        onBack={backToLibrary}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div ref={builderRef}>
        <RuleDashboardBuilder
          rules={rulesQ.data ?? []}
          rulesLoading={rulesQ.isLoading}
          selectedRuleIds={selectedRuleIds}
          onSelectedRuleIdsChange={setSelectedRuleIds}
          inlineRules={inlineRules}
          onInlineRulesChange={setInlineRules}
          onViewDashboard={openCustomView}
          editingDashboardId={editingDashboard?.id}
          editingDashboardName={editingDashboard?.name}
          onCancelEdit={cancelEdit}
          previewDateFrom={startDate}
          previewDateTo={endDate}
        />
      </div>

      <SavedDashboardsList
        dashboards={dashboardsQ.data ?? []}
        loading={dashboardsQ.isLoading}
        globalRules={rulesQ.data ?? []}
        onOpen={openSavedDashboard}
        onEdit={editSavedDashboard}
        editingDashboardId={editingDashboard?.id}
      />
    </div>
  )
}

export function buildDashboardDeepLink(params: {
  ruleIds: string[]
  from: string
  to: string
}) {
  const search = new URLSearchParams()
  search.set('tab', 'dashboards')
  search.set('rules', params.ruleIds.join(','))
  search.set('dashboardRange', 'custom')
  search.set('from', params.from)
  search.set('to', params.to)
  return `?${search.toString()}`
}

export function defaultDashboardDateRange() {
  return periodToDateRange('month')
}
