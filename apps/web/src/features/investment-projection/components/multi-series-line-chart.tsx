import {
  Area,
  Brush,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@workspace/ui/components/ui/chart'
import { Checkbox } from '@workspace/ui/components/ui/checkbox'
import { Label } from '@workspace/ui/components/ui/label'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/ui/popover'
import { Layers } from 'lucide-react'
import type { ProjectionScenario } from '@workspace/domain'
import { useMemo, useState } from 'react'
import { fmtCompact, fmtCurrency, getChartTokenColor } from '../lib/format-utils'

interface MultiSeriesLineChartProps {
  chartSeries: Record<string, number | string>[]
  scenario: ProjectionScenario
  comparisonData?: Record<string, number | string>[]
  compareScenarios?: ProjectionScenario[]
  chartRef?: React.RefObject<HTMLDivElement | null>
}

export function MultiSeriesLineChart({
  chartSeries,
  scenario,
  comparisonData = [],
  compareScenarios = [],
  chartRef,
}: MultiSeriesLineChartProps) {
  const seriesOptions = useMemo(() => {
    const options: { key: string; label: string; color: string }[] = [
      { key: 'total', label: 'Total Portfolio', color: getChartTokenColor(0) },
    ]

    if (scenario.multiAsset.enabled) {
      for (const asset of scenario.multiAsset.assetClasses) {
        options.push({
          key: asset.id,
          label: asset.name,
          color: getChartTokenColor(options.length),
        })
      }
    } else {
      options.push({
        key: 'invested',
        label: 'Invested',
        color: getChartTokenColor(1),
      })
    }

    for (const cs of compareScenarios) {
      options.push({
        key: cs.id,
        label: cs.name,
        color: getChartTokenColor(options.length),
      })
    }

    return options
  }, [scenario, compareScenarios])

  const [visible, setVisible] = useState<Set<string>>(() => new Set(['total']))

  const data = comparisonData.length > 0 ? comparisonData : chartSeries

  const displayData = useMemo(() => {
    const step = Math.max(1, Math.floor(data.length / 100))
    return data.filter((_, i) => i % step === 0 || i === data.length - 1)
  }, [data])

  const chartConfig = Object.fromEntries(
    seriesOptions.map((s) => [s.key, { label: s.label, color: s.color }]),
  )

  const inflationNote =
    scenario.inflation.enabled && scenario.inflation.viewMode === 'real'
      ? ' (inflation-adjusted)'
      : ''

  const toggleSeries = (key: string, checked: boolean | 'indeterminate') => {
    setVisible((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const seriesCheckboxes = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
      {seriesOptions.map((s) => (
        <div key={s.key} className="flex items-center gap-2">
          <Checkbox
            id={`series-${s.key}`}
            checked={visible.has(s.key)}
            onCheckedChange={(checked) => toggleSeries(s.key, checked)}
          />
          <Label
            htmlFor={`series-${s.key}`}
            className="text-xs font-normal cursor-pointer"
            style={{ color: s.color }}
          >
            {s.label}
          </Label>
        </div>
      ))}
    </div>
  )

  return (
    <Card ref={chartRef} className="overflow-hidden">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Portfolio Growth</CardTitle>
            <CardDescription>
              Projected value over time{inflationNote} — toggle series, zoom with
              brush
            </CardDescription>
          </div>
          <div className="sm:hidden shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Layers className="h-4 w-4 mr-1" />
                  Series
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56">
                {seriesCheckboxes}
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="hidden sm:block">{seriesCheckboxes}</div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ChartContainer config={chartConfig} className="h-[320px] sm:h-[400px] w-full">
          <ComposedChart
            data={displayData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v) => fmtCompact(v as number)}
              width={56}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(v) => fmtCurrency(v as number)}
                />
              }
            />
            <Legend />
            {seriesOptions
              .filter((s) => visible.has(s.key))
              .map((s, index) =>
                index === 0 && s.key === 'total' ? (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    fill={s.color}
                    fillOpacity={0.15}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
                  />
                ) : (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
                  />
                ),
              )}
            <Brush dataKey="label" height={24} stroke="var(--color-border)" />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
