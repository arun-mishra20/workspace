import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'
import { Cell, Pie, PieChart, XAxis, YAxis, Bar, BarChart, CartesianGrid } from 'recharts'

import {
  fmtCurrency,
  getChartTokenColor,
} from '@/features/expenses/components/analytics/analytics-utils'
import {
  ChartWithSideLegend,
  type ChartLegendItem,
} from '@/features/expenses/components/analytics/chart-with-side-legend'
import { AnalyticsEmptyHint } from '@/features/expenses/components/analytics/analytics-empty-hint'
import {
  buildSparsePeriodActions,
  type AnalyticsFilterActions,
} from '@/features/expenses/components/analytics/analytics-filter-actions'
import { useAnalyticsDrillDown } from '@/features/expenses/hooks/use-analytics-drill-down'
import type {
  AnalyticsPeriod,
  ClassificationHealth,
  SpendAnomalies,
} from '@workspace/domain'
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
  ChartTooltip,
  ChartTooltipContent,
} from '@workspace/ui/components/ui/chart'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/ui/table'

interface AnalyticsDataQualityTabProps {
  period: AnalyticsPeriod
  selectedCardLast4?: string
  health?: ClassificationHealth
  healthLoading: boolean
  anomalies?: SpendAnomalies
  anomaliesLoading: boolean
  filterActions?: AnalyticsFilterActions
  onCreateRuleForMerchant?: (merchant: string) => void
}

export function AnalyticsDataQualityTab({
  period,
  selectedCardLast4,
  health,
  healthLoading,
  anomalies,
  anomaliesLoading,
  filterActions,
  onCreateRuleForMerchant,
}: AnalyticsDataQualityTabProps) {
  const drillDown = useAnalyticsDrillDown()

  const sparseActions = buildSparsePeriodActions(filterActions ?? {}, {
    hasCardFilter: selectedCardLast4 != null,
    period,
  })

  const reviewHref = drillDown({
    period,
    cardLast4: selectedCardLast4,
    review: 'true',
  })

  const uncategorizedHref = drillDown({
    period,
    cardLast4: selectedCardLast4,
    category: 'uncategorized',
  })

  const methodChartData = (health?.byMethod ?? []).map((item, index) => ({
    ...item,
    label: item.method.replace(/_/g, ' '),
    chartColor: getChartTokenColor(index),
  }))

  const confidenceChartData = (health?.confidenceBuckets ?? []).map(
    (item, index) => ({
      ...item,
      chartColor: getChartTokenColor(index),
    }),
  )

  const methodChartConfig: ChartConfig = Object.fromEntries(
    methodChartData.map((item) => [
      item.method,
      { label: item.label, color: item.chartColor },
    ]),
  )

  const confidenceChartConfig: ChartConfig = Object.fromEntries(
    confidenceChartData.map((item) => [
      item.bucket,
      { label: item.label, color: item.chartColor },
    ]),
  )

  const confidenceLegendItems: ChartLegendItem[] = confidenceChartData.map(
    (item) => ({
      key: item.bucket,
      label: item.label,
      amount: item.count,
      color: item.chartColor,
    }),
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending review</CardDescription>
            <CardTitle className="text-2xl">
              {healthLoading ? '—' : health?.reviewPending ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link to={reviewHref}>
                Open review queue
                <ExternalLink className="ml-1.5 size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Uncategorized</CardDescription>
            <CardTitle className="text-2xl">
              {healthLoading ? '—' : health?.uncategorizedCount ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              of {health?.totalTransactions ?? 0} transactions this period
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to={uncategorizedHref}>
                View uncategorized
                <ExternalLink className="ml-1.5 size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Classification methods</CardDescription>
            <CardTitle className="text-2xl">
              {healthLoading ? '—' : health?.byMethod.length ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Distinct methods used this period
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">By classification method</CardTitle>
                <CardDescription>How transactions were categorized</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : methodChartData.length > 0 ? (
              <ChartContainer config={methodChartConfig} className="h-60 w-full">
                <BarChart data={methodChartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} width={40} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={4}>
                    {methodChartData.map((entry) => (
                      <Cell key={entry.method} fill={entry.chartColor} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No data.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Confidence distribution</CardTitle>
                <CardDescription>Classification confidence buckets</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <Skeleton className="mx-auto size-55 rounded-full" />
            ) : confidenceChartData.length > 0 ? (
              <ChartWithSideLegend
                items={confidenceLegendItems}
                formatValue={(value) => String(value)}
              >
                <ChartContainer
                  config={confidenceChartConfig}
                  chartType="pie"
                  className="mx-auto aspect-square h-56 w-full"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={confidenceChartData}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={50}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {confidenceChartData.map((entry) => (
                        <Cell key={entry.bucket} fill={entry.chartColor} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </ChartWithSideLegend>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top uncategorized merchants</CardTitle>
          <CardDescription>
            Highest spend still uncategorized — create a rule to fix recurring gaps
          </CardDescription>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (health?.topUncategorizedMerchants.length ?? 0) > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {health!.topUncategorizedMerchants.map((row) => (
                  <TableRow key={row.merchant}>
                    <TableCell className="font-medium">{row.merchant}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtCurrency(row.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            to={drillDown({
                              period,
                              cardLast4: selectedCardLast4,
                              merchant: row.merchant,
                              category: 'uncategorized',
                            })}
                          >
                            View
                          </Link>
                        </Button>
                        {onCreateRuleForMerchant ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onCreateRuleForMerchant(row.merchant)}
                          >
                            Create rule
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <AnalyticsEmptyHint
              title="No uncategorized merchants in this period."
              actions={sparseActions}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Spending anomalies</CardTitle>
              <CardDescription>Unusual patterns detected this period</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {anomaliesLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (anomalies?.anomalies.length ?? 0) > 0 ? (
            anomalies!.anomalies.map((anomaly, index) => (
              <div
                key={`${anomaly.type}-${index}`}
                className="flex items-start justify-between gap-4 rounded-lg border p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{anomaly.label}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {anomaly.type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {anomaly.description}
                  </p>
                </div>
                {anomaly.amount !== undefined ? (
                  <span className="text-sm font-semibold tabular-nums">
                    {fmtCurrency(anomaly.amount)}
                  </span>
                ) : null}
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No anomalies detected.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
