import {
  AlertTriangle,
  Check,
  CloudOff,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/ui/select'

import type { InvestmentPlanSummary } from '@/features/investment-plans/api/investment-plans'
import type { SaveStatus } from '@/features/investment-plans/hooks/use-investment-plan-workspace'
import { cn } from '@/lib/utils'

interface PlanHeaderProps {
  summaries: InvestmentPlanSummary[]
  selectedPlanId: string | null
  saveStatus: SaveStatus
  onSelectPlan: (id: string) => void
  onCreatePlan: () => void
  onReload: () => void
  onRefreshSource: () => void
  isCreating?: boolean
  isRefreshing?: boolean
}

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
        <Loader2 className="size-3 animate-spin" aria-hidden />
        Saving
      </span>
    )
  }
  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary">
        <Check className="size-3" aria-hidden />
        Saved
      </span>
    )
  }
  if (status === 'offline') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
        <CloudOff className="size-3" aria-hidden />
        Offline
      </span>
    )
  }
  if (status === 'conflict') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive">
        <AlertTriangle className="size-3" aria-hidden />
        Conflict
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive">
        Save failed
      </span>
    )
  }
  return null
}

export function PlanHeader({
  summaries,
  selectedPlanId,
  saveStatus,
  onSelectPlan,
  onCreatePlan,
  onReload,
  onRefreshSource,
  isCreating,
  isRefreshing,
}: PlanHeaderProps) {
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <h1 className="font-serif text-[2rem] font-semibold tracking-tight text-foreground sm:text-[2.0625rem]">
          Investment Plan
        </h1>
        <p className="max-w-[46ch] text-[14.5px] text-muted-foreground">
          Where your money is headed, and what it&apos;ll take to get there.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <SaveBadge status={saveStatus} />
        {summaries.length > 0 ? (
          <Select
            value={selectedPlanId ?? undefined}
            onValueChange={onSelectPlan}
          >
            <SelectTrigger
              className={cn(
                'h-9 w-[200px] rounded-lg border-border bg-card text-[13.5px] font-medium',
              )}
              aria-label="Select investment plan"
            >
              <SelectValue placeholder="Select plan" />
            </SelectTrigger>
            <SelectContent>
              {summaries.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-lg text-[13.5px] font-semibold"
          onClick={onRefreshSource}
          disabled={!selectedPlanId || isRefreshing}
        >
          <RefreshCw
            className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
            aria-hidden
          />
          Refresh source
        </Button>
        {saveStatus === 'conflict' ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 rounded-lg"
            onClick={onReload}
          >
            Reload
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          className="h-9 rounded-lg text-[13.5px] font-semibold"
          onClick={onCreatePlan}
          disabled={isCreating}
        >
          <Plus className="size-3.5" aria-hidden />
          New plan
        </Button>
      </div>
    </header>
  )
}
