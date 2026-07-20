import { TrendingUp, TrendingDown, Wallet, BarChart3 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'
import { usePortfolioSummary } from '@/features/holdings/api/holdings'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@workspace/ui/lib/utils'

export function PortfolioSummary() {
  const { data: summary, isLoading } = usePortfolioSummary()

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!summary) return null

  const isPositive = summary.totalReturns >= 0

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[12.5px] font-semibold text-muted-foreground">
            Total invested
          </CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-mono text-[1.8rem] font-semibold tracking-tight tabular-nums">
            {formatCurrency(summary.totalInvestedValue)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[12.5px] font-semibold text-muted-foreground">
            Current value
          </CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-mono text-[1.8rem] font-semibold tracking-tight tabular-nums">
            {formatCurrency(summary.totalCurrentValue)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[12.5px] font-semibold text-muted-foreground">
            Total returns
          </CardTitle>
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-positive" />
          ) : (
            <TrendingDown className="h-4 w-4 text-negative" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'font-mono text-[1.8rem] font-semibold tracking-tight tabular-nums',
              isPositive ? 'text-positive' : 'text-negative',
            )}
          >
            {formatCurrency(summary.totalReturns)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[12.5px] font-semibold text-muted-foreground">
            Returns %
          </CardTitle>
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-positive" />
          ) : (
            <TrendingDown className="h-4 w-4 text-negative" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'font-mono text-[1.8rem] font-semibold tracking-tight tabular-nums',
              isPositive ? 'text-positive' : 'text-negative',
            )}
          >
            {summary.totalReturnsPercentage.toFixed(2)}%
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
