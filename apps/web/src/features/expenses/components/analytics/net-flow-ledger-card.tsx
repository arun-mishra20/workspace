import type { ReactNode } from 'react'

import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'
import { cn } from '@workspace/ui/lib/utils'

interface NetFlowLedgerCardProps {
  netFlow?: number
  totalReceived?: number
  totalSpent?: number
  periodLabel: string
  loading?: boolean
}

function netFlowCaption(
  netFlow: number | undefined,
  periodLabel: string,
): string {
  const window = periodLabel.toLowerCase()
  if (netFlow == null || netFlow === 0) {
    return `Inflow matched outflow for the ${window}.`
  }
  if (netFlow < 0) {
    return `Outflow exceeded inflow for the ${window}.`
  }
  return `Inflow exceeded outflow for the ${window}.`
}

export function NetFlowLedgerCard({
  netFlow,
  totalReceived,
  totalSpent,
  periodLabel,
  loading = false,
}: NetFlowLedgerCardProps) {
  const isNegative = (netFlow ?? 0) < 0
  const isPositive = (netFlow ?? 0) > 0

  let valueContent: ReactNode
  if (loading) {
    valueContent = <Skeleton className="h-10 w-40" />
  } else if (netFlow == null) {
    valueContent = (
      <div className="font-mono text-[2rem] font-semibold tracking-tight tabular-nums text-foreground">
        —
      </div>
    )
  } else {
    valueContent = (
      <div
        className={cn(
          'font-mono text-[2rem] font-semibold tracking-tight tabular-nums',
          isNegative && 'text-negative',
          isPositive && 'text-positive',
          !isNegative && !isPositive && 'text-foreground',
        )}
      >
        {fmtCurrency(netFlow)}
      </div>
    )
  }

  return (
    <Card
      data-slot="net-flow-ledger-card"
      className="overflow-hidden bg-gradient-to-b from-muted/40 to-card"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-[12.5px] font-semibold text-muted-foreground">
          Net flow — this period
        </CardTitle>
      </CardHeader>
      <CardContent>
        {valueContent}

        <div className="mt-2 border-y border-y-foreground border-t-2 py-2.5">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <div className="space-y-1 font-mono text-[12.5px] text-muted-foreground tabular-nums">
              <div className="flex items-baseline justify-between gap-3">
                <span>Received</span>
                <span>{fmtCurrency(totalReceived ?? 0)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-foreground/80">− Spent</span>
                <span>{fmtCurrency(totalSpent ?? 0)}</span>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <Skeleton className="mt-2 h-4 w-56" />
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            {netFlowCaption(netFlow, periodLabel)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
