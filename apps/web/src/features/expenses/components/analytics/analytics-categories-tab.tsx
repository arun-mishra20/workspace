import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'

import { CategoryBreakdownCard } from '@/features/expenses/components/analytics/category-breakdown-card'
import {
  fmtCompact,
  fmtCurrency,
} from '@/features/expenses/components/analytics/analytics-utils'
import { buildExpensesDrillDownUrl } from '@/features/expenses/lib/build-expenses-drill-down-url'
import type { AnalyticsPeriod } from '@workspace/domain'
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
import { Skeleton } from '@workspace/ui/components/ui/skeleton'

type CategoryChartItem = {
  category: string
  displayName: string
  parent?: string | null
  amount: number
  count: number
  chartColor: string
}

type SubcategoryChartItem = {
  subcategory: string
  displayName: string
  amount: number
  count: number
  chartColor: string
}

interface AnalyticsCategoriesTabProps {
  period: AnalyticsPeriod
  selectedCardLast4?: string
  categoryChartData: CategoryChartItem[]
  categoryChartConfig: ChartConfig
  categoryLoading: boolean
  subcategoryChartData: SubcategoryChartItem[]
  subcategoryChartConfig: ChartConfig
  subcategoryLoading: boolean
}

export function AnalyticsCategoriesTab({
  period,
  selectedCardLast4,
  categoryChartData,
  categoryChartConfig,
  categoryLoading,
  subcategoryChartData,
  subcategoryChartConfig,
  subcategoryLoading,
}: AnalyticsCategoriesTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <CategoryBreakdownCard
        data={categoryChartData}
        chartConfig={categoryChartConfig}
        loading={categoryLoading}
        getCategoryHref={(category) =>
          buildExpensesDrillDownUrl({
            period,
            cardLast4: selectedCardLast4,
            category,
          })
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Subcategory</CardTitle>
          <CardDescription>
            Finer-grained spend breakdown (investments, transport,
            subscriptions, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subcategoryLoading ? (
            <Skeleton className="h-75 w-full" />
          ) : subcategoryChartData.length > 0 ? (
            <ChartContainer
              config={subcategoryChartConfig}
              className="h-75 w-full"
            >
              <BarChart
                data={subcategoryChartData}
                layout="vertical"
                margin={{ left: 8, right: 16 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={fmtCompact}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis
                  type="category"
                  dataKey="displayName"
                  width={160}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <ChartTooltip
                  wrapperStyle={{ zIndex: 100 }}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <span className="font-mono font-medium tabular-nums">
                          {fmtCurrency(Number(value))}
                        </span>
                      )}
                    />
                  }
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {subcategoryChartData.map((entry) => (
                    <Cell key={entry.subcategory} fill={entry.chartColor} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No subcategory data yet. Reprocess transactions to enrich
              subcategories.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
