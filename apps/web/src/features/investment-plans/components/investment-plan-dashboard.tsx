import { memo, useCallback, useMemo, useState } from 'react'
import { FormProvider } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@workspace/ui/components/ui/button'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@workspace/ui/components/ui/alert'

import { useRefreshInvestmentPlanSource } from '@/features/investment-plans/api/investment-plans'
import { AssumptionsEditorSheet } from '@/features/investment-plans/components/editors/assumptions-editor-sheet'
import { AssetsEditorSheet } from '@/features/investment-plans/components/editors/assets-editor-sheet'
import { EventsEditorSheet } from '@/features/investment-plans/components/editors/events-editor-sheet'
import { GoalsEditorSheet } from '@/features/investment-plans/components/editors/goals-editor-sheet'
import {
  PlanEditChips,
  type PlanEditorKey,
} from '@/features/investment-plans/components/plan-edit-chips'
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

import type {
  InvestmentPlanInput,
  InvestmentPlanProjection,
} from '@workspace/domain'

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
  onOpenGoals,
}: {
  plan: InvestmentPlanInput
  base: InvestmentPlanProjection
  viewMode: ChartViewMode
  onViewModeChange: (mode: ChartViewMode) => void
  onOpenGoals: () => void
}) {
  const monthlyInvestment = useMemo(
    () =>
      plan.assets.reduce(
        (sum, asset) => sum + (asset.monthlyContribution || 0),
        0,
      ),
    [plan.assets],
  )
  const finalSnapshot = base.snapshots[base.snapshots.length - 1]!

  return (
    <>
      <MemoPlanHeroKpis
        projection={base}
        monthlyInvestment={monthlyInvestment}
        showReal={viewMode === 'real'}
        startDate={plan.startDate}
        onAddGoal={onOpenGoals}
      />
      <MemoPlanNetWorthChart
        projection={base}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
      <MemoPlanGoalRail
        goals={plan.goals}
        results={base.goals}
        onAddGoal={onOpenGoals}
      />
      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <MemoPlanPortfolioSection plan={plan} finalSnapshot={finalSnapshot} />
        <MemoPlanInsights plan={plan} projection={base} />
      </div>
    </>
  )
})

export function InvestmentPlanDashboard() {
  const workspace = useInvestmentPlanWorkspace()
  const refreshMutation = useRefreshInvestmentPlanSource()
  const [editor, setEditor] = useState<PlanEditorKey | null>(null)
  const [viewMode, setViewMode] = useState<ChartViewMode>(() =>
    getChartViewMode(),
  )

  const base = workspace.projection?.base
  const plan = workspace.projectionPlan
  const detailLoading =
    workspace.detailQuery.isLoading && !workspace.detailQuery.data

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
      toast.success(
        `Applied ${changes} categor${changes === 1 ? 'y' : 'ies'} from holdings/principal`,
        {
          description:
            'Review balances in Assets. Autosave will persist via PUT.',
        },
      )
      setEditor('assets')
    } catch {
      toast.error('Could not refresh source data')
    }
  }, [refreshMutation, workspace])

  if (workspace.listQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1260px] space-y-4 px-4 pt-9 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (workspace.listQuery.isError) {
    return (
      <div className="mx-auto w-full max-w-[1260px] px-4 pt-9 sm:px-6 lg:px-8">
        <Alert variant="destructive">
          <AlertTitle>Could not load plans</AlertTitle>
          <AlertDescription>
            Check that the API is running and migration 0022 has been applied,
            then retry.
          </AlertDescription>
        </Alert>
        <Button
          className="mt-3"
          type="button"
          onClick={() => void workspace.listQuery.refetch()}
        >
          Retry
        </Button>
      </div>
    )
  }

  if (workspace.summaries.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-[1260px] flex-col items-center justify-center gap-4 px-4 py-9 text-center sm:px-6 lg:px-8">
        <div className="max-w-md space-y-2">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
            Create your investment plan
          </h1>
          <p className="text-sm text-muted-foreground">
            Where your money is headed, and what it&apos;ll take to get there.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => void workspace.createPlan()}
          disabled={workspace.isCreating}
        >
          Create plan
        </Button>
      </div>
    )
  }

  return (
    <FormProvider {...workspace.form}>
      <div className="mx-auto w-full max-w-[1260px] space-y-[22px] px-4 pt-9 pb-16 sm:px-6 lg:px-8">
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
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void workspace.reloadRemote()}
              >
                Reload latest
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <PlanEditChips
          active={editor}
          onSelect={setEditor}
          goalsCount={plan?.goals.length ?? 0}
        />

        {detailLoading ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28" />
              ))}
            </div>
            <Skeleton className="h-80 w-full" />
          </div>
        ) : !base || !plan ? (
          <Alert variant="warning">
            <AlertTitle>Projection unavailable</AlertTitle>
            <AlertDescription>
              Fix invalid plan inputs in Assets or Assumptions to restore the
              dashboard charts.
            </AlertDescription>
          </Alert>
        ) : (
          <ProjectionPanels
            plan={plan}
            base={base}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            onOpenGoals={() => setEditor('goals')}
          />
        )}

        <AssetsEditorSheet
          open={editor === 'assets'}
          onOpenChange={(open) => setEditor(open ? 'assets' : null)}
        />
        <GoalsEditorSheet
          open={editor === 'goals'}
          onOpenChange={(open) => setEditor(open ? 'goals' : null)}
        />
        <EventsEditorSheet
          open={editor === 'events'}
          onOpenChange={(open) => setEditor(open ? 'events' : null)}
        />
        <AssumptionsEditorSheet
          open={editor === 'assumptions'}
          onOpenChange={(open) => setEditor(open ? 'assumptions' : null)}
        />
      </div>
    </FormProvider>
  )
}
