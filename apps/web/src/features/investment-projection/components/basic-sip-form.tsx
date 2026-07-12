import { Label } from '@workspace/ui/components/ui/label'
import { Input } from '@workspace/ui/components/ui/input'
import { Slider } from '@workspace/ui/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/ui/select'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@workspace/ui/components/ui/toggle-group'
import type { BasicSIPConfig, ProjectionScenario } from '@workspace/domain'

interface BasicSipFormProps {
  scenario: ProjectionScenario
  onChange: (patch: Partial<ProjectionScenario>) => void
}

export function BasicSipForm({ scenario, onChange }: BasicSipFormProps) {
  const { basicSIP } = scenario

  const updateBasic = (patch: Partial<BasicSIPConfig>) => {
    onChange({ basicSIP: { ...basicSIP, ...patch } })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="frequency">Investment Frequency</Label>
        <Select
          value={basicSIP.frequency}
          onValueChange={(v) =>
            updateBasic({ frequency: v as BasicSIPConfig['frequency'] })
          }
        >
          <SelectTrigger id="frequency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sip-amount">SIP Amount (₹)</Label>
        <Input
          id="sip-amount"
          type="number"
          min={0}
          value={basicSIP.amount}
          onChange={(e) => updateBasic({ amount: Number(e.target.value) || 0 })}
          className="tabular-nums"
        />
      </div>

      <div className="space-y-2">
        <Label>Duration</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            value={basicSIP.durationValue}
            onChange={(e) =>
              updateBasic({ durationValue: Number(e.target.value) || 1 })
            }
            className="tabular-nums"
            aria-label="Duration value"
          />
          <ToggleGroup
            type="single"
            value={basicSIP.durationUnit}
            onValueChange={(v) => {
              if (v) updateBasic({ durationUnit: v as 'years' | 'months' })
            }}
            className="shrink-0"
          >
            <ToggleGroupItem value="years" aria-label="Years">
              Years
            </ToggleGroupItem>
            <ToggleGroupItem value="months" aria-label="Months">
              Months
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="space-y-2 sm:col-span-2 lg:col-span-3">
        <Label htmlFor="annual-return">
          Expected Annual Return ({basicSIP.annualReturn}%)
        </Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[basicSIP.annualReturn]}
            onValueChange={([v]) => updateBasic({ annualReturn: v ?? 12 })}
            min={0}
            max={30}
            step={0.5}
            className="flex-1"
            aria-label="Expected annual return"
          />
          <Input
            id="annual-return"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={basicSIP.annualReturn}
            onChange={(e) =>
              updateBasic({ annualReturn: Number(e.target.value) || 0 })
            }
            className="w-20 tabular-nums"
          />
        </div>
      </div>
    </div>
  )
}
