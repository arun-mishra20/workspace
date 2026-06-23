import { Bus, Coins, Repeat } from 'lucide-react'

import type {
  AnalyticsPeriod,
  BusAnalytics,
  InvestmentAnalytics,
} from '@workspace/domain'
import { DataTablePagination } from '@/components/data-table'
import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import { useClientPagination } from '@/hooks/use-client-pagination'
import { AnalyticsEmptyHint } from '@/features/expenses/components/analytics/analytics-empty-hint'
import {
  buildSparsePeriodActions,
  type AnalyticsFilterActions,
} from '@/features/expenses/components/analytics/analytics-filter-actions'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/ui/table'

interface AnalyticsPatternsTabProps {
  period: AnalyticsPeriod
  busData?: BusAnalytics
  busLoading: boolean
  investmentData?: InvestmentAnalytics
  investmentLoading: boolean
  filterActions?: AnalyticsFilterActions
}

export function AnalyticsPatternsTab({
  period,
  busData,
  busLoading,
  investmentData,
  investmentLoading,
  filterActions,
}: AnalyticsPatternsTabProps) {
  const sparseActions = buildSparsePeriodActions(filterActions ?? {}, {
    hasCardFilter: false,
    period,
  })

  const busRoutesPagination = useClientPagination(busData?.routes ?? [])
  const investmentBreakdownPagination = useClientPagination(
    investmentData?.assetTypeBreakdown ?? [],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Bus className="size-4" /> Bus trips
            </CardDescription>
            <CardTitle className="text-2xl">
              {busLoading ? '—' : busData?.totalTrips ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {busData ? fmtCurrency(busData.totalSpent) : '—'} spent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Coins className="size-4" /> Investments
            </CardDescription>
            <CardTitle className="text-2xl">
              {investmentLoading
                ? '—'
                : fmtCurrency(investmentData?.totalInvested ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {investmentData?.transactionCount ?? 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Repeat className="size-4" /> SIP count
            </CardDescription>
            <CardTitle className="text-2xl">
              {investmentLoading ? '—' : investmentData?.detectedSips.length ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              From transaction attributes
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top bus routes</CardTitle>
          <CardDescription>Most frequent BMTC routes this period</CardDescription>
        </CardHeader>
        <CardContent>
          {busLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (busData?.routes.length ?? 0) > 0 ? (
            <div className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead className="text-right">Trips</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {busRoutesPagination.paginatedItems.map((route) => (
                  <TableRow key={route.busNumber}>
                    <TableCell>{route.busNumber}</TableCell>
                    <TableCell className="text-right">{route.tripCount}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtCurrency(route.totalSpent)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <DataTablePagination
              page={busRoutesPagination.page}
              pageSize={busRoutesPagination.pageSize}
              totalItems={busRoutesPagination.totalItems}
              onPageChange={busRoutesPagination.setPage}
              onPageSizeChange={busRoutesPagination.setPageSize}
              itemLabel="routes"
              className="border-none pt-0"
            />
            </div>
          ) : (
            <AnalyticsEmptyHint
              title="No bus data for this period."
              actions={sparseActions}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Investment breakdown</CardTitle>
          <CardDescription>By asset class from enriched metadata</CardDescription>
        </CardHeader>
        <CardContent>
          {investmentLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (investmentData?.assetTypeBreakdown.length ?? 0) > 0 ? (
            <div className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Txns</TableHead>
                  <TableHead className="text-right">Invested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investmentBreakdownPagination.paginatedItems.map((item) => (
                  <TableRow key={item.assetType}>
                    <TableCell className="capitalize">
                      {item.assetType.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="text-right">{item.transactionCount}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtCurrency(item.totalInvested)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <DataTablePagination
              page={investmentBreakdownPagination.page}
              pageSize={investmentBreakdownPagination.pageSize}
              totalItems={investmentBreakdownPagination.totalItems}
              onPageChange={investmentBreakdownPagination.setPage}
              onPageSizeChange={investmentBreakdownPagination.setPageSize}
              itemLabel="asset types"
              className="border-none pt-0"
            />
            </div>
          ) : (
            <AnalyticsEmptyHint
              title="No investment data for this period."
              actions={sparseActions}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
