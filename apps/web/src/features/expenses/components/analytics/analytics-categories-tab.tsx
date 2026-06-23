import { Tags } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'

import { AnalyticsEmptyHint } from '@/features/expenses/components/analytics/analytics-empty-hint'
import {
  buildSparsePeriodActions,
  type AnalyticsFilterActions,
} from '@/features/expenses/components/analytics/analytics-filter-actions'
import { CategoryBreakdownCard } from '@/features/expenses/components/analytics/category-breakdown-card'
import { PeriodComparisonSection } from '@/features/expenses/components/analytics/period-comparison-section'
import {
  fmtCompact,
  fmtCurrency,
} from '@/features/expenses/components/analytics/analytics-utils'
import { useAnalyticsDrillDown } from '@/features/expenses/hooks/use-analytics-drill-down'
import type { AnalyticsPeriod, PeriodComparison } from '@workspace/domain'
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
import { Separator } from '@workspace/ui/components/ui/separator'
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
  category: string
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
  periodComparison?: PeriodComparison
  periodComparisonLoading: boolean
  filterActions?: AnalyticsFilterActions
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
  periodComparison,
  periodComparisonLoading,
  filterActions,
}: AnalyticsCategoriesTabProps) {
  const drillDown = useAnalyticsDrillDown()
  const navigate = useNavigate()

  const sparseActions = buildSparsePeriodActions(filterActions ?? {}, {
    hasCardFilter: selectedCardLast4 != null,
    period,
  })

  return (
    <div className="flex flex-col gap-6">
      <PeriodComparisonSection
        data={periodComparison}
        loading={periodComparisonLoading}
        period={period}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <CategoryBreakdownCard
          data={categoryChartData}
          chartConfig={categoryChartConfig}
          loading={categoryLoading}
          getCategoryHref={(category) =>
            drillDown({
              period,
              cardLast4: selectedCardLast4,
              category,
            })
          }
          emptyActions={sparseActions}
        />

        <Card className="xl:self-start">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Tags className="size-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">By Subcategory</CardTitle>
              <CardDescription>
                Finer-grained spend by category and subcategory — each bar is
                scoped to one category
              </CardDescription>
              </div>
            </div>
            <Separator className="w-full mt-2" />
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
                  <Bar
                    dataKey="amount"
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(barData) => {
                      const payload =
                        (
                          barData as {
                            payload?: {
                              category?: string
                              subcategory?: string
                            }
                          }
                        ).payload ??
                        (barData as {
                          category?: string
                          subcategory?: string
                        })

                      if (payload?.subcategory && payload?.category) {
                        void navigate(
                          drillDown({
                            period,
                            cardLast4: selectedCardLast4,
                            category: payload.category,
                            subcategory: payload.subcategory,
                          }),
                        )
                      }
                    }}
                  >
                    {subcategoryChartData.map((entry) => (
                      <Cell
                        key={`${entry.category}:${entry.subcategory}`}
                        fill={entry.chartColor}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <AnalyticsEmptyHint
                title="No subcategory data yet. Reprocess transactions to enrich subcategories."
                actions={sparseActions}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
