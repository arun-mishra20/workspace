import { memo, useCallback, useMemo, useState } from 'react'
import { FormProvider } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@workspace/ui/components/ui/button'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/ui/alert'

import { useRefreshInvestmentPlanSource } from '@/features/investment-plans/api/investment-plans'
import { AssumptionsEditorSheet } from '@/features/investment-plans/components/editors/assumptions-editor-sheet'
import { AssetsEditorSheet } from '@/features/investment-plans/components/editors/assets-editor-sheet'
import { EventsEditorSheet } from '@/features/investment-plans/components/editors/events-editor-sheet'
import { GoalsEditorSheet } from '@/features/investment-plans/components/editors/goals-editor-sheet'
import { PlanGoalRail } from '@/features/investment-plans/components/plan-goal-rail'
import { PlanHeader } from '@/features/investment-plans/components/plan-header'
import { PlanHeroKpis } from '@/features/investment-plans/components/plan-hero-kpis'
import { PlanInsights } from '@/features/investment-plans/components/plan-insights'
import { PlanNetWorthChart } from '@/features/investment-plans/components/plan-net-worth-chart'
import { PlanPortfolioSection } from '@/features/investment-plans/components/plan-portfolio-section'
import { useInvestmentPlanWorkspace } from '@/features/investment-plans/hooks/use-investment-plan-workspace'
import {
  getChartViewMode,
  setChartViewMode,
  type ChartViewMode,
} from '@/features/investment-plans/lib/preferences'
import { countMeaningfulRefreshChanges } from '@/features/investment-plans/lib/refresh-proposal'

import type { InvestmentPlanInput, InvestmentPlanProjection } from '@workspace/domain'

type EditorKey = 'assets' | 'goals' | 'events' | 'assumptions' | null

const MemoPlanHeader = memo(PlanHeader)
const MemoPlanHeroKpis = memo(PlanHeroKpis)
const MemoPlanNetWorthChart = memo(PlanNetWorthChart)
const MemoPlanGoalRail = memo(PlanGoalRail)
const MemoPlanPortfolioSection = memo(PlanPortfolioSection)
const MemoPlanInsights = memo(PlanInsights)

const ProjectionPanels = memo(function ProjectionPanels({
  plan,
  base,
  viewMode,
  onViewModeChange,
}: {
  plan: InvestmentPlanInput
  base: InvestmentPlanProjection
  viewMode: ChartViewMode
  onViewModeChange: (mode: ChartViewMode) => void
}) {
  const monthlyInvestment = useMemo(
    () => plan.assets.reduce((sum, asset) => sum + (asset.monthlyContribution || 0), 0),
    [plan.assets],
  )
  const finalSnapshot = base.snapshots[base.snapshots.length - 1]!

  return (
    <>
      <MemoPlanHeroKpis
        projection={base}
        monthlyInvestment={monthlyInvestment}
        showReal={viewMode === 'real'}
      />
      <MemoPlanNetWorthChart
        projection={base}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
      <MemoPlanGoalRail goals={plan.goals} results={base.goals} />
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <MemoPlanPortfolioSection plan={plan} finalSnapshot={finalSnapshot} />
        <MemoPlanInsights plan={plan} projection={base} />
      </div>
    </>
  )
})

export function InvestmentPlanDashboard() {
  const workspace = useInvestmentPlanWorkspace()
  const refreshMutation = useRefreshInvestmentPlanSource()
  const [editor, setEditor] = useState<EditorKey>(null)
  const [viewMode, setViewMode] = useState<ChartViewMode>(() => getChartViewMode())

  const base = workspace.projection?.base
  const plan = workspace.projectionPlan
  const detailLoading = workspace.detailQuery.isLoading && !workspace.detailQuery.data

  const onViewModeChange = useCallback((mode: ChartViewMode) => {
    setViewMode(mode)
    setChartViewMode(mode)
  }, [])

  const onRefreshSource = useCallback(async () => {
    if (!workspace.selectedPlanId) return
    try {
      const result = await refreshMutation.mutateAsync(workspace.selectedPlanId)
      const changes = countMeaningfulRefreshChanges(result)
      if (changes === 0) {
        toast.message('Source data matches this plan')
        return
      }
      workspace.applyRefreshProposal(result)
      toast.success(`Applied ${changes} categor${changes === 1 ? 'y' : 'ies'} from holdings/principal`, {
        description: 'Review balances in Assets. Autosave will persist via PUT.',
      })
      setEditor('assets')
    } catch {
      toast.error('Could not refresh source data')
    }
  }, [refreshMutation, workspace])

  if (workspace.listQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1360px] space-y-4 px-4 pt-5 sm:px-6 lg:px-10">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (workspace.listQuery.isError) {
    return (
      <div className="mx-auto w-full max-w-[1360px] px-4 pt-5 sm:px-6 lg:px-10">
        <Alert variant="destructive">
          <AlertTitle>Could not load plans</AlertTitle>
          <AlertDescription>
            Check that the API is running and migration 0022 has been applied, then retry.
          </AlertDescription>
        </Alert>
        <Button className="mt-3" type="button" onClick={() => void workspace.listQuery.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  if (workspace.summaries.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-[1360px] flex-col items-center justify-center gap-4 px-4 py-6 text-center sm:px-6 lg:px-10">
        <div className="max-w-md space-y-2">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Projections
          </p>
          <h1 className="font-serif text-3xl font-medium italic tracking-tight text-foreground">
            Create your investment plan
          </h1>
          <p className="text-sm text-muted-foreground">
            Plans persist across devices. Seeded asset categories are ready — set balances, goals, and assumptions next.
          </p>
        </div>
        <Button type="button" onClick={() => void workspace.createPlan()} disabled={workspace.isCreating}>
          Create plan
        </Button>
      </div>
    )
  }

  return (
    <FormProvider {...workspace.form}>
      <div className="mx-auto w-full max-w-[1360px] space-y-6 px-4 pb-8 sm:px-6 lg:px-10">
        <MemoPlanHeader
          summaries={workspace.summaries}
          selectedPlanId={workspace.selectedPlanId}
          saveStatus={workspace.saveStatus}
          onSelectPlan={workspace.selectPlan}
          onCreatePlan={() => void workspace.createPlan()}
          onReload={() => void workspace.reloadRemote()}
          onRefreshSource={() => void onRefreshSource()}
          isCreating={workspace.isCreating}
          isRefreshing={refreshMutation.isPending}
        />

        {workspace.saveStatus === 'conflict' && (
          <Alert variant="destructive">
            <AlertTitle>Revision conflict</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              This plan changed on another device.
              <Button type="button" size="sm" variant="secondary" onClick={() => void workspace.reloadRemote()}>
                Reload latest
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-border bg-card px-3 py-2.5">
          <div className="inline-flex items-center rounded-[9px] border border-border bg-muted p-0.5">
            <Button
              type="button"
              variant={editor === 'assets' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 rounded-md px-3 text-xs font-semibold shadow-none"
              onClick={() => setEditor('assets')}
            >
              Assets
            </Button>
            <Button
              type="button"
              variant={editor === 'goals' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 rounded-md px-3 text-xs font-semibold shadow-none"
              onClick={() => setEditor('goals')}
            >
              Goals
            </Button>
            <Button
              type="button"
              variant={editor === 'events' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 rounded-md px-3 text-xs font-semibold shadow-none"
              onClick={() => setEditor('events')}
            >
              Cash events
            </Button>
            <Button
              type="button"
              variant={editor === 'assumptions' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 rounded-md px-3 text-xs font-semibold shadow-none"
              onClick={() => setEditor('assumptions')}
            >
              Assumptions
            </Button>
          </div>
          <p className="text-xs text-muted-foreground sm:ml-auto">
            Edit plan inputs in focused sheets
          </p>
        </div>

        {detailLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        ) : !base || !plan ? (
          <Alert variant="warning">
            <AlertTitle>Projection unavailable</AlertTitle>
            <AlertDescription>
              Fix invalid plan inputs in Assets or Assumptions to restore the dashboard charts.
            </AlertDescription>
          </Alert>
        ) : (
          <ProjectionPanels
            plan={plan}
            base={base}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
          />
        )}

        <AssetsEditorSheet open={editor === 'assets'} onOpenChange={(open) => setEditor(open ? 'assets' : null)} />
        <GoalsEditorSheet open={editor === 'goals'} onOpenChange={(open) => setEditor(open ? 'goals' : null)} />
        <EventsEditorSheet open={editor === 'events'} onOpenChange={(open) => setEditor(open ? 'events' : null)} />
        <AssumptionsEditorSheet
          open={editor === 'assumptions'}
          onOpenChange={(open) => setEditor(open ? 'assumptions' : null)}
        />
      </div>
    </FormProvider>
  )
}
