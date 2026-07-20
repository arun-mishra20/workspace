import {
  AlertTriangle,
  Info,
  TriangleAlert,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'

import {
  fmtCurrency,
  fmtPercentFromBps,
  fmtXirr,
} from '@/features/investment-plans/lib/format'
import { cn } from '@/lib/utils'

import type {
  InvestmentPlanInput,
  InvestmentPlanProjection,
} from '@workspace/domain'

interface PlanInsightsProps {
  plan: InvestmentPlanInput
  projection: InvestmentPlanProjection
}

type InsightTone = 'info' | 'warn' | 'alert'

interface InsightItem {
  title: string
  body: string
  tone: InsightTone
}

export function PlanInsights({ plan, projection }: PlanInsightsProps) {
  const shortfalls = projection.goals.filter((goal) => !goal.onTrack)
  const monthly = plan.assets.reduce(
    (sum, asset) => sum + asset.monthlyContribution,
    0,
  )
  const topAsset = [...plan.assets].sort(
    (a, b) => b.currentValue - a.currentValue,
  )[0]
  const concentration =
    topAsset && projection.summary.currentNetWorth > 0
      ? topAsset.currentValue / projection.summary.currentNetWorth
      : 0

  const insights: InsightItem[] = []

  if (plan.goals.length === 0) {
    insights.push({
      tone: 'warn',
      title: 'No goals are linked to this plan',
      body: "You can't see funding gaps until at least one goal is added.",
    })
  } else if (shortfalls.length > 0) {
    insights.push({
      tone: 'alert',
      title: `${shortfalls.length} goal${shortfalls.length === 1 ? '' : 's'} still short`,
      body: `Largest gap is ${fmtCurrency(Math.max(...shortfalls.map((goal) => goal.gap)))} under the base scenario.`,
    })
  } else {
    insights.push({
      tone: 'info',
      title: 'All configured goals are on track',
      body: 'Keep contribution and allocation steady through each target date.',
    })
  }

  insights.push({
    tone: 'info',
    title: `Assumed weighted return ${fmtPercentFromBps(projection.summary.weightedExpectedAnnualReturnBps)}`,
    body: `Projected XIRR ${fmtXirr(projection.summary.projectedXirr)}. Returns are entered net of expected fees and taxes.`,
  })

  insights.push({
    tone: monthly > 0 ? 'info' : 'warn',
    title:
      monthly > 0
        ? `Monthly contributions total ${fmtCurrency(monthly)}`
        : 'No monthly contributions configured',
    body:
      monthly > 0
        ? 'A steady SIP cadence is the main driver early in the projection window.'
        : 'Add recurring contributions in Assets to grow the projected balance.',
  })

  if (concentration >= 0.5 && topAsset) {
    insights.push({
      tone: 'warn',
      title: `${topAsset.name} is ${Math.round(concentration * 100)}% of current value`,
      body: 'Watch concentration drift as markets move and contributions land.',
    })
  } else {
    insights.push({
      tone: 'info',
      title: `Inflation assumption ${fmtPercentFromBps(plan.inflationRateBps)}`,
      body: "Real (today's money) outcomes use this rate when you switch the timeline to Real.",
    })
  }

  for (const warning of projection.warnings.slice(0, 2)) {
    insights.push({
      tone: 'alert',
      title: 'Projection warning',
      body: warning,
    })
  }

  return (
    <Card className="rounded-[10px]">
      <CardHeader className="px-6 pt-6">
        <CardTitle className="font-serif text-[19px] font-semibold tracking-tight">
          Insights
        </CardTitle>
        <CardDescription className="text-[13.5px]">
          Actionable findings from the shared projection engine.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <ul className="divide-y divide-border">
          {insights.map((insight) => {
            const Icon =
              insight.tone === 'alert'
                ? AlertTriangle
                : insight.tone === 'warn'
                  ? TriangleAlert
                  : Info
            return (
              <li
                key={`${insight.tone}-${insight.title}`}
                className="flex gap-3 py-3.5 first:pt-1"
              >
                <div
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-lg',
                    insight.tone === 'info' && 'bg-primary/10 text-primary',
                    insight.tone === 'warn' && 'bg-chart-4/15 text-chart-4',
                    insight.tone === 'alert' &&
                      'bg-destructive/10 text-destructive',
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h4 className="text-[13.5px] font-semibold text-foreground">
                    {insight.title}
                  </h4>
                  <p className="text-[12.5px] text-muted-foreground">
                    {insight.body}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
