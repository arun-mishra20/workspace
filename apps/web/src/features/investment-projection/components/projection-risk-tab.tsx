import { Dices } from 'lucide-react'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import type { MonteCarloResult, ProjectionScenario } from '@workspace/domain'
import type { InflationScenarioPoint } from '@workspace/domain'
import { MonteCarloPanel } from './monte-carlo-panel'
import { InflationScenariosPanel } from './inflation-scenarios-panel'
import { AdvancedControlsAccordion } from './advanced-controls-accordion'

interface ProjectionRiskTabProps {
  scenario: ProjectionScenario
  monteCarloResult: MonteCarloResult | null
  inflationScenarioData: InflationScenarioPoint[]
  onChange: (patch: Partial<ProjectionScenario>) => void
  onEnableMonteCarlo: () => void
}

export function ProjectionRiskTab({
  scenario,
  monteCarloResult,
  inflationScenarioData,
  onChange,
  onEnableMonteCarlo,
}: ProjectionRiskTabProps) {
  return (
    <div className="space-y-6">
      {scenario.monteCarlo.enabled ? (
        <MonteCarloPanel
          scenario={scenario}
          result={monteCarloResult}
          onChange={onChange}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Dices className="h-4 w-4" aria-hidden />
              Monte Carlo Simulation
            </CardTitle>
            <CardDescription>
              Model return uncertainty with thousands of GBM paths, percentile
              bands, and target probability.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={onEnableMonteCarlo}>
              Run Monte Carlo simulation
            </Button>
          </CardContent>
        </Card>
      )}

      <InflationScenariosPanel
        scenario={scenario}
        data={inflationScenarioData}
        onChange={onChange}
      />

      <AdvancedControlsAccordion scenario={scenario} onChange={onChange} />
    </div>
  )
}
