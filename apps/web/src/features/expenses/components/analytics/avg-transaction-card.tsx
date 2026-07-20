import type { ReactNode } from 'react'
import { Store } from 'lucide-react'

import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'

interface AvgTransactionCardProps {
  avgTransaction?: number
  transactionCount?: number
  topMerchant?: string
  loading?: boolean
}

export function AvgTransactionCard({
  avgTransaction,
  transactionCount,
  topMerchant,
  loading = false,
}: AvgTransactionCardProps) {
  let amount: ReactNode
  if (loading) {
    amount = <Skeleton className="h-9 w-28" />
  } else if (avgTransaction == null) {
    amount = (
      <div className="font-mono text-[1.8rem] font-semibold tracking-tight tabular-nums text-foreground">
        —
      </div>
    )
  } else {
    amount = (
      <div className="font-mono text-[1.8rem] font-semibold tracking-tight tabular-nums text-foreground">
        {fmtCurrency(avgTransaction)}
      </div>
    )
  }

  let merchantChip: ReactNode = null
  if (loading) {
    merchantChip = <Skeleton className="mt-3.5 h-12 w-full rounded-[9px]" />
  } else if (topMerchant) {
    merchantChip = (
      <div className="mt-3.5 flex items-center gap-2 rounded-[9px] border border-border bg-muted/50 px-2.5 py-2">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Store className="size-3.5" aria-hidden />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            Top merchant
          </p>
          <p className="truncate text-[12.5px] font-semibold text-foreground">
            {topMerchant}
          </p>
        </div>
      </div>
    )
  }

  return (
    <Card data-slot="avg-transaction-card" className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-[12.5px] font-semibold text-muted-foreground">
          Avg transaction
        </CardTitle>
      </CardHeader>
      <CardContent>
        {amount}
        {loading ? (
          <Skeleton className="mt-1.5 h-4 w-40" />
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">
            across {transactionCount ?? 0} transactions
          </p>
        )}
        {merchantChip}
      </CardContent>
    </Card>
  )
}
