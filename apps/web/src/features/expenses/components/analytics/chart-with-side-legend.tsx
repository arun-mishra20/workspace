import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'

import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import { cn } from '@/lib/utils'

export interface ChartLegendItem {
  key: string
  label: string
  amount: number
  color: string
  icon?: ReactNode
  href?: string
}

interface ChartWithSideLegendProps {
  items: ChartLegendItem[]
  totalAmount?: number
  children: ReactNode
  className?: string
  chartClassName?: string
  legendClassName?: string
  formatValue?: (value: number) => string
}

export function ChartWithSideLegend({
  items,
  totalAmount,
  children,
  className,
  chartClassName,
  legendClassName,
  formatValue = fmtCurrency,
}: ChartWithSideLegendProps) {
  const total =
    totalAmount ?? items.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div
      className={cn(
        'grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:items-center',
        className,
      )}
    >
      <div className={cn('mx-auto w-full max-w-xs lg:mx-0', chartClassName)}>
        {children}
      </div>

      <div className={cn('min-w-0', legendClassName)}>
        <div className="divide-y rounded-lg border">
          {items.map((item) => {
            const pct = total > 0 ? (item.amount / total) * 100 : 0
            const isOther = item.key === '__other__'

            const row = (
              <>
                <div className="flex min-w-0 items-center gap-2.5">
                  {item.icon ? (
                    item.icon
                  ) : isOther ? (
                    <MoreHorizontal
                      className="size-3.5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  ) : (
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                  <span
                    className="truncate text-sm font-medium capitalize"
                    title={item.label}
                  >
                    {item.label}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm tabular-nums">
                  <span className="text-xs text-muted-foreground">
                    {pct.toFixed(1)}%
                  </span>
                  <span className="font-semibold">{formatValue(item.amount)}</span>
                </div>
              </>
            )

            if (item.href) {
              return (
                <Link
                  key={item.key}
                  to={item.href}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  {row}
                </Link>
              )
            }

            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                {row}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
