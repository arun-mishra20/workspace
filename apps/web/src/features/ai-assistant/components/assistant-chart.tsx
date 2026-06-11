import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@workspace/ui/components/ui/chart'

import type { ChartSpec } from '@/features/ai-assistant/components/block-registry'

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
]

interface AssistantChartProps {
  spec: ChartSpec
}

function buildConfig(spec: ChartSpec): ChartConfig {
  if (spec.type === 'pie') {
    return Object.fromEntries(
      spec.data.map((d, i) => [
        String(d.label),
        {
          label: String(d.label),
          color: CHART_COLORS[i % CHART_COLORS.length],
        },
      ]),
    )
  }
  return Object.fromEntries(
    (spec.series ?? []).map((s, i) => [
      s.key,
      { label: s.label, color: CHART_COLORS[i % CHART_COLORS.length] },
    ]),
  )
}

export function AssistantChart({ spec }: AssistantChartProps) {
  if (!spec.data || spec.data.length === 0) return null

  const config = buildConfig(spec)
  const series = spec.series ?? []

  const commonCartesianChart = (children: React.ReactNode) => (
    <ChartContainer config={config} className="h-[260px] w-full">
      {children}
    </ChartContainer>
  )

  let chart: React.ReactNode = null

  switch (spec.type) {
    case 'bar': {
      chart = commonCartesianChart(
        <BarChart data={spec.data as Record<string, string | number>[]}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey={spec.xKey}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            width={48}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          {series.length > 1 && (
            <ChartLegend content={<ChartLegendContent />} />
          )}
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>,
      )

      break
    }
    case 'line': {
      chart = commonCartesianChart(
        <LineChart data={spec.data as Record<string, string | number>[]}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey={spec.xKey}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            width={48}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          {series.length > 1 && (
            <ChartLegend content={<ChartLegendContent />} />
          )}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>,
      )

      break
    }
    case 'area': {
      chart = commonCartesianChart(
        <AreaChart data={spec.data as Record<string, string | number>[]}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey={spec.xKey}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            width={48}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          {series.length > 1 && (
            <ChartLegend content={<ChartLegendContent />} />
          )}
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          ))}
        </AreaChart>,
      )

      break
    }
    case 'pie': {
      const pieData = spec.data.map((d, i) => ({
        ...d,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      }))
      chart = (
        <ChartContainer
          config={config}
          chartType="pie"
          className="h-[260px] w-full"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
            <ChartLegend content={<ChartLegendContent nameKey="label" />} />
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={90}
            />
          </PieChart>
        </ChartContainer>
      )

      break
    }
    // No default
  }

  if (!chart) return null

  return (
    <Card className="my-3 overflow-hidden">
      {spec.title && (
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm font-medium text-foreground">
            {spec.title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={spec.title ? 'px-3 pb-3 pt-0' : 'p-3'}>
        {chart}
      </CardContent>
    </Card>
  )
}
