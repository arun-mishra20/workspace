import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import {
  AnalyticsEmptyHint,
  type AnalyticsEmptyAction,
} from '@/features/expenses/components/analytics/analytics-empty-hint'
import { cn } from '@/lib/utils'
import { Badge } from '@workspace/ui/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import { Separator } from '@workspace/ui/components/ui/separator'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'

interface RankedSpendItem {
  key: string
  label: string
  sublabel?: string
  amount: number
  count: number
  href?: string
  leading?: ReactNode
}

interface RankedSpendListCardProps {
  title: string
  description: string
  items: RankedSpendItem[]
  loading: boolean
  emptyMessage?: string
  emptyActions?: AnalyticsEmptyAction[]
  barColor?: string
}

export function RankedSpendListCard({
  title,
  description,
  items,
  loading,
  emptyMessage = 'No data.',
  emptyActions,
  barColor = 'bg-primary/70',
}: RankedSpendListCardProps) {
  const maxAmount = items[0]?.amount ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <Separator className="w-full mt-2" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item, i) => {
              const pct = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0
              const rowContent = (
                <>
                  {item.leading ?? (
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground',
                        i < 3 && 'bg-primary/10 text-primary',
                      )}
                    >
                      {i + 1}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm gap-2">
                      <div className="min-w-0">
                        <span className="font-medium">{item.label}</span>
                        {item.sublabel && (
                          <p className="truncate text-xs text-muted-foreground">
                            {item.sublabel}
                          </p>
                        )}
                      </div>
                      <span className="tabular-nums shrink-0">
                        {fmtCurrency(item.amount)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${barColor.startsWith('bg-') ? barColor : ''}`}
                        style={{
                          width: `${pct}%`,
                          ...(barColor.startsWith('var(')
                            ? { backgroundColor: barColor }
                            : {}),
                        }}
                      />
                    </div>
                  </div>
                  <Badge variant="secondary" className="tabular-nums shrink-0">
                    {item.count}
                  </Badge>
                </>
              )

              if (item.href) {
                return (
                  <Link
                    key={item.key}
                    to={item.href}
                    className="flex items-center gap-3 rounded-md py-2 transition-colors hover:bg-muted/50"
                  >
                    {rowContent}
                  </Link>
                )
              }

              return (
                <div key={item.key} className="flex items-center gap-3 py-2">
                  {rowContent}
                </div>
              )
            })}
          </div>
        ) : (
          <AnalyticsEmptyHint
            title={emptyMessage}
            actions={emptyActions}
          />
        )}
      </CardContent>
    </Card>
  )
}
