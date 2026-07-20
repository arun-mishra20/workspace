import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'

import { EmptyState } from '@/components/empty-state'
import { MainLayout } from '@/components/layouts'
import { DataTablePagination } from '@/components/data-table'
import { useClientPagination } from '@/hooks/use-client-pagination'
import { fetchBusAnalytics } from '@/features/expenses/api/bus-analytics'
import { fetchInvestmentAnalytics } from '@/features/expenses/api/investment-analytics'
import { PrincipalInvestmentTab } from '@/features/principal/components/principal-tab'

import type {
  AnalyticsPeriod,
  BusAnalytics,
  InvestmentAnalytics,
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
  ChartLegend,
  ChartLegendContent,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/ui/tabs'
import {
  Bus,
  Calendar,
  Clock,
  IndianRupee,
  MapPin,
  TrendingUp,
  Coins,
  Activity,
  Repeat,
  Wallet,
} from 'lucide-react'
import { Separator } from '@workspace/ui/components/ui/separator'

// ── Helpers ──

const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: '30 days', value: 'month' },
  { label: '90 days', value: 'quarter' },
  { label: '1 year', value: 'year' },
]

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)

const DAY_COLORS: Record<string, string> = {
  Mon: 'var(--color-chart-1)',
  Tue: 'var(--color-chart-2)',
  Wed: 'var(--color-chart-3)',
  Thu: 'var(--color-chart-4)',
  Fri: 'var(--color-chart-5)',
  Sat: 'var(--color-chart-1)',
  Sun: 'var(--color-chart-2)',
}

// ── Chart Configs ──

const monthlyChartConfig: ChartConfig = {
  trips: { label: 'Trips', color: 'var(--color-chart-1)' },
  amount: { label: 'Spent', color: 'var(--color-chart-2)' },
}

const dayOfWeekChartConfig: ChartConfig = {
  trips: { label: 'Trips', color: 'var(--color-chart-1)' },
}

const timeOfDayChartConfig: ChartConfig = {
  trips: { label: 'Trips', color: 'var(--color-chart-3)' },
}

const dailyFrequencyChartConfig: ChartConfig = {
  trips: { label: 'Trips', color: 'var(--color-chart-4)' },
}

// ── Section Header ──

function SectionHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="space-y-1 pt-2">
      <Separator />
      <h2 className="pt-2 font-serif text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

// ── Summary Cards ──

function SummaryCards({ data }: { data: BusAnalytics }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[12.5px] font-semibold text-muted-foreground">
            Total spent
          </CardTitle>
          <span data-slot="badge">
            <IndianRupee className="text-primary h-4 w-4" />
          </span>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-[1.8rem] font-semibold tracking-tight tabular-nums">
            {fmtCurrency(data.totalSpent)}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            across {data.totalTrips} trips
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[12.5px] font-semibold text-muted-foreground">
            Avg fare
          </CardTitle>
          <span data-slot="badge">
            <TrendingUp className="text-primary h-4 w-4" />
          </span>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-[1.8rem] font-semibold tracking-tight tabular-nums">
            {fmtCurrency(data.avgFare)}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">per bus trip</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[12.5px] font-semibold text-muted-foreground">
            Unique buses
          </CardTitle>
          <span data-slot="badge">
            <Bus className="text-primary h-4 w-4" />
          </span>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-[1.8rem] font-semibold tracking-tight tabular-nums">
            {data.uniqueBuses}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            different bus numbers
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[12.5px] font-semibold text-muted-foreground">
            Trip range
          </CardTitle>
          <span data-slot="badge">
            <Calendar className="text-primary h-4 w-4" />
          </span>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-[1.8rem] font-semibold tracking-tight tabular-nums">
            {data.firstTrip ? format(parseISO(data.firstTrip), 'dd MMM') : '—'}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {data.lastTrip
              ? `to ${format(parseISO(data.lastTrip), 'dd MMM yyyy')}`
              : 'no trips yet'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Top Bus Routes Table ──

function TopRoutesTable({ routes }: { routes: BusAnalytics['routes'] }) {
  const {
    paginatedItems,
    page,
    pageSize,
    totalItems,
    setPage,
    setPageSize,
  } = useClientPagination(routes)

  if (routes.length === 0) return null

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Top Bus Routes
        </CardTitle>
        <CardDescription>
          Most frequently taken buses, ranked by trip count
        </CardDescription>
        <Separator className="w-full mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bus #</TableHead>
              <TableHead className="text-center">Trips</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Avg Fare</TableHead>
              <TableHead className="text-right">Last Trip</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((r) => (
              <TableRow key={r.busNumber}>
                <TableCell className="font-mono font-medium">
                  {r.busNumber}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{r.tripCount}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {fmtCurrency(r.totalSpent)}
                </TableCell>
                <TableCell className="text-right">
                  {fmtCurrency(r.avgFare)}
                </TableCell>
                <TableCell className="text-muted-foreground text-right text-sm">
                  {format(parseISO(r.lastTrip), 'dd MMM yyyy')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <DataTablePagination
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="routes"
          className="border-none pt-0"
        />
      </CardContent>
    </Card>
  )
}

// ── Monthly Trend Chart ──

function MonthlyTrendChart({ data }: { data: BusAnalytics['monthlyTrend'] }) {
  if (data.length === 0) return null

  const chartData = data.map((d) => ({
    ...d,
    label: format(parseISO(d.month + '-01'), 'MMM yy'),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Monthly Bus Spending
        </CardTitle>
        <CardDescription>Trips and spend per month</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={monthlyChartConfig}
          className="h-[300px] w-full"
        >
          <BarChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `₹${v}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {name === 'amount' ? 'Amount' : 'Trips'}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {name === 'amount'
                          ? fmtCurrency(value as number)
                          : `${value} trips`}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              yAxisId="left"
              dataKey="trips"
              fill="var(--color-chart-1)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="amount"
              fill="var(--color-chart-2)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── Day of Week Chart ──

function DayOfWeekChart({ data }: { data: BusAnalytics['dayOfWeek'] }) {
  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Trips by Day of Week
        </CardTitle>
        <CardDescription>Which days you ride the most</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={dayOfWeekChartConfig}
          className="h-[250px] w-full"
        >
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="dayName" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {name === 'trips' ? 'Trips' : 'Amount'}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {name === 'trips'
                          ? `${value} trips`
                          : fmtCurrency(value as number)}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="trips" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <rect
                  key={entry.dayName}
                  fill={DAY_COLORS[entry.dayName] ?? 'var(--color-chart-1)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── Time of Day Chart ──

function TimeOfDayChart({ data }: { data: BusAnalytics['timeOfDay'] }) {
  if (data.length === 0) return null

  const chartData = data.map((d) => ({
    ...d,
    label: `${d.hour.toString().padStart(2, '0')}:00`,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Time of Day
        </CardTitle>
        <CardDescription>When you typically take the bus</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={timeOfDayChartConfig}
          className="h-[250px] w-full"
        >
          <BarChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Trips</span>
                      <span className="font-mono font-medium tabular-nums">
                        {value} trips
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="trips"
              fill="var(--color-chart-3)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── Daily Frequency Timeline ──

function DailyFrequencyChart({
  data,
}: {
  data: BusAnalytics['dailyFrequency']
}) {
  if (data.length === 0) return null

  const chartData = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), 'dd MMM'),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Daily Trip Timeline
        </CardTitle>
        <CardDescription>
          Number of bus trips per day over the selected period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={dailyFrequencyChartConfig}
          className="h-[250px] w-full"
        >
          <LineChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Trips</span>
                      <span className="font-mono font-medium tabular-nums">
                        {value} trips
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="trips"
              stroke="var(--color-chart-4)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── Loading Skeleton ──

function BusTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="mt-1 h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

// ── Bus Tab ──

function BusPatternTab({ period }: { period: AnalyticsPeriod }) {
  const { data, isLoading } = useQuery({
    queryKey: ['patterns', 'bus', period],
    queryFn: () => fetchBusAnalytics(period),
  })

  return (
    <div className="space-y-6">
      {isLoading && <BusTabSkeleton />}

      {!isLoading && (!data || data.totalTrips === 0) && (
        <EmptyState
          icon={Bus}
          title="No bus transactions found"
          description="Bus transactions are identified by merchant names matching vehicle registration patterns (e.g., KA01AR4188, BMTC BUS KA57F0015)."
        />
      )}

      {!isLoading && data && data.totalTrips > 0 && (
        <div className="space-y-6">
          <SummaryCards data={data} />

          <SectionHeader
            title="Trends"
            description="Spending and trip frequency over time"
          />
          <MonthlyTrendChart data={data.monthlyTrend} />

          <SectionHeader
            title="Routes"
            description="Most frequently taken buses"
          />
          <TopRoutesTable routes={data.routes} />

          <SectionHeader
            title="Patterns"
            description="When you typically ride"
          />
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            <DayOfWeekChart data={data.dayOfWeek} />
            <TimeOfDayChart data={data.timeOfDay} />
            <DailyFrequencyChart data={data.dailyFrequency} />
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// INVESTMENTS TAB
// ══════════════════════════════════════════════════════════════════════════════

const ASSET_TYPE_LABELS: Record<string, string> = {
  stocks: 'Stocks',
  mutual_funds: 'Mutual Funds',
  gold: 'Gold',
}

const ASSET_TYPE_COLORS: Record<string, string> = {
  stocks: 'var(--color-chart-1)',
  mutual_funds: 'var(--color-chart-2)',
  gold: 'var(--color-chart-3)',
}

// ── Investment Summary Cards ──

function InvestmentSummaryCards({ data }: { data: InvestmentAnalytics }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[12.5px] font-semibold text-muted-foreground">
            Total invested
          </CardTitle>
          <IndianRupee className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="font-mono text-[1.8rem] font-semibold tracking-tight tabular-nums">
            {fmtCurrency(data.totalInvested)}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            across {data.transactionCount} transactions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[12.5px] font-semibold text-muted-foreground">
            Avg investment
          </CardTitle>
          <TrendingUp className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="font-mono text-[1.8rem] font-semibold tracking-tight tabular-nums">
            {fmtCurrency(data.avgInvestment)}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {data.avgDaysBetweenInvestments
              ? `every ${Math.round(data.avgDaysBetweenInvestments)} days`
              : 'per transaction'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[12.5px] font-semibold text-muted-foreground">
            Consistency score
          </CardTitle>
          <Activity className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="font-mono text-[1.8rem] font-semibold tracking-tight tabular-nums">
            {Math.round(data.consistencyScore)}%
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            months with investments
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[12.5px] font-semibold text-muted-foreground">
            Recent activity
          </CardTitle>
          <Calendar className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="font-mono text-[1.8rem] font-semibold tracking-tight tabular-nums">
            {data.daysSinceLastInvestment !== null
              ? `${data.daysSinceLastInvestment}d`
              : '—'}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {data.lastInvestment
              ? `since ${format(parseISO(data.lastInvestment), 'dd MMM')}`
              : 'no investments yet'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Asset Allocation Pie Chart ──

function AssetAllocationChart({
  data,
}: {
  data: InvestmentAnalytics['assetTypeBreakdown']
}) {
  if (data.length === 0) return null

  const chartData = data.map((asset) => ({
    name: ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType,
    value: asset.totalInvested,
    fill: ASSET_TYPE_COLORS[asset.assetType] ?? 'var(--color-chart-1)',
    percentage: asset.percentageOfTotal,
  }))

  const chartConfig: ChartConfig = Object.fromEntries(
    data.map((asset) => [
      ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType,
      {
        label: ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType,
        color: ASSET_TYPE_COLORS[asset.assetType] ?? 'var(--color-chart-1)',
      },
    ]),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Asset Allocation
        </CardTitle>
        <CardDescription>Investment distribution by asset type</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          chartType="pie"
          className="h-[300px] w-full"
        >
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex items-center gap-2">
                      <span>{name}:</span>
                      <span className="font-semibold">
                        {fmtCurrency(value as number)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        (
                        {chartData
                          .find((d) => d.name === name)
                          ?.percentage.toFixed(1)}
                        %)
                      </span>
                    </div>
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
              innerRadius={60}
              outerRadius={100}
              label={(entry) =>
                entry.percent ? `${(entry.percent * 100).toFixed(0)}%` : ''
              }
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── Asset Type Breakdown Table ──

function AssetBreakdownTable({
  data,
}: {
  data: InvestmentAnalytics['assetTypeBreakdown']
}) {
  const {
    paginatedItems,
    page,
    pageSize,
    totalItems,
    setPage,
    setPageSize,
  } = useClientPagination(data)

  if (data.length === 0) return null

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Asset Type Breakdown</CardTitle>
        <CardDescription>
          Detailed metrics for each investment category
        </CardDescription>
        <Separator className="w-full mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Type</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Count</TableHead>
              <TableHead className="text-right">Avg</TableHead>
              <TableHead className="text-right">Min</TableHead>
              <TableHead className="text-right">Max</TableHead>
              <TableHead className="text-right">% of Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((asset) => (
              <TableRow key={asset.assetType}>
                <TableCell className="font-medium">
                  {ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType}
                </TableCell>
                <TableCell className="text-right">
                  {fmtCurrency(asset.totalInvested)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{asset.transactionCount}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {fmtCurrency(asset.avgAmount)}
                </TableCell>
                <TableCell className="text-right">
                  {fmtCurrency(asset.minAmount)}
                </TableCell>
                <TableCell className="text-right">
                  {fmtCurrency(asset.maxAmount)}
                </TableCell>
                <TableCell className="text-right">
                  {asset.percentageOfTotal.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <DataTablePagination
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="asset types"
          className="border-none pt-0"
        />
      </CardContent>
    </Card>
  )
}

// ── Platform Breakdown Table ──

function PlatformBreakdownTable({
  data,
}: {
  data: InvestmentAnalytics['platformBreakdown']
}) {
  const {
    paginatedItems,
    page,
    pageSize,
    totalItems,
    setPage,
    setPageSize,
  } = useClientPagination(data)

  if (data.length === 0) return null

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Platform Distribution</CardTitle>
        <CardDescription>
          Investment activity across different platforms
        </CardDescription>
        <Separator className="w-full mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Transactions</TableHead>
              <TableHead className="text-right">Avg Amount</TableHead>
              <TableHead>Primary Asset</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((platform) => (
              <TableRow key={platform.platform}>
                <TableCell className="font-medium">
                  {platform.platform}
                </TableCell>
                <TableCell className="text-right">
                  {fmtCurrency(platform.totalInvested)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{platform.transactionCount}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {fmtCurrency(platform.avgAmount)}
                </TableCell>
                <TableCell>
                  {platform.primaryAssetType
                    ? (ASSET_TYPE_LABELS[platform.primaryAssetType] ??
                      platform.primaryAssetType)
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <DataTablePagination
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="platforms"
          className="border-none pt-0"
        />
      </CardContent>
    </Card>
  )
}

// ── Monthly Investment Trend (Stacked) ──

function MonthlyInvestmentTrendChart({
  data,
}: {
  data: InvestmentAnalytics['monthlyTrend']
}) {
  if (data.length === 0) return null

  const chartData = data.map((d) => ({
    ...d,
    label: format(parseISO(d.month + '-01'), 'MMM yy'),
  }))

  const chartConfig: ChartConfig = {
    stocks: { label: 'Stocks', color: 'var(--color-chart-1)' },
    mutualFunds: { label: 'Mutual Funds', color: 'var(--color-chart-2)' },
    gold: { label: 'Gold', color: 'var(--color-chart-3)' },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Monthly Investment Trend
        </CardTitle>
        <CardDescription>
          Investment breakdown by asset type over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {name === 'stocks'
                          ? 'Stocks'
                          : name === 'mutualFunds'
                            ? 'Mutual Funds'
                            : 'Gold'}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {fmtCurrency(value as number)}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="stocks"
              stackId="a"
              fill="var(--color-chart-1)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="mutualFunds"
              stackId="a"
              fill="var(--color-chart-2)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="gold"
              stackId="a"
              fill="var(--color-chart-3)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── Largest Investments Table ──

function LargestInvestmentsTable({
  data,
}: {
  data: InvestmentAnalytics['largestInvestments']
}) {
  const {
    paginatedItems,
    page,
    pageSize,
    totalItems,
    setPage,
    setPageSize,
  } = useClientPagination(data)

  if (data.length === 0) return null

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Largest Investments</CardTitle>
        <CardDescription>Top single transactions by amount</CardDescription>
        <Separator className="w-full mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Asset Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="text-muted-foreground text-sm">
                  {format(parseISO(inv.date), 'dd MMM yyyy')}
                </TableCell>
                <TableCell className="font-medium">{inv.merchant}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {ASSET_TYPE_LABELS[inv.assetType] ?? inv.assetType}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {fmtCurrency(inv.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <DataTablePagination
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="investments"
          className="border-none pt-0"
        />
      </CardContent>
    </Card>
  )
}

// ── SIP Detection Table ──

function SipDetectionTable({
  data,
}: {
  data: InvestmentAnalytics['detectedSips']
}) {
  const {
    paginatedItems,
    page,
    pageSize,
    totalItems,
    setPage,
    setPageSize,
  } = useClientPagination(data)

  if (data.length === 0) return null

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Repeat className="h-5 w-5" />
          Detected SIPs
        </CardTitle>
        <CardDescription>
          Recurring investments identified from transaction patterns
        </CardDescription>
        <Separator className="w-full mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>Asset Type</TableHead>
              <TableHead className="text-right">Avg Amount</TableHead>
              <TableHead className="text-center">Count</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead className="text-right">Last Investment</TableHead>
              <TableHead className="text-right">Estimated Next</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((sip) => (
              <TableRow key={sip.merchant}>
                <TableCell className="font-medium">{sip.merchant}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {ASSET_TYPE_LABELS[sip.assetType] ?? sip.assetType}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {fmtCurrency(sip.avgAmount)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge>{sip.transactionCount}</Badge>
                </TableCell>
                <TableCell>{sip.frequency}</TableCell>
                <TableCell className="text-muted-foreground text-right text-sm">
                  {format(parseISO(sip.lastInvestment), 'dd MMM yyyy')}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {sip.estimatedNext
                    ? format(parseISO(sip.estimatedNext), 'dd MMM yyyy')
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <DataTablePagination
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="SIPs"
          className="border-none pt-0"
        />
      </CardContent>
    </Card>
  )
}

// ── Investment Day of Week Chart ──

function InvestmentDayOfWeekChart({
  data,
}: {
  data: InvestmentAnalytics['dayOfWeek']
}) {
  if (data.length === 0) return null

  const chartConfig: ChartConfig = {
    transactionCount: { label: 'Investments', color: 'var(--color-chart-1)' },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Investment Day Patterns
        </CardTitle>
        <CardDescription>Which days you typically invest</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="dayName" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {name === 'transactionCount' ? 'Investments' : 'Amount'}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {name === 'transactionCount'
                          ? `${value} investments`
                          : fmtCurrency(value as number)}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="transactionCount"
              fill="var(--color-chart-1)"
              radius={[4, 4, 0, 0]}
            >
              {data.map((entry) => (
                <rect
                  key={entry.dayName}
                  fill={DAY_COLORS[entry.dayName] ?? 'var(--color-chart-1)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── Investment Time of Day Chart ──

function InvestmentTimeOfDayChart({
  data,
}: {
  data: InvestmentAnalytics['timeOfDay']
}) {
  if (data.length === 0) return null

  const chartData = data.map((d) => ({
    ...d,
    label: `${d.hour.toString().padStart(2, '0')}:00`,
  }))

  const chartConfig: ChartConfig = {
    transactionCount: { label: 'Investments', color: 'var(--color-chart-4)' },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Investment Time Patterns
        </CardTitle>
        <CardDescription>
          When you typically invest during the day
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Investments</span>
                      <span className="font-mono font-medium tabular-nums">
                        {value} investments
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="transactionCount"
              fill="var(--color-chart-4)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── Investment Loading Skeleton ──

function InvestmentTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="mt-1 h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

// ── Investments Tab Component ──

function InvestmentsPatternTab({ period }: { period: AnalyticsPeriod }) {
  const { data, isLoading } = useQuery({
    queryKey: ['patterns', 'investments', period],
    queryFn: () => fetchInvestmentAnalytics(period),
  })

  return (
    <div className="space-y-6">
      {isLoading && <InvestmentTabSkeleton />}

      {!isLoading && (!data || data.transactionCount === 0) && (
        <EmptyState
          icon={Coins}
          title="No investment transactions found"
          description="Investment transactions from platforms like Groww, Zerodha, ICCL Mutual Funds, and MMTC-PAMP will appear here."
        />
      )}

      {!isLoading && data && data.transactionCount > 0 && (
        <div className="space-y-6">
          <InvestmentSummaryCards data={data} />

          <SectionHeader
            title="Trends"
            description="Allocation and investment activity over time"
          />
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            <AssetAllocationChart data={data.assetTypeBreakdown} />
            <div className="lg:col-span-2">
              <MonthlyInvestmentTrendChart data={data.monthlyTrend} />
            </div>
          </div>

          <SectionHeader
            title="Breakdown"
            description="Asset types and platform usage"
          />
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <AssetBreakdownTable data={data.assetTypeBreakdown} />
            <PlatformBreakdownTable data={data.platformBreakdown} />
          </div>

          {(data.detectedSips.length > 0 ||
            data.largestInvestments.length > 0) && (
            <>
              <SectionHeader
                title="Details"
                description="Recurring patterns and notable transactions"
              />
              {data.detectedSips.length > 0 && (
                <SipDetectionTable data={data.detectedSips} />
              )}
              <LargestInvestmentsTable data={data.largestInvestments} />
            </>
          )}

          <SectionHeader
            title="Patterns"
            description="When you typically invest"
          />
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <InvestmentDayOfWeekChart data={data.dayOfWeek} />
            <InvestmentTimeOfDayChart data={data.timeOfDay} />
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

const PatternsPage = () => {
  const [period, setPeriod] = useState<AnalyticsPeriod>('year')
  const [activeTab, setActiveTab] = useState('bus')
  const showPeriodFilter = activeTab === 'bus' || activeTab === 'investments'

  return (
    <MainLayout>
      <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col px-4 sm:px-6 lg:px-10">
        <header className="pb-5">
          <div className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1.5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Habits
              </p>
              <h1 className="font-serif text-3xl font-medium italic tracking-tight text-foreground sm:text-[2.375rem] sm:leading-tight">
                Spending patterns
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Discover insights from your recurring spending habits.
              </p>
            </div>
          </div>
        </header>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="gap-4 pb-8"
        >
          <TabsList className="mb-4 h-auto w-fit max-w-full justify-start gap-0.5 overflow-x-auto rounded-[11px] border border-border bg-muted p-1">
            <TabsTrigger
              value="bus"
              className="gap-2 rounded-lg px-3.5 py-2 text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Bus className="h-4 w-4" />
              Bus
            </TabsTrigger>
            <TabsTrigger
              value="investments"
              className="gap-2 rounded-lg px-3.5 py-2 text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <TrendingUp className="h-4 w-4" />
              Investments
            </TabsTrigger>
            <TabsTrigger
              value="principal"
              className="gap-2 rounded-lg px-3.5 py-2 text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Wallet className="h-4 w-4" />
              Principal
            </TabsTrigger>
          </TabsList>

          {showPeriodFilter ? (
            <div className="mb-6 flex flex-col gap-3 rounded-[14px] border border-border bg-card px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="hidden items-center rounded-[9px] border border-border bg-muted p-0.5 sm:inline-flex">
                {PERIODS.map((p) => (
                  <Button
                    key={p.value}
                    variant={period === p.value ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 rounded-md px-3 text-xs font-semibold shadow-none"
                    onClick={() => setPeriod(p.value)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 sm:hidden">
                {PERIODS.map((p) => (
                  <Button
                    key={p.value}
                    size="sm"
                    variant={period === p.value ? 'default' : 'outline'}
                    onClick={() => setPeriod(p.value)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Showing:{' '}
                <span className="font-medium text-foreground">
                  {PERIODS.find((p) => p.value === period)?.label ?? period}
                </span>
              </p>
            </div>
          ) : null}

          <TabsContent value="bus" className="mt-0">
            <BusPatternTab period={period} />
          </TabsContent>

          <TabsContent value="investments" className="mt-0">
            <InvestmentsPatternTab period={period} />
          </TabsContent>

          <TabsContent value="principal" className="mt-0">
            <PrincipalInvestmentTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}

export default PatternsPage
