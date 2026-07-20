import { AlertTriangle, Check, CloudOff, Loader2, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/ui/select'
import { Badge } from '@workspace/ui/components/ui/badge'

import type { InvestmentPlanSummary } from '@/features/investment-plans/api/investment-plans'
import type { SaveStatus } from '@/features/investment-plans/hooks/use-investment-plan-workspace'

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
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="size-3 animate-spin" aria-hidden />
        Saving
      </Badge>
    )
  }
  if (status === 'saved') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Check className="size-3" aria-hidden />
        Saved
      </Badge>
    )
  }
  if (status === 'offline') {
    return (
      <Badge variant="outline" className="gap-1">
        <CloudOff className="size-3" aria-hidden />
        Offline
      </Badge>
    )
  }
  if (status === 'conflict') {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="size-3" aria-hidden />
        Conflict
      </Badge>
    )
  }
  if (status === 'error') {
    return <Badge variant="destructive">Save failed</Badge>
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
    <header className="pb-1">
      <div className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Projections
          </p>
          <h1 className="font-serif text-3xl font-medium italic tracking-tight text-foreground sm:text-[2.375rem] sm:leading-tight">
            Investment plan
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Persistent plan dashboard with goals, allocation, and scenario
            projections.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:pb-1">
          <SaveBadge status={saveStatus} />
          {summaries.length > 0 ? (
            <Select
              value={selectedPlanId ?? undefined}
              onValueChange={onSelectPlan}
            >
              <SelectTrigger
                className="w-[200px]"
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
            onClick={onRefreshSource}
            disabled={!selectedPlanId || isRefreshing}
          >
            <RefreshCw
              className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden
            />
            Refresh source
          </Button>
          {saveStatus === 'conflict' ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onReload}
            >
              Reload
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={onCreatePlan}
            disabled={isCreating}
          >
            <Plus className="size-4" aria-hidden />
            New plan
          </Button>
        </div>
      </div>
    </header>
  )
}
