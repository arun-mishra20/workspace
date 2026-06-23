import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Layers } from 'lucide-react'
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
import {
  ChartWithSideLegend,
  type ChartLegendItem,
} from '@/features/expenses/components/analytics/chart-with-side-legend'
import { topNWithOther } from '@/features/expenses/components/analytics/chart-data-utils'
import { AnalyticsEmptyHint, type AnalyticsEmptyAction } from '@/features/expenses/components/analytics/analytics-empty-hint'
import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import { CategoryIcon } from '@/features/expenses/components/category-icon'
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

interface CategoryBreakdownCardProps {
  data: CategoryChartItem[]
  chartConfig: ChartConfig
  loading: boolean
  getCategoryHref?: (category: string) => string
  emptyActions?: AnalyticsEmptyAction[]
}

export function CategoryBreakdownCard({
  data,
  chartConfig,
  loading,
  getCategoryHref,
  emptyActions,
}: CategoryBreakdownCardProps) {
  const navigate = useNavigate()
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

  const legendItems = useMemo<ChartLegendItem[]>(
    () =>
      displayData.map((item) => ({
        key: item.category,
        label: item.displayName,
        amount: item.amount,
        color: item.chartColor,
        icon:
          item.category === '__other__' ? undefined : (
            <CategoryIcon category={item.category} size={14} />
          ),
        href:
          item.category !== '__other__'
            ? getCategoryHref?.(item.category)
            : undefined,
      })),
    [displayData, getCategoryHref],
  )

  const handleCategoryClick = (category: string) => {
    const href = getCategoryHref?.(category)
    if (href) {
      void navigate(href)
    }
  }

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
          <AnalyticsEmptyHint
            title="No category data for this period."
            actions={emptyActions}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">By Category</CardTitle>
              <CardDescription>Where your money goes</CardDescription>
            </div>
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
        <Separator className="w-full mt-2" />
      </CardHeader>
      <CardContent>
        {view === 'table' ? (
          <div className="divide-y">
            {displayData.map((c) => {
              const row = (
                <>
                  <div className="flex items-center gap-3">
                    {c.category === '__other__' ? (
                      <div
                        className="size-3 rounded-full"
                        style={{ backgroundColor: c.chartColor }}
                      />
                    ) : (
                      <CategoryIcon category={c.category} size={14} />
                    )}
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
          <ChartContainer config={chartConfig} className="mx-auto h-72 w-full max-w-2xl">
            <Treemap
              data={displayData.map((item) => ({
                name: item.displayName,
                category: item.category,
                size: item.amount,
                fill: item.chartColor,
              }))}
              dataKey="size"
              nameKey="name"
              aspectRatio={4 / 3}
              stroke="var(--color-border)"
              onClick={(node) => {
                const category = node?.category as string | undefined
                if (category && category !== '__other__') {
                  handleCategoryClick(category)
                }
              }}
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
          <ChartWithSideLegend items={legendItems}>
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square h-64 w-full"
            >
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
                <RadialBar dataKey="amount" background cornerRadius={4} />
              </RadialBarChart>
            </ChartContainer>
          </ChartWithSideLegend>
        ) : (
          <ChartWithSideLegend items={legendItems}>
            <ChartContainer
              config={chartConfig}
              chartType="pie"
              className="mx-auto aspect-square h-64 w-full"
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
                  outerRadius={100}
                  paddingAngle={2}
                  cursor="pointer"
                  onClick={(_data, index) => {
                    const entry = displayData[index]
                    if (entry && entry.category !== '__other__') {
                      handleCategoryClick(entry.category)
                    }
                  }}
                >
                  {displayData.map((entry) => (
                    <Cell key={entry.category} fill={entry.chartColor} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </ChartWithSideLegend>
        )}
      </CardContent>
    </Card>
  )
}
