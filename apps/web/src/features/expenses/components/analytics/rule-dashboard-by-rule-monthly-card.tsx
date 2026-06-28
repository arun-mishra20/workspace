import { format, parseISO } from 'date-fns'
import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'

import {
  fmtCompact,
  fmtCurrency,
  getChartTokenColor,
} from '@/features/expenses/components/analytics/analytics-utils'
import type { RuleDashboardByRuleMonthlyItem } from '@workspace/domain'
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@workspace/ui/components/ui/chart'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'

interface RuleDashboardByRuleMonthlyCardProps {
  byRuleMonthly?: RuleDashboardByRuleMonthlyItem[]
  loading: boolean
}

export function RuleDashboardByRuleMonthlyCard({
  byRuleMonthly,
  loading,
}: RuleDashboardByRuleMonthlyCardProps) {
  const { chartData, chartConfig, ruleKeys } = useMemo(() => {
    if (!byRuleMonthly || byRuleMonthly.length === 0) {
      return { chartData: [], chartConfig: {}, ruleKeys: [] as string[] }
    }

    const rules = [...new Map(
      byRuleMonthly.map((item) => [item.ruleId, item.name]),
    ).entries()]
    const months = [...new Set(byRuleMonthly.map((item) => item.month))].sort()
    const config: ChartConfig = Object.fromEntries(
      rules.map(([ruleId, name], index) => [
        ruleId,
        { label: name, color: getChartTokenColor(index) },
      ]),
    )

    const data = months.map((month) => {
      const row: Record<string, string | number> = { month }
      for (const [ruleId] of rules) {
        const item = byRuleMonthly.find(
          (entry) => entry.ruleId === ruleId && entry.month === month,
        )
        row[ruleId] = item?.amount ?? 0
      }
      return row
    })

    return {
      chartData: data,
      chartConfig: config,
      ruleKeys: rules.map(([ruleId]) => ruleId),
    }
  }, [byRuleMonthly])

  if (!loading && chartData.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Spend by rule over time</CardTitle>
        <CardDescription>
          Monthly breakdown when multiple rules are combined
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-56 w-full">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={(value: string) => {
                  try {
                    return format(parseISO(`${value}-01`), 'MMM yy')
                  } catch {
                    return value
                  }
                }}
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                tickFormatter={fmtCompact}
                tickLine={false}
                axisLine={false}
                width={50}
                fontSize={12}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => fmtCurrency(Number(value))}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              {ruleKeys.map((ruleId, index) => (
                <Bar
                  key={ruleId}
                  dataKey={ruleId}
                  stackId="rules"
                  fill={getChartTokenColor(index)}
                  radius={index === ruleKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
