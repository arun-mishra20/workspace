import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProjectionScenario } from '@workspace/domain'
import { createDefaultScenario } from '@workspace/domain'
import debounce from 'lodash/debounce'
import {
  buildShareUrl,
  clearActiveDraft,
  deleteSavedScenario,
  readSavedScenarios,
  saveScenario,
  writeActiveDraft,
  type SavedScenario,
} from '../lib/scenario-serialization'

const AUTO_SAVE_MS = 400

export function useScenarioPersistence(
  scenario: ProjectionScenario,
  onLoad: (scenario: ProjectionScenario) => void,
) {
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([])
  const isFirstRender = useRef(true)

  useEffect(() => {
    setSavedScenarios(readSavedScenarios())
  }, [])

  const debouncedSaveDraft = useCallback(
    debounce((draft: ProjectionScenario) => {
      writeActiveDraft(draft)
    }, AUTO_SAVE_MS),
    [],
  )

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    debouncedSaveDraft(scenario)
    return () => debouncedSaveDraft.cancel()
  }, [scenario, debouncedSaveDraft])

  const handleSave = useCallback(() => {
    const saved = saveScenario(scenario)
    writeActiveDraft(scenario)
    setSavedScenarios(readSavedScenarios())
    return saved
  }, [scenario])

  const handleDelete = useCallback((id: string) => {
    deleteSavedScenario(id)
    setSavedScenarios(readSavedScenarios())
  }, [])

  const handleLoad = useCallback(
    (saved: SavedScenario) => {
      onLoad(saved.scenario)
      writeActiveDraft(saved.scenario)
    },
    [onLoad],
  )

  const handleShare = useCallback(() => {
    const url = buildShareUrl(scenario)
    void navigator.clipboard.writeText(url)
    return url
  }, [scenario])

  const handleReset = useCallback(() => {
    clearActiveDraft()
    onLoad(createDefaultScenario())
  }, [onLoad])

  return {
    savedScenarios,
    handleSave,
    handleDelete,
    handleLoad,
    handleShare,
    handleReset,
  }
}
