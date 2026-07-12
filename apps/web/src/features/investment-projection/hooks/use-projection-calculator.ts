import { useCallback, useMemo, useState } from 'react'
import debounce from 'lodash/debounce'
import type { ProjectionScenario, ProjectionResult } from '@workspace/domain'
import {
  applyInflationScenarios,
  compareScenarios,
  createDefaultScenario,
  detectMilestones,
  generateInsights,
  getChartSeries,
  projectPortfolio,
  runMonteCarloSimulation,
} from '@workspace/domain'

export function useProjectionCalculator(
  initialScenario?: ProjectionScenario,
  insightOptions?: {
    historicalAvgMonthly?: number
    currentMonthly?: number
  },
) {
  const [scenario, setScenario] = useState<ProjectionScenario>(
    () => initialScenario ?? createDefaultScenario(),
  )
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [compareScenariosList, setCompareScenariosList] = useState<
    ProjectionScenario[]
  >([])

  const result = useMemo(() => projectPortfolio(scenario), [scenario])

  const chartSeries = useMemo(() => getChartSeries(result), [result])

  const milestones = useMemo(() => detectMilestones(result), [result])

  const insights = useMemo(
    () => generateInsights(result, insightOptions),
    [result, insightOptions],
  )

  const monteCarloResult = useMemo(() => {
    if (!scenario.monteCarlo.enabled) return null
    return runMonteCarloSimulation(scenario)
  }, [scenario])

  const inflationScenarioData = useMemo(() => {
    if (!scenario.inflationScenarios.enabled) return []
    return applyInflationScenarios(result, scenario.inflationScenarios.rates)
  }, [result, scenario.inflationScenarios])

  const comparisonData = useMemo(() => {
    if (compareScenariosList.length === 0) return []
    const results = compareScenariosList.map((s) => projectPortfolio(s))
    return compareScenarios(results)
  }, [compareScenariosList])

  const updateScenario = useCallback(
    (patch: Partial<ProjectionScenario> | ((prev: ProjectionScenario) => ProjectionScenario)) => {
      setScenario((prev) => {
        const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
        return next
      })
    },
    [],
  )

  const debouncedUpdate = useMemo(
    () => debounce(updateScenario, 16),
    [updateScenario],
  )

  const addCompareScenario = useCallback((s: ProjectionScenario) => {
    setCompareScenariosList((prev) => {
      if (prev.length >= 3) return prev
      if (prev.some((x) => x.id === s.id)) return prev
      return [...prev, s]
    })
    setCompareIds((prev) => {
      if (prev.length >= 3 || prev.includes(s.id)) return prev
      return [...prev, s.id]
    })
  }, [])

  const removeCompareScenario = useCallback((id: string) => {
    setCompareScenariosList((prev) => prev.filter((s) => s.id !== id))
    setCompareIds((prev) => prev.filter((x) => x !== id))
  }, [])

  return {
    scenario,
    setScenario,
    updateScenario,
    debouncedUpdate,
    result,
    chartSeries,
    milestones,
    insights,
    monteCarloResult,
    inflationScenarioData,
    comparisonData,
    compareIds,
    compareScenariosList,
    addCompareScenario,
    removeCompareScenario,
    setCompareScenariosList,
  }
}

export type ProjectionCalculatorState = ReturnType<typeof useProjectionCalculator>

export function useProjectionResult(scenario: ProjectionScenario): ProjectionResult {
  return useMemo(() => projectPortfolio(scenario), [scenario])
}
