import { Badge } from '@workspace/ui/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/ui/card'

import { fmtCurrency } from '@/features/investment-plans/lib/format'

import type { InvestmentPlanGoal, InvestmentPlanGoalResult } from '@workspace/domain'

interface PlanGoalRailProps {
  goals: InvestmentPlanGoal[]
  results: InvestmentPlanGoalResult[]
}

export function PlanGoalRail({ goals, results }: PlanGoalRailProps) {
  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg font-semibold tracking-tight">
            Goals
          </CardTitle>
          <CardDescription>Add a named goal to track readiness and funding gaps.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const byId = new Map(results.map((result) => [result.goalId, result]))

  return (
    <section aria-label="Goals" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {goals.map((goal) => {
        const result = byId.get(goal.id)
        const onTrack = result?.onTrack ?? false
        return (
          <Card key={goal.id}>
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{goal.name}</CardTitle>
                <Badge variant={onTrack ? 'secondary' : 'destructive'}>
                  {onTrack ? 'On track' : 'Shortfall'}
                </Badge>
              </div>
              <CardDescription>
                Target {goal.targetDate}
                {goal.type !== 'custom' ? ` · ${goal.type.replace(/_/g, ' ')}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Projected</span>
                <span className="tabular-nums font-medium">{fmtCurrency(result?.projectedValue ?? 0)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Target</span>
                <span className="tabular-nums font-medium">{fmtCurrency(result?.targetValueNominal ?? 0)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Gap</span>
                <span className="tabular-nums font-medium">{fmtCurrency(result?.gap ?? 0)}</span>
              </div>
              <p className="text-muted-foreground pt-1">
                {onTrack
                  ? 'Keep contribution and allocation steady through the target date.'
                  : 'Raise contributions or allocate more capital to close the gap.'}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}
