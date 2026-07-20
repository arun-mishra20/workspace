import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/ui/card'

import { fmtCurrency, fmtPercentFromBps, fmtXirr } from '@/features/investment-plans/lib/format'

import type { InvestmentPlanInput, InvestmentPlanProjection } from '@workspace/domain'

interface PlanInsightsProps {
  plan: InvestmentPlanInput
  projection: InvestmentPlanProjection
}

export function PlanInsights({ plan, projection }: PlanInsightsProps) {
  const shortfalls = projection.goals.filter((goal) => !goal.onTrack)
  const monthly = plan.assets.reduce((sum, asset) => sum + asset.monthlyContribution, 0)
  const topAsset = [...plan.assets].sort((a, b) => b.currentValue - a.currentValue)[0]
  const concentration
    = topAsset && projection.summary.currentNetWorth > 0
      ? topAsset.currentValue / projection.summary.currentNetWorth
      : 0

  const statements = [
    shortfalls.length > 0
      ? `${shortfalls.length} goal${shortfalls.length === 1 ? '' : 's'} still short by up to ${fmtCurrency(Math.max(...shortfalls.map((goal) => goal.gap)))}.`
      : plan.goals.length > 0
        ? 'All configured goals are on track under the base scenario.'
        : 'No goals configured yet — add one to turn projections into actions.',
    `Assumed weighted net return ${fmtPercentFromBps(projection.summary.weightedExpectedAnnualReturnBps)}; projected XIRR ${fmtXirr(projection.summary.projectedXirr)}.`,
    `Monthly contributions total ${fmtCurrency(monthly)}. Returns are entered net of expected fees and taxes.`,
    concentration >= 0.5 && topAsset
      ? `${topAsset.name} is ${Math.round(concentration * 100)}% of current value — watch concentration drift.`
      : `Inflation assumption ${fmtPercentFromBps(plan.inflationRateBps)} shapes real (today’s money) outcomes.`,
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-lg font-semibold tracking-tight">
          Insights
        </CardTitle>
        <CardDescription>Actionable findings from the shared projection engine.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {statements.map((statement) => (
            <li key={statement} className="rounded-lg border bg-muted/30 px-3 py-2">
              {statement}
            </li>
          ))}
        </ul>
        {projection.warnings.length > 0 && (
          <div className="mt-3 space-y-1 text-sm text-destructive">
            {projection.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
