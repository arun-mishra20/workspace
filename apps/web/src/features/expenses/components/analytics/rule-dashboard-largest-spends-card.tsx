import { format, parseISO } from 'date-fns'
import { useNavigate } from 'react-router-dom'

import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import { useAnalyticsDrillDown } from '@/features/expenses/hooks/use-analytics-drill-down'
import type { RuleDashboardInsights } from '@workspace/domain'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'

interface RuleDashboardLargestSpendsCardProps {
  insights?: RuleDashboardInsights
  loading: boolean
  selectedCardLast4?: string
}

export function RuleDashboardLargestSpendsCard({
  insights,
  loading,
  selectedCardLast4,
}: RuleDashboardLargestSpendsCardProps) {
  const drillDown = useAnalyticsDrillDown()
  const navigate = useNavigate()
  const items = insights?.largestTransactions ?? []

  if (!loading && items.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Largest spends</CardTitle>
        <CardDescription>Top transactions in the selected range</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          items.map((txn) => (
            <div
              key={txn.id}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{txn.merchant}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(txn.transactionDate), 'dd MMM yyyy')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-medium tabular-nums">
                  {fmtCurrency(txn.amount)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    void navigate(
                      drillDown({
                        date: txn.transactionDate.slice(0, 10),
                        cardLast4: selectedCardLast4,
                      }),
                    )
                  }}
                >
                  View
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
