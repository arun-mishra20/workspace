import { Pie, PieChart, Cell } from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@workspace/ui/components/ui/chart'
import type { SummaryMetrics } from '@workspace/domain'
import { fmtCurrency } from '../lib/format-utils'
import { getChartTokenColor } from '../lib/format-utils'

interface InvestedVsGainsDonutProps {
  summary: SummaryMetrics
}

export function InvestedVsGainsDonut({ summary }: InvestedVsGainsDonutProps) {
  const chartData = [
    {
      name: 'Invested',
      value: summary.totalInvested,
      fill: getChartTokenColor(0),
    },
    {
      name: 'Gains',
      value: Math.max(0, summary.estimatedReturns),
      fill: getChartTokenColor(1),
    },
  ].filter((d) => d.value > 0)

  if (chartData.length === 0) return null

  const chartConfig: ChartConfig = {
    Invested: { label: 'Invested', color: getChartTokenColor(0) },
    Gains: { label: 'Gains', color: getChartTokenColor(1) },
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Invested vs Gains</CardTitle>
        <CardDescription>
          Corpus breakdown at end of projection
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} chartType="pie" className="h-[260px] w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <span className="font-semibold tabular-nums">
                      {name}: {fmtCurrency(value as number)}
                    </span>
                  )}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
