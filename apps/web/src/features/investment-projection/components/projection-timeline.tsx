import type { TimelinePreset } from '@workspace/domain'
import { Button } from '@workspace/ui/components/ui/button'
import { Input } from '@workspace/ui/components/ui/input'
import { Label } from '@workspace/ui/components/ui/label'

const PRESETS: { label: string; value: TimelinePreset }[] = [
  { label: 'Today', value: 'today' },
  { label: '1Y', value: '1y' },
  { label: '3Y', value: '3y' },
  { label: '5Y', value: '5y' },
  { label: '10Y', value: '10y' },
  { label: '15Y', value: '15y' },
  { label: '20Y', value: '20y' },
  { label: '25Y', value: '25y' },
  { label: '30Y', value: '30y' },
  { label: 'Custom', value: 'custom' },
]

interface ProjectionTimelineProps {
  preset: TimelinePreset
  customMonths?: number
  onChange: (preset: TimelinePreset, customMonths?: number) => void
}

export function ProjectionTimeline({
  preset,
  customMonths,
  onChange,
}: ProjectionTimelineProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {PRESETS.map(({ label, value }) => (
          <Button
            key={value}
            type="button"
            variant={preset === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(value, customMonths)}
            className="shrink-0"
          >
            {label}
          </Button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <Label htmlFor="custom-months" className="shrink-0 text-sm">
            Custom months
          </Label>
          <Input
            id="custom-months"
            type="number"
            min={1}
            max={600}
            value={customMonths ?? 120}
            onChange={(e) =>
              onChange('custom', Number(e.target.value) || 120)
            }
            className="w-24 tabular-nums"
          />
        </div>
      )}
    </div>
  )
}
