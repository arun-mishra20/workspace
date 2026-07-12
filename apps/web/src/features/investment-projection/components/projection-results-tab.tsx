import type {
  AllocationSnapshot,
  ProjectionInsight,
  ProjectionScenario,
  MilestoneHit,
  SummaryMetrics,
} from '@workspace/domain'
import {
  ProjectionKpiCards,
  ProjectionKpiSkeleton,
} from './projection-kpi-cards'
import { MultiSeriesLineChart } from './multi-series-line-chart'
import { InvestedVsGainsDonut } from './invested-vs-gains-donut'
import { AllocationComparison } from './allocation-comparison'
import { InsightsPanel } from './insights-panel'
import { MilestoneTimeline } from './milestone-timeline'

interface ProjectionResultsTabProps {
  summary: SummaryMetrics
  showReal: boolean
  defaultsLoading: boolean
  chartSeries: Record<string, number | string>[]
  scenario: ProjectionScenario
  comparisonData: Record<string, number | string>[]
  compareScenarios: ProjectionScenario[]
  chartRef: React.RefObject<HTMLDivElement | null>
  todayAllocation: AllocationSnapshot[]
  projectedAllocation: AllocationSnapshot[]
  projectedLabel: string
  insights: ProjectionInsight[]
  milestones: MilestoneHit[]
}

export function ProjectionResultsTab({
  summary,
  showReal,
  defaultsLoading,
  chartSeries,
  scenario,
  comparisonData,
  compareScenarios,
  chartRef,
  todayAllocation,
  projectedAllocation,
  projectedLabel,
  insights,
  milestones,
}: ProjectionResultsTabProps) {
  return (
    <div className="space-y-6">
      {defaultsLoading ? (
        <ProjectionKpiSkeleton />
      ) : (
        <ProjectionKpiCards summary={summary} showReal={showReal} />
      )}

      <MultiSeriesLineChart
        chartSeries={chartSeries}
        scenario={scenario}
        comparisonData={comparisonData}
        compareScenarios={compareScenarios}
        chartRef={chartRef}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <InvestedVsGainsDonut summary={summary} />
        <AllocationComparison
          today={todayAllocation}
          projected={projectedAllocation}
          projectedLabel={projectedLabel}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <InsightsPanel insights={insights} />
        <MilestoneTimeline milestones={milestones} />
      </div>
    </div>
  )
}
