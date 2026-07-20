import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  Flag,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react'

import { cn } from '@/lib/utils'

export type PlanEditorKey = 'assets' | 'goals' | 'events' | 'assumptions'

interface PlanEditChipsProps {
  active: PlanEditorKey | null
  onSelect: (key: PlanEditorKey) => void
  goalsCount?: number
}

const CHIPS: Array<{
  key: PlanEditorKey
  label: string
  icon: LucideIcon
}> = [
  { key: 'assets', label: 'Assets', icon: Wallet },
  { key: 'goals', label: 'Goals', icon: Flag },
  { key: 'events', label: 'Cash events', icon: CalendarDays },
  { key: 'assumptions', label: 'Assumptions', icon: SlidersHorizontal },
]

export function PlanEditChips({
  active,
  onSelect,
  goalsCount = 0,
}: PlanEditChipsProps) {
  return (
    <section aria-label="Edit plan inputs" className="space-y-2.5">
      <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-muted-foreground">
        Edit plan inputs
      </p>
      <div className="flex flex-wrap gap-2">
        {CHIPS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key
          const showDot = key === 'goals' && goalsCount === 0
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={cn(
                'relative inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[13.5px] font-medium transition-colors',
                isActive
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:bg-muted/40 hover:text-foreground',
              )}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden />
              {label}
              {showDot ? (
                <span
                  className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-chart-4"
                  aria-hidden
                />
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}
