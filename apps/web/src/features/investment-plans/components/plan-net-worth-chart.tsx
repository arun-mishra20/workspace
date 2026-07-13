import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Button } from '@workspace/ui/components/ui/button'
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
import type { InvestmentPlanProjection } from '@workspace/domain'

const chartConfig = {
  value: { label: 'Net worth', color: 'var(--color-chart-1)' },
  invested: { label: 'Contributions', color: 'var(--color-chart-2)' },
  gains: { label: 'Gains', color: 'var(--color-chart-3)' },
} satisfies ChartConfig

interface PlanNetWorthChartProps {
  projection: InvestmentPlanProjection
  viewMode: ChartViewMode
  onViewModeChange: (mode: ChartViewMode) => void
}

export function PlanNetWorthChart({ projection, viewMode, onViewModeChange }: PlanNetWorthChartProps) {
  const data = useMemo(() => {
    const step = Math.max(1, Math.floor(projection.snapshots.length / 60))
    return projection.snapshots
      .filter((_, index) => index % step === 0 || index === projection.snapshots.length - 1)
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
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle>Net worth timeline</CardTitle>
          <CardDescription>
            {viewMode === 'real' ? 'Today’s money' : 'Nominal'} projection with contributions versus gains.
          </CardDescription>
        </div>
        <div className="flex gap-1" role="group" aria-label="Value basis">
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'nominal' ? 'default' : 'outline'}
            onClick={() => onViewModeChange('nominal')}
          >
            Nominal
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'real' ? 'default' : 'outline'}
            onClick={() => onViewModeChange('real')}
          >
            Real
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <AreaChart data={data} accessibilityLayer>
            <defs>
              <linearGradient id="planValueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.28} />
                <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={32} />
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
              stroke="var(--color-chart-2)"
              fill="transparent"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-chart-1)"
              fill="url(#planValueFill)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
        <p className="sr-only">
          Chart shows projected net worth ending at {final ? fmtCurrency(final.value) : 'zero'} with
          invested capital {final ? fmtCurrency(final.invested) : 'zero'}.
        </p>
      </CardContent>
    </Card>
  )
}
