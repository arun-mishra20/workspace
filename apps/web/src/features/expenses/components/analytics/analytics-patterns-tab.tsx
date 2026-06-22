import { useQuery } from '@tanstack/react-query'
import { Bus, Coins, Repeat } from 'lucide-react'

import { fetchBusAnalytics } from '@/features/expenses/api/bus-analytics'
import { fetchInvestmentAnalytics } from '@/features/expenses/api/investment-analytics'
import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import type { AnalyticsPeriod } from '@workspace/domain'
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
}

export function AnalyticsPatternsTab({ period }: AnalyticsPatternsTabProps) {
  const busQ = useQuery({
    queryKey: ['expenses', 'analytics', 'bus', period],
    queryFn: () => fetchBusAnalytics(period),
  })

  const investmentQ = useQuery({
    queryKey: ['expenses', 'analytics', 'investment', period],
    queryFn: () => fetchInvestmentAnalytics(period),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Bus className="size-4" /> Bus trips
            </CardDescription>
            <CardTitle className="text-2xl">
              {busQ.isLoading ? '—' : busQ.data?.totalTrips ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {busQ.data ? fmtCurrency(busQ.data.totalSpent) : '—'} spent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Coins className="size-4" /> Investments
            </CardDescription>
            <CardTitle className="text-2xl">
              {investmentQ.isLoading
                ? '—'
                : fmtCurrency(investmentQ.data?.totalInvested ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {investmentQ.data?.transactionCount ?? 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Repeat className="size-4" /> SIP count
            </CardDescription>
            <CardTitle className="text-2xl">
              {investmentQ.isLoading ? '—' : investmentQ.data?.detectedSips.length ?? 0}
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
          {busQ.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (busQ.data?.routes.length ?? 0) > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead className="text-right">Trips</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {busQ.data!.routes.slice(0, 8).map((route) => (
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
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No bus data for this period.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Investment breakdown</CardTitle>
          <CardDescription>By asset class from enriched metadata</CardDescription>
        </CardHeader>
        <CardContent>
          {investmentQ.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (investmentQ.data?.assetTypeBreakdown.length ?? 0) > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Txns</TableHead>
                  <TableHead className="text-right">Invested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investmentQ.data!.assetTypeBreakdown.map((item) => (
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
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No investment data for this period.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
