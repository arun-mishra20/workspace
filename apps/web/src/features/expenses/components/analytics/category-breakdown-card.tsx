import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Cell, Pie, PieChart } from 'recharts'

import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import { Badge } from '@workspace/ui/components/ui/badge'
import { Button } from '@workspace/ui/components/ui/button'
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
  const [view, setView] = useState<'chart' | 'table'>('chart')

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
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <Button
              type="button"
              size="sm"
              variant={view === 'chart' ? 'default' : 'ghost'}
              className="h-7 px-3 text-xs"
              onClick={() => setView('chart')}
            >
              Chart
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === 'table' ? 'default' : 'ghost'}
              className="h-7 px-3 text-xs"
              onClick={() => setView('table')}
            >
              Table
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {view === 'chart' ? (
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
                data={data}
                dataKey="amount"
                nameKey="category"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.category} fill={entry.chartColor} />
                ))}
              </Pie>
              <ChartLegend
                content={<ChartLegendContent nameKey="category" />}
              />
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="divide-y">
            {data.map((c) => {
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
                    {c.parent && (
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {c.parent}
                      </Badge>
                    )}
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
              if (href) {
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
        )}
      </CardContent>
    </Card>
  )
}
