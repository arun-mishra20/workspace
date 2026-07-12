import { useCallback, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, LineChart } from 'lucide-react'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/ui/tabs'
import { computeAllocationAtMonth } from '@workspace/domain'
import { useAiPageContext } from '@/features/ai-assistant/ai-assistant-context'
import { buildProjectionsPageContext } from '@/features/ai-assistant/adapters/projections-context'
import { useProjectionCalculator } from '../hooks/use-projection-calculator'
import { useScenarioPersistence } from '../hooks/use-scenario-persistence'
import { useIntelligentDefaults } from '../hooks/use-intelligent-defaults'
import { ScenarioManager } from './scenario-manager'
import { ExportMenu } from './export-menu'
import { ProjectionSetupTab } from './projection-setup-tab'
import { ProjectionResultsTab } from './projection-results-tab'
import { ProjectionRiskTab } from './projection-risk-tab'
import { toast } from 'sonner'
import { resolveInitialScenario } from '../lib/scenario-serialization'
import { fmtCurrency, fmtMultiplier } from '../lib/format-utils'

type TabValue = 'setup' | 'projection' | 'risk'

function parseTab(raw: string | null): TabValue {
  if (raw === 'projection' || raw === 'risk' || raw === 'setup') return raw
  return 'setup'
}

export function ProjectionCalculatorPage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [dismissedDefaults, setDismissedDefaults] = useState(false)

  const activeTab = parseTab(searchParams.get('tab'))

  const setActiveTab = useCallback(
    (tab: string) => {
      const next = parseTab(tab)
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          if (next === 'setup') params.delete('tab')
          else params.set('tab', next)
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const initialScenario = useMemo(
    () =>
      resolveInitialScenario(
        new URLSearchParams(globalThis.location.search),
      ),
    [],
  )

  const {
    suggestion,
    applyDefaults,
    isLoading: defaultsLoading,
  } = useIntelligentDefaults()

  const calc = useProjectionCalculator(initialScenario, {
    historicalAvgMonthly: suggestion?.avgMonthly ?? undefined,
    currentMonthly: suggestion?.avgMonthly ?? undefined,
  })

  const persistence = useScenarioPersistence(calc.scenario, calc.setScenario)

  const aiPageContext = useMemo(
    () =>
      buildProjectionsPageContext({
        scenario: calc.scenario,
        result: calc.result,
      }),
    [calc.scenario, calc.result],
  )
  useAiPageContext(aiPageContext)

  const handleChange = useCallback(
    (patch: Parameters<typeof calc.updateScenario>[0]) => {
      calc.updateScenario(patch)
    },
    [calc],
  )

  const handleTimelineChange = useCallback(
    (
      preset: typeof calc.scenario.timeline.preset,
      customMonths?: number,
    ) => {
      handleChange({
        timeline: { preset, customMonths },
      })
    },
    [handleChange],
  )

  const todayAllocation = computeAllocationAtMonth(calc.result, 0)
  const projectedMonth = Math.min(
    calc.result.horizonMonths,
    calc.result.snapshots.length - 1,
  )
  const projectedAllocation = computeAllocationAtMonth(
    calc.result,
    projectedMonth,
  )

  const showReal =
    calc.scenario.inflation.enabled &&
    calc.scenario.inflation.viewMode === 'real'

  const summary = calc.result.summary
  const corpus = showReal ? summary.realFinalCorpus : summary.finalCorpus

  return (
    <div className="relative space-y-6 px-4 py-6 sm:p-8 pb-24 lg:pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <LineChart className="h-7 w-7 text-primary" aria-hidden />
            Investment Projections
          </h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-xl">
            Configure assumptions, then review projections, milestones, and
            risk scenarios.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu result={calc.result} chartRef={chartRef} />
        </div>
      </div>

      <ScenarioManager
        scenario={calc.scenario}
        savedScenarios={persistence.savedScenarios}
        compareIds={calc.compareIds}
        compareScenarios={calc.compareScenariosList}
        onLoad={calc.setScenario}
        onSave={() => {
          persistence.handleSave()
          toast.success('Scenario saved locally')
        }}
        onDelete={persistence.handleDelete}
        onShare={persistence.handleShare}
        onAddCompare={calc.addCompareScenario}
        onRemoveCompare={calc.removeCompareScenario}
        onReset={() => {
          persistence.handleReset()
          toast.success('Reset to defaults')
        }}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex h-auto">
          <TabsTrigger value="setup" className="text-xs sm:text-sm">
            Setup
          </TabsTrigger>
          <TabsTrigger value="projection" className="text-xs sm:text-sm">
            Projection
          </TabsTrigger>
          <TabsTrigger value="risk" className="text-xs sm:text-sm">
            Risk
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="mt-6">
          <ProjectionSetupTab
            scenario={calc.scenario}
            onChange={handleChange}
            onTimelineChange={handleTimelineChange}
            nominalCorpus={summary.finalCorpus}
            realCorpus={summary.realFinalCorpus}
            inflationImpact={summary.inflationImpact}
            suggestion={suggestion}
            dismissedDefaults={dismissedDefaults}
            onAcceptDefaults={() => {
              const next = applyDefaults()
              calc.setScenario(next)
              setDismissedDefaults(true)
              toast.success('Defaults applied — all values remain editable')
            }}
            onDismissDefaults={() => setDismissedDefaults(true)}
          />
        </TabsContent>

        <TabsContent value="projection" className="mt-6">
          <ProjectionResultsTab
            summary={summary}
            showReal={showReal}
            defaultsLoading={defaultsLoading}
            chartSeries={calc.chartSeries}
            scenario={calc.scenario}
            comparisonData={calc.comparisonData}
            compareScenarios={calc.compareScenariosList}
            chartRef={chartRef}
            todayAllocation={todayAllocation}
            projectedAllocation={projectedAllocation}
            projectedLabel={`After ${calc.scenario.timeline.preset}`}
            insights={calc.insights}
            milestones={calc.milestones}
          />
        </TabsContent>

        <TabsContent value="risk" className="mt-6">
          <ProjectionRiskTab
            scenario={calc.scenario}
            monteCarloResult={calc.monteCarloResult}
            inflationScenarioData={calc.inflationScenarioData}
            onChange={handleChange}
            onEnableMonteCarlo={() =>
              handleChange({
                monteCarlo: { ...calc.scenario.monteCarlo, enabled: true },
              })
            }
          />
        </TabsContent>
      </Tabs>

      {/* Mobile sticky corpus bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur-sm px-4 py-3 safe-area-pb">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">Final corpus</p>
            <p className="font-semibold tabular-nums truncate">
              {fmtCurrency(corpus)}
              <span className="text-muted-foreground font-normal text-sm ml-2">
                {fmtMultiplier(summary.wealthMultiplier)}
              </span>
            </p>
          </div>
          {activeTab !== 'projection' && (
            <Button
              type="button"
              size="sm"
              onClick={() => setActiveTab('projection')}
            >
              View
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
