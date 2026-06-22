import {
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from 'date-fns'

import { fmtCompact } from '@/features/expenses/components/analytics/analytics-utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface SpendHeatmapCalendarProps {
  data: Array<{ date: string; debited: number; credited?: number }>
  metric?: 'debited' | 'credited'
}

export function SpendHeatmapCalendar({
  data,
  metric = 'debited',
}: SpendHeatmapCalendarProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No daily data for heatmap.
      </p>
    )
  }

  const amountByDate = new Map(
    data.map((item) => [item.date.slice(0, 10), item[metric] ?? 0]),
  )
  const dates = data.map((item) => parseISO(item.date.slice(0, 10)))
  const minDate = dates.reduce((a, b) => (a < b ? a : b))
  const maxDate = dates.reduce((a, b) => (a > b ? a : b))
  const maxAmount = Math.max(...data.map((item) => item[metric] ?? 0), 1)

  const months: Date[] = []
  let cursor = startOfMonth(minDate)
  const end = startOfMonth(maxDate)
  while (cursor <= end) {
    months.push(cursor)
    cursor = startOfMonth(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 overflow-x-auto">
        {months.map((month) => {
          const days = eachDayOfInterval({
            start: startOfMonth(month),
            end: endOfMonth(month),
          })
          const leadingBlanks = (days[0]?.getDay() ?? 0)

          return (
            <div key={month.toISOString()} className="min-w-[280px]">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {format(month, 'MMMM yyyy')}
              </p>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: leadingBlanks }).map((_, index) => (
                  <div key={`blank-${index}`} className="size-4" />
                ))}
                {days.map((day) => {
                  const key = format(day, 'yyyy-MM-dd')
                  const amount = amountByDate.get(key) ?? 0
                  const intensity = amount / maxAmount

                  return (
                    <Tooltip key={key}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'size-4 rounded-sm border border-border/40',
                            amount === 0 && 'bg-muted/40',
                          )}
                          style={
                            amount > 0
                              ? {
                                  backgroundColor: `color-mix(in srgb, var(--color-chart-1) ${Math.round(20 + intensity * 80)}%, transparent)`,
                                }
                              : undefined
                          }
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{format(day, 'dd MMM yyyy')}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtCompact(amount)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
