import { Pie, PieChart, Cell } from 'recharts'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@workspace/ui/components/ui/chart'
import type { AllocationSnapshot } from '@workspace/domain'
import { getChartTokenColor } from '../lib/format-utils'

interface AllocationComparisonProps {
  today: AllocationSnapshot[]
  projected: AllocationSnapshot[]
  projectedLabel?: string
}

function AllocationDonut({
  title,
  data,
}: {
  title: string
  data: AllocationSnapshot[]
}) {
  const chartData = data
    .filter((d) => d.value > 0)
    .map((d, i) => ({
      ...d,
      fill: getChartTokenColor(i),
    }))

  const chartConfig: ChartConfig = Object.fromEntries(
    chartData.map((d) => [d.name, { label: d.name, color: d.fill }]),
  )

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No allocation data</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} chartType="pie" className="h-[220px] w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(_value, name, item) => (
                    <span>
                      {name}: {item.payload.percentage}%
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
              innerRadius={45}
              outerRadius={75}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <ul className="mt-2 space-y-1">
          {chartData.map((d) => (
            <li key={d.name} className="flex justify-between text-xs">
              <span>{d.name}</span>
              <span className="tabular-nums font-medium">{d.percentage}%</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function AllocationComparison({
  today,
  projected,
  projectedLabel = 'Projected',
}: AllocationComparisonProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <AllocationDonut title="Today" data={today} />
      <AllocationDonut title={projectedLabel} data={projected} />
    </div>
  )
}
