import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Label } from '@workspace/ui/components/ui/label'
import { Switch } from '@workspace/ui/components/ui/switch'
import type { ProjectionScenario } from '@workspace/domain'
import { BasicSipForm } from './basic-sip-form'
import { InflationPanel } from './inflation-panel'
import { StepUpPanel } from './step-up-panel'
import { ExistingInvestmentsPanel } from './existing-investments-panel'
import { AssetClassEditor } from './asset-class-editor'
import { ProjectionTimeline } from './projection-timeline'
import { PortfolioDataCard } from './portfolio-data-card'
import type { IntelligentDefaultsSuggestion } from '../hooks/use-intelligent-defaults'

type ModifierId = 'inflation' | 'stepup' | 'existing' | 'multiasset'

const panelMotion = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.2 },
}

interface ProjectionSetupTabProps {
  scenario: ProjectionScenario
  onChange: (patch: Partial<ProjectionScenario>) => void
  onTimelineChange: (
    preset: ProjectionScenario['timeline']['preset'],
    customMonths?: number,
  ) => void
  nominalCorpus: number
  realCorpus: number
  inflationImpact: number
  suggestion: IntelligentDefaultsSuggestion | null
  dismissedDefaults: boolean
  onAcceptDefaults: () => void
  onDismissDefaults: () => void
}

export function ProjectionSetupTab({
  scenario,
  onChange,
  onTimelineChange,
  nominalCorpus,
  realCorpus,
  inflationImpact,
  suggestion,
  dismissedDefaults,
  onAcceptDefaults,
  onDismissDefaults,
}: ProjectionSetupTabProps) {
  const [focusedModifier, setFocusedModifier] = useState<ModifierId | null>(null)

  const modifiers: {
    id: ModifierId
    label: string
    checked: boolean
    enable: () => void
    disable: () => void
  }[] = [
    {
      id: 'inflation',
      label: 'Inflation',
      checked: scenario.inflation.enabled,
      enable: () =>
        onChange({ inflation: { ...scenario.inflation, enabled: true } }),
      disable: () =>
        onChange({ inflation: { ...scenario.inflation, enabled: false } }),
    },
    {
      id: 'stepup',
      label: 'Step-up SIP',
      checked: scenario.stepUp.enabled,
      enable: () => onChange({ stepUp: { ...scenario.stepUp, enabled: true } }),
      disable: () =>
        onChange({ stepUp: { ...scenario.stepUp, enabled: false } }),
    },
    {
      id: 'existing',
      label: 'Existing',
      checked: scenario.existingInvestments.enabled,
      enable: () =>
        onChange({
          existingInvestments: {
            ...scenario.existingInvestments,
            enabled: true,
          },
        }),
      disable: () =>
        onChange({
          existingInvestments: {
            ...scenario.existingInvestments,
            enabled: false,
          },
        }),
    },
    {
      id: 'multiasset',
      label: 'Multi-asset',
      checked: scenario.multiAsset.enabled,
      enable: () =>
        onChange({ multiAsset: { ...scenario.multiAsset, enabled: true } }),
      disable: () =>
        onChange({ multiAsset: { ...scenario.multiAsset, enabled: false } }),
    },
  ]

  const inflationEnabled = scenario.inflation.enabled
  const stepUpEnabled = scenario.stepUp.enabled
  const existingEnabled = scenario.existingInvestments.enabled
  const multiAssetEnabled = scenario.multiAsset.enabled

  useEffect(() => {
    const enabledIds: ModifierId[] = []
    if (inflationEnabled) enabledIds.push('inflation')
    if (stepUpEnabled) enabledIds.push('stepup')
    if (existingEnabled) enabledIds.push('existing')
    if (multiAssetEnabled) enabledIds.push('multiasset')

    if (focusedModifier && !enabledIds.includes(focusedModifier)) {
      setFocusedModifier(enabledIds[0] ?? null)
    } else if (!focusedModifier && enabledIds.length > 0) {
      setFocusedModifier(enabledIds[0] ?? null)
    }
  }, [
    inflationEnabled,
    stepUpEnabled,
    existingEnabled,
    multiAssetEnabled,
    focusedModifier,
  ])

  const handleToggle = (mod: (typeof modifiers)[number], next: boolean) => {
    if (next) {
      mod.enable()
      setFocusedModifier(mod.id)
    } else {
      mod.disable()
      if (focusedModifier === mod.id) {
        const remaining: ModifierId[] = []
        if (inflationEnabled && mod.id !== 'inflation') remaining.push('inflation')
        if (stepUpEnabled && mod.id !== 'stepup') remaining.push('stepup')
        if (existingEnabled && mod.id !== 'existing') remaining.push('existing')
        if (multiAssetEnabled && mod.id !== 'multiasset') remaining.push('multiasset')
        setFocusedModifier(remaining[0] ?? null)
      }
    }
  }

  const activePanel = focusedModifier

  return (
    <div className="space-y-6">
      {suggestion && !dismissedDefaults && (
        <PortfolioDataCard
          suggestion={suggestion}
          onAccept={onAcceptDefaults}
          onDismiss={onDismissDefaults}
        />
      )}

      <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-medium">Basic SIP</h2>
        <BasicSipForm scenario={scenario} onChange={onChange} />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground px-0.5">
          Optional modifiers
        </p>
        <div className="flex flex-wrap gap-3 rounded-xl border bg-card/50 p-3 sm:p-4">
          {modifiers.map((mod) => (
            <div key={mod.id} className="flex items-center gap-2">
              <Switch
                id={`toggle-${mod.id}`}
                checked={mod.checked}
                onCheckedChange={(checked) => handleToggle(mod, checked)}
              />
              <Label
                htmlFor={`toggle-${mod.id}`}
                className={`text-sm cursor-pointer ${
                  mod.checked && activePanel === mod.id
                    ? 'font-medium text-foreground'
                    : ''
                }`}
                onClick={(e) => {
                  if (mod.checked) {
                    e.preventDefault()
                    setFocusedModifier(mod.id)
                  }
                }}
              >
                {mod.label}
              </Label>
            </div>
          ))}
        </div>

        {/* Desktop: show all enabled panels. Mobile: accordion — one at a time */}
        <div className="hidden sm:block space-y-4">
          <AnimatePresence>
            {scenario.inflation.enabled && (
              <motion.div key="inflation" {...panelMotion}>
                <InflationPanel
                  scenario={scenario}
                  onChange={onChange}
                  nominalCorpus={nominalCorpus}
                  realCorpus={realCorpus}
                  inflationImpact={inflationImpact}
                />
              </motion.div>
            )}
            {scenario.stepUp.enabled && (
              <motion.div key="stepup" {...panelMotion}>
                <StepUpPanel scenario={scenario} onChange={onChange} />
              </motion.div>
            )}
            {scenario.existingInvestments.enabled && (
              <motion.div key="existing" {...panelMotion}>
                <ExistingInvestmentsPanel
                  scenario={scenario}
                  onChange={onChange}
                />
              </motion.div>
            )}
            {scenario.multiAsset.enabled && (
              <motion.div key="multiasset" {...panelMotion}>
                <AssetClassEditor scenario={scenario} onChange={onChange} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="sm:hidden">
          <AnimatePresence mode="wait">
            {activePanel === 'inflation' && scenario.inflation.enabled && (
              <motion.div key="inflation-m" {...panelMotion}>
                <InflationPanel
                  scenario={scenario}
                  onChange={onChange}
                  nominalCorpus={nominalCorpus}
                  realCorpus={realCorpus}
                  inflationImpact={inflationImpact}
                />
              </motion.div>
            )}
            {activePanel === 'stepup' && scenario.stepUp.enabled && (
              <motion.div key="stepup-m" {...panelMotion}>
                <StepUpPanel scenario={scenario} onChange={onChange} />
              </motion.div>
            )}
            {activePanel === 'existing' &&
              scenario.existingInvestments.enabled && (
                <motion.div key="existing-m" {...panelMotion}>
                  <ExistingInvestmentsPanel
                    scenario={scenario}
                    onChange={onChange}
                  />
                </motion.div>
              )}
            {activePanel === 'multiasset' && scenario.multiAsset.enabled && (
              <motion.div key="multiasset-m" {...panelMotion}>
                <AssetClassEditor scenario={scenario} onChange={onChange} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ProjectionTimeline
        preset={scenario.timeline.preset}
        customMonths={scenario.timeline.customMonths}
        onChange={onTimelineChange}
      />
    </div>
  )
}
