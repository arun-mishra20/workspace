import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
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
  type ChartConfig,
} from '@workspace/ui/components/ui/chart'

import { fmtCurrency } from '@/features/investment-plans/lib/format'
import type { ChartViewMode } from '@/features/investment-plans/lib/preferences'
import { cn } from '@/lib/utils'

import type { InvestmentPlanProjection } from '@workspace/domain'

const chartConfig = {
  value: { label: 'Projected balance', color: 'var(--color-chart-1)' },
  invested: { label: 'Total contributions', color: 'var(--color-muted-foreground)' },
  gains: { label: 'Growth from returns', color: 'var(--color-chart-1)' },
} satisfies ChartConfig

interface PlanNetWorthChartProps {
  projection: InvestmentPlanProjection
  viewMode: ChartViewMode
  onViewModeChange: (mode: ChartViewMode) => void
}

export function PlanNetWorthChart({
  projection,
  viewMode,
  onViewModeChange,
}: PlanNetWorthChartProps) {
  const data = useMemo(() => {
    const step = Math.max(1, Math.floor(projection.snapshots.length / 60))
    return projection.snapshots
      .filter(
        (_, index) =>
          index % step === 0 || index === projection.snapshots.length - 1,
      )
      .map((snapshot) => ({
        date: snapshot.date,
        label: snapshot.date.slice(0, 7),
        value: viewMode === 'real' ? snapshot.realValue : snapshot.totalValue,
        invested: snapshot.invested,
        gains: snapshot.gains,
      }))
  }, [projection.snapshots, viewMode])

  const final = data.length > 0 ? data[data.length - 1] : undefined

  return (
    <Card className="overflow-hidden rounded-[10px]">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 px-6 pt-6 pb-2">
        <div className="space-y-1">
          <CardTitle className="font-serif text-[19px] font-semibold tracking-tight">
            Net worth timeline
          </CardTitle>
          <CardDescription className="text-[13.5px]">
            {viewMode === 'real'
              ? "Projected balance vs. what you put in, today's money."
              : 'Projected balance vs. what you put in, nominal terms.'}
          </CardDescription>
        </div>
        <div
          className="inline-flex shrink-0 rounded-lg border border-border bg-muted p-0.5"
          role="group"
          aria-label="Value basis"
        >
          {(['nominal', 'real'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              className={cn(
                'rounded-md px-3.5 py-1.5 text-[12.5px] font-semibold capitalize transition-colors',
                viewMode === mode
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </CardHeader>

      <div className="flex flex-wrap gap-x-6 gap-y-2 px-6 pt-3 text-[12.5px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-chart-1" aria-hidden />
          Projected balance
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-0 w-4 border-t-2 border-dashed border-muted-foreground"
            aria-hidden
          />
          Total contributions
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-chart-1/30" aria-hidden />
          Growth from returns
        </div>
      </div>

      <CardContent className="px-3 pt-2 pb-5 sm:px-4">
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <AreaChart data={data} accessibilityLayer>
            <defs>
              <linearGradient id="planValueFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-chart-1)"
                  stopOpacity={0.28}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-chart-1)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(value: number) => fmtCurrency(value)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <span>
                      {String(name)}: {fmtCurrency(Number(value))}
                    </span>
                  )}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="invested"
              stroke="var(--color-muted-foreground)"
              fill="transparent"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-chart-1)"
              fill="url(#planValueFill)"
              strokeWidth={2.5}
            />
          </AreaChart>
        </ChartContainer>
        <p className="sr-only">
          Chart shows projected net worth ending at{' '}
          {final ? fmtCurrency(final.value) : 'zero'} with invested capital{' '}
          {final ? fmtCurrency(final.invested) : 'zero'}.
        </p>
      </CardContent>
    </Card>
  )
}
