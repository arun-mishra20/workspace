import { Label } from '@workspace/ui/components/ui/label'
import { Input } from '@workspace/ui/components/ui/input'
import { Slider } from '@workspace/ui/components/ui/slider'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@workspace/ui/components/ui/toggle-group'
import type { ProjectionScenario } from '@workspace/domain'
import { fmtCurrency } from '../lib/format-utils'

interface InflationPanelProps {
  scenario: ProjectionScenario
  onChange: (patch: Partial<ProjectionScenario>) => void
  nominalCorpus: number
  realCorpus: number
  inflationImpact: number
}

export function InflationPanel({
  scenario,
  onChange,
  nominalCorpus,
  realCorpus,
  inflationImpact,
}: InflationPanelProps) {
  const { inflation } = scenario

  return (
    <div className="space-y-4 rounded-xl border bg-card/50 p-4">
      <p className="text-sm font-medium">Inflation settings</p>

      <div className="space-y-2">
        <Label>Inflation Rate ({inflation.rate}%)</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[inflation.rate]}
            onValueChange={([v]) =>
              onChange({ inflation: { ...inflation, rate: v ?? 6 } })
            }
            min={0}
            max={15}
            step={0.5}
            className="flex-1"
          />
          <Input
            type="number"
            min={0}
            max={30}
            value={inflation.rate}
            onChange={(e) =>
              onChange({
                inflation: { ...inflation, rate: Number(e.target.value) || 0 },
              })
            }
            className="w-20 tabular-nums"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>View Mode</Label>
        <ToggleGroup
          type="single"
          value={inflation.viewMode}
          onValueChange={(v) => {
            if (v)
              onChange({
                inflation: {
                  ...inflation,
                  viewMode: v as 'nominal' | 'real',
                },
              })
          }}
        >
          <ToggleGroupItem value="nominal">Nominal View</ToggleGroupItem>
          <ToggleGroupItem value="real">Real Value View</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">Nominal Corpus</p>
          <p className="font-semibold tabular-nums">{fmtCurrency(nominalCorpus)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">Inflation Adjusted</p>
          <p className="font-semibold tabular-nums">{fmtCurrency(realCorpus)}</p>
        </div>
        <div className="rounded-lg border p-3 sm:col-span-2">
          <p className="text-muted-foreground text-xs">Purchasing Power Lost</p>
          <p className="font-semibold tabular-nums text-destructive">
            {fmtCurrency(inflationImpact)}
          </p>
        </div>
      </div>
    </div>
  )
}
