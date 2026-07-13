const LAST_PLAN_KEY = 'investment-plan-last-opened'
const CHART_VIEW_KEY = 'investment-plan-chart-view'
const COLLAPSED_PANELS_KEY = 'investment-plan-collapsed-panels'

export type ChartViewMode = 'nominal' | 'real'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function getLastOpenedPlanId(): string | null {
  try {
    return globalThis.localStorage?.getItem(LAST_PLAN_KEY) ?? null
  } catch {
    return null
  }
}

export function setLastOpenedPlanId(id: string) {
  try {
    globalThis.localStorage?.setItem(LAST_PLAN_KEY, id)
  } catch {
    // Ignore.
  }
}

export function getChartViewMode(): ChartViewMode {
  const value = readJson<ChartViewMode | null>(CHART_VIEW_KEY, null)
  return value === 'real' ? 'real' : 'nominal'
}

export function setChartViewMode(mode: ChartViewMode) {
  writeJson(CHART_VIEW_KEY, mode)
}

export function getCollapsedPanels(): Record<string, boolean> {
  return readJson<Record<string, boolean>>(COLLAPSED_PANELS_KEY, {})
}

export function setCollapsedPanel(panel: string, collapsed: boolean) {
  const next = { ...getCollapsedPanels(), [panel]: collapsed }
  writeJson(COLLAPSED_PANELS_KEY, next)
}
