import { Button } from '@workspace/ui/components/ui/button'
import { Checkbox } from '@workspace/ui/components/ui/checkbox'
import { Label } from '@workspace/ui/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/ui/select'

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
        <div
          role="tablist"
          aria-label="Chart view"
          className="flex gap-1 rounded-lg bg-muted p-1"
        >
          {views.map((option) => (
            <Button
              key={option}
              type="button"
              role="tab"
              aria-selected={view === option}
              size="sm"
              variant={view === option ? 'default' : 'ghost'}
              className="h-7 px-3 text-xs active:scale-[0.98]"
              onClick={() => onViewChange(option)}
            >
              {VIEW_LABELS[option]}
            </Button>
          ))}
        </div>
      ) : null}

      {showTopN && onTopNChange ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Label htmlFor="chart-top-n" className="text-xs">
            Top
          </Label>
          <Select
            value={String(topN)}
            onValueChange={(value) => onTopNChange(Number(value))}
          >
            <SelectTrigger id="chart-top-n" className="h-7 w-16 text-xs" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[4, 6, 8, 10].map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {seriesOptions?.map((series) => {
        const inputId = `chart-series-${series.id}`

        return (
          <div key={series.id} className="flex items-center gap-1.5 text-xs">
            <Checkbox
              id={inputId}
              checked={series.checked}
              onCheckedChange={(checked) =>
                onSeriesToggle?.(series.id, checked === true)
              }
            />
            <Label htmlFor={inputId} className="text-xs font-normal">
              {series.label}
            </Label>
          </div>
        )
      })}
    </div>
  )
}
