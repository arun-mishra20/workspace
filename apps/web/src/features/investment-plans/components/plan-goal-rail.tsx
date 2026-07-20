import { Flag, Plus, Target } from 'lucide-react'
import { Badge } from '@workspace/ui/components/ui/badge'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'

import { fmtCurrency } from '@/features/investment-plans/lib/format'

import type {
  InvestmentPlanGoal,
  InvestmentPlanGoalResult,
} from '@workspace/domain'

interface PlanGoalRailProps {
  goals: InvestmentPlanGoal[]
  results: InvestmentPlanGoalResult[]
  onAddGoal?: () => void
}

export function PlanGoalRail({ goals, results, onAddGoal }: PlanGoalRailProps) {
  if (goals.length === 0) {
    return (
      <Card className="rounded-[10px]">
        <CardHeader className="px-6 pt-6 pb-0">
          <CardTitle className="font-serif text-[19px] font-semibold tracking-tight">
            Goals
          </CardTitle>
          <CardDescription className="text-[13.5px]">
            Track readiness and funding gaps against this plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3.5 px-6 pt-8 pb-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Target className="size-6" aria-hidden />
          </div>
          <h3 className="font-serif text-lg font-semibold text-foreground">
            No goals yet
          </h3>
          <p className="max-w-[40ch] text-[13.5px] text-muted-foreground">
            Add a goal — a house, retirement, your kid&apos;s education — and
            this plan will show whether it gets you there, and by when.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2.5">
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-lg text-[13.5px] font-semibold"
              onClick={onAddGoal}
            >
              <Plus className="size-3.5" aria-hidden />
              Add a goal
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-lg text-[13.5px] font-semibold"
              onClick={onAddGoal}
            >
              <Flag className="size-3.5" aria-hidden />
              Open goals editor
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const byId = new Map(results.map((result) => [result.goalId, result]))

  return (
    <Card className="rounded-[10px]">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 px-6 pt-6">
        <div>
          <CardTitle className="font-serif text-[19px] font-semibold tracking-tight">
            Goals
          </CardTitle>
          <CardDescription className="text-[13.5px]">
            Track readiness and funding gaps against this plan.
          </CardDescription>
        </div>
        {onAddGoal ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 rounded-lg"
            onClick={onAddGoal}
          >
            <Plus className="size-3.5" aria-hidden />
            Add
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-3 px-6 pb-6 md:grid-cols-2 xl:grid-cols-3">
        {goals.map((goal) => {
          const result = byId.get(goal.id)
          const onTrack = result?.onTrack ?? false
          return (
            <div
              key={goal.id}
              className="space-y-3 rounded-lg border border-border bg-muted/20 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {goal.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Target {goal.targetDate}
                    {goal.type !== 'custom'
                      ? ` · ${goal.type.replace(/_/g, ' ')}`
                      : ''}
                  </p>
                </div>
                <Badge variant={onTrack ? 'secondary' : 'destructive'}>
                  {onTrack ? 'On track' : 'Shortfall'}
                </Badge>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Projected</span>
                  <span className="font-medium tabular-nums">
                    {fmtCurrency(result?.projectedValue ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Target</span>
                  <span className="font-medium tabular-nums">
                    {fmtCurrency(result?.targetValueNominal ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Gap</span>
                  <span className="font-medium tabular-nums">
                    {fmtCurrency(result?.gap ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
