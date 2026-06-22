import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  Treemap,
} from 'recharts'

import {
  ChartCardToolbar,
  type ChartCardView,
} from '@/features/expenses/components/analytics/chart-card-toolbar'
import { topNWithOther } from '@/features/expenses/components/analytics/chart-data-utils'
import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import { Badge } from '@workspace/ui/components/ui/badge'
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

type CategoryChartItem = {
  category: string
  displayName: string
  parent?: string | null
  amount: number
  count: number
  chartColor: string
}

interface CategoryBreakdownCardProps {
  data: CategoryChartItem[]
  chartConfig: ChartConfig
  loading: boolean
  getCategoryHref?: (category: string) => string
}

export function CategoryBreakdownCard({
  data,
  chartConfig,
  loading,
  getCategoryHref,
}: CategoryBreakdownCardProps) {
  const [view, setView] = useState<ChartCardView>('chart')
  const [topN, setTopN] = useState(6)

  const displayData = useMemo(
    () =>
      topNWithOther(data, topN, (rest) => ({
        category: '__other__',
        displayName: 'Other',
        parent: null,
        amount: rest.reduce((sum, item) => sum + item.amount, 0),
        count: rest.reduce((sum, item) => sum + item.count, 0),
        chartColor: 'var(--color-muted-foreground)',
      })),
    [data, topN],
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Category</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="mx-auto size-55 rounded-full" />
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Category</CardTitle>
          <CardDescription>Where your money goes</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-12 text-center text-sm text-muted-foreground">
            No category data for this period.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">By Category</CardTitle>
            <CardDescription>Where your money goes</CardDescription>
          </div>
          <ChartCardToolbar
            view={view}
            onViewChange={setView}
            views={['chart', 'treemap', 'radial', 'table']}
            showTopN
            topN={topN}
            onTopNChange={setTopN}
          />
        </div>
      </CardHeader>
      <CardContent>
        {view === 'table' ? (
          <div className="divide-y">
            {displayData.map((c) => {
              const row = (
                <>
                  <div className="flex items-center gap-3">
                    <div
                      className="size-3 rounded-full"
                      style={{ backgroundColor: c.chartColor }}
                    />
                    <span className="text-sm font-medium capitalize">
                      {c.displayName}
                    </span>
                    {c.parent ? (
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {c.parent}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="tabular-nums">
                      {c.count} txns
                    </Badge>
                    <span className="min-w-25 text-right text-sm font-semibold tabular-nums">
                      {fmtCurrency(c.amount)}
                    </span>
                  </div>
                </>
              )

              const href = getCategoryHref?.(c.category)
              if (href && c.category !== '__other__') {
                return (
                  <Link
                    key={c.category}
                    to={href}
                    className="flex items-center justify-between py-3 transition-colors hover:bg-muted/50 rounded-sm px-1 -mx-1"
                  >
                    {row}
                  </Link>
                )
              }

              return (
                <div
                  key={c.category}
                  className="flex items-center justify-between py-3"
                >
                  {row}
                </div>
              )
            })}
          </div>
        ) : view === 'treemap' ? (
          <ChartContainer config={chartConfig} className="mx-auto h-80 w-full">
            <Treemap
              data={displayData.map((item) => ({
                name: item.displayName,
                size: item.amount,
                fill: item.chartColor,
              }))}
              dataKey="size"
              nameKey="name"
              aspectRatio={4 / 3}
              stroke="var(--color-border)"
            >
              <ChartTooltip
                wrapperStyle={{ zIndex: 100 }}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {String(name)}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {fmtCurrency(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
            </Treemap>
          </ChartContainer>
        ) : view === 'radial' ? (
          <ChartContainer config={chartConfig} className="mx-auto h-80 w-full">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="20%"
              outerRadius="90%"
              data={displayData.map((item) => ({
                ...item,
                fill: item.chartColor,
              }))}
              startAngle={90}
              endAngle={-270}
            >
              <ChartTooltip
                wrapperStyle={{ zIndex: 100 }}
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {item.payload?.displayName ?? String(item.name)}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {fmtCurrency(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <RadialBar
                dataKey="amount"
                background
                cornerRadius={4}
                label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }}
              />
            </RadialBarChart>
          </ChartContainer>
        ) : (
          <ChartContainer
            config={chartConfig}
            chartType="pie"
            className="mx-auto aspect-square h-80"
          >
            <PieChart>
              <ChartTooltip
                wrapperStyle={{ zIndex: 100 }}
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {item.payload?.displayName ??
                            String(item.name).replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {fmtCurrency(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Pie
                data={displayData}
                dataKey="amount"
                nameKey="category"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={2}
              >
                {displayData.map((entry) => (
                  <Cell key={entry.category} fill={entry.chartColor} />
                ))}
              </Pie>
              <ChartLegend
                content={<ChartLegendContent nameKey="category" />}
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
