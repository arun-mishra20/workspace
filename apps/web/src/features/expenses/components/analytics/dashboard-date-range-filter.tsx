import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import { PERIODS } from '@/features/expenses/components/analytics/analytics-utils'
import type { AnalyticsPeriod } from '@workspace/domain'
import { Button } from '@workspace/ui/components/ui/button'
import { Calendar } from '@workspace/ui/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/ui/select'
import { cn } from '@/lib/utils'

type DateRangeValue = {
  from: Date | undefined
  to?: Date
}

interface DashboardDateRangeFilterProps {
  mode: 'preset' | 'custom'
  period: AnalyticsPeriod
  startDate: string
  endDate: string
  onPresetChange: (period: AnalyticsPeriod) => void
  onCustomRangeApply: (startDate: string, endDate: string) => void
}

function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function DashboardDateRangeFilter({
  mode,
  period,
  startDate,
  endDate,
  onPresetChange,
  onCustomRangeApply,
}: DashboardDateRangeFilterProps) {
  const [customOpen, setCustomOpen] = useState(false)

  const selectedRange = useMemo<DateRangeValue>(() => {
    return {
      from: parseISO(startDate),
      to: parseISO(endDate),
    }
  }, [endDate, startDate])

  const [draftRange, setDraftRange] = useState<DateRangeValue | undefined>(
    selectedRange,
  )

  useEffect(() => {
    if (!customOpen) {
      setDraftRange(selectedRange)
    }
  }, [customOpen, selectedRange])

  const customButtonLabel =
    mode === 'custom'
      ? `${format(parseISO(startDate), 'dd MMM')} – ${format(parseISO(endDate), 'dd MMM yyyy')}`
      : 'Custom range'

  const handleApplyCustom = () => {
    if (!draftRange?.from) {
      return
    }

    const to = draftRange.to ?? draftRange.from
    onCustomRangeApply(toDateString(draftRange.from), toDateString(to))
    setCustomOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        {PERIODS.map((preset) => (
          <Button
            key={preset.value}
            type="button"
            size="sm"
            variant={
              mode === 'preset' && period === preset.value ? 'default' : 'outline'
            }
            onClick={() => onPresetChange(preset.value)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <Select
        value={mode === 'custom' ? 'custom' : period}
        onValueChange={(value) => {
          if (value === 'custom') {
            setCustomOpen(true)
            return
          }
          onPresetChange(value as AnalyticsPeriod)
        }}
      >
        <SelectTrigger className="h-8 w-36 sm:hidden" size="sm">
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>

      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={mode === 'custom' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-8 font-normal',
              mode !== 'custom' && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-1.5 size-3.5" />
            <span className="max-w-48 truncate">{customButtonLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="space-y-3 p-3">
            <Calendar
              mode="range"
              selected={draftRange}
              onSelect={(range) => setDraftRange(range)}
              numberOfMonths={2}
              disabled={(date) => date > new Date()}
              autoFocus
            />
            <div className="flex items-center justify-between gap-2 border-t pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraftRange(selectedRange)
                  setCustomOpen(false)
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!draftRange?.from}
                onClick={handleApplyCustom}
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
