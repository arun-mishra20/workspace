import { Button } from '@workspace/ui/components/ui/button'
import { Checkbox } from '@workspace/ui/components/ui/checkbox'
import { Label } from '@workspace/ui/components/ui/label'

export type ChartCardView =
  | 'line'
  | 'chart'
  | 'table'
  | 'heatmap'
  | 'treemap'
  | 'radial'
  | 'radar'

interface ChartCardToolbarProps {
  view: ChartCardView
  onViewChange?: (view: ChartCardView) => void
  views?: ChartCardView[]
  showTopN?: boolean
  topN?: number
  onTopNChange?: (value: number) => void
  seriesOptions?: Array<{ id: string; label: string; checked: boolean }>
  onSeriesToggle?: (id: string, checked: boolean) => void
}

const VIEW_LABELS: Record<ChartCardView, string> = {
  line: 'Line',
  chart: 'Bar',
  table: 'Table',
  heatmap: 'Heatmap',
  treemap: 'Treemap',
  radial: 'Radial',
  radar: 'Radar',
}

export function ChartCardToolbar({
  view,
  onViewChange,
  views = ['chart', 'table'],
  showTopN = false,
  topN = 6,
  onTopNChange,
  seriesOptions,
  onSeriesToggle,
}: ChartCardToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {onViewChange ? (
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {views.map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={view === option ? 'default' : 'ghost'}
              className="h-7 px-3 text-xs"
              onClick={() => onViewChange(option)}
            >
              {VIEW_LABELS[option]}
            </Button>
          ))}
        </div>
      ) : null}

      {showTopN && onTopNChange ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Label className="text-xs">Top</Label>
          <select
            className="h-7 rounded-md border bg-background px-2 text-xs"
            value={topN}
            onChange={(event) => onTopNChange(Number(event.target.value))}
          >
            {[4, 6, 8, 10].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {seriesOptions?.map((series) => (
        <label key={series.id} className="flex items-center gap-1.5 text-xs">
          <Checkbox
            checked={series.checked}
            onCheckedChange={(checked) =>
              onSeriesToggle?.(series.id, checked === true)
            }
          />
          {series.label}
        </label>
      ))}
    </div>
  )
}
