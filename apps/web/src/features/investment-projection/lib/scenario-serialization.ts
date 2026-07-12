import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { ProjectionScenario } from '@workspace/domain'
import { ProjectionScenarioSchema, createDefaultScenario } from '@workspace/domain'

const STORAGE_KEY = 'investment-projection-scenarios'
const ACTIVE_DRAFT_KEY = 'investment-projection-active-draft'

export function serializeScenarioToUrl(scenario: ProjectionScenario): string {
  const json = JSON.stringify(scenario)
  return compressToEncodedURIComponent(json)
}

export function deserializeScenarioFromUrl(encoded: string): ProjectionScenario | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    const parsed = JSON.parse(json) as unknown
    return ProjectionScenarioSchema.parse(parsed)
  } catch {
    return null
  }
}

export interface SavedScenario {
  id: string
  name: string
  savedAt: string
  scenario: ProjectionScenario
}

export function readSavedScenarios(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedScenario[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeSavedScenarios(scenarios: SavedScenario[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios))
}

export function saveScenario(scenario: ProjectionScenario): SavedScenario {
  const saved: SavedScenario = {
    id: scenario.id,
    name: scenario.name,
    savedAt: new Date().toISOString(),
    scenario,
  }
  const existing = readSavedScenarios().filter((s) => s.id !== scenario.id)
  writeSavedScenarios([saved, ...existing])
  return saved
}

export function deleteSavedScenario(id: string): void {
  writeSavedScenarios(readSavedScenarios().filter((s) => s.id !== id))
}

export function buildShareUrl(scenario: ProjectionScenario): string {
  const encoded = serializeScenarioToUrl(scenario)
  const url = new URL(globalThis.location.href)
  url.searchParams.set('s', encoded)
  return url.toString()
}

export function loadScenarioFromSearchParams(
  searchParams: URLSearchParams,
): ProjectionScenario | null {
  const encoded = searchParams.get('s')
  if (!encoded) return null
  return deserializeScenarioFromUrl(encoded)
}

/** Read the auto-saved draft (survives page refresh) */
export function readActiveDraft(): ProjectionScenario | null {
  try {
    const raw = localStorage.getItem(ACTIVE_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return ProjectionScenarioSchema.parse(parsed)
  } catch {
    return null
  }
}

export function writeActiveDraft(scenario: ProjectionScenario): void {
  localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(scenario))
}

export function clearActiveDraft(): void {
  localStorage.removeItem(ACTIVE_DRAFT_KEY)
}

/** URL share link takes priority, then local draft, then defaults */
export function resolveInitialScenario(
  searchParams: URLSearchParams,
): ProjectionScenario {
  const fromUrl = loadScenarioFromSearchParams(searchParams)
  if (fromUrl) return fromUrl
  const draft = readActiveDraft()
  if (draft) return draft
  return createDefaultScenario()
}
