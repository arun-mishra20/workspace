import type { ProjectionConfig, ProjectionInsight, ProjectionResult } from './projection.schema.js'
import { MILESTONE_TARGETS } from './defaults.js'
import { projectPortfolio } from './projection-engine.js'

function formatINR(amount: number): string {
  if (amount >= 10_000_000) {
    return `₹${(amount / 10_000_000).toFixed(1)} Cr`
  }
  if (amount >= 100_000) {
    return `₹${(amount / 100_000).toFixed(1)} L`
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`
}

export function generateInsights(
  result: ProjectionResult,
  options?: {
    historicalAvgMonthly?: number
    currentMonthly?: number
  },
): ProjectionInsight[] {
  const insights: ProjectionInsight[] = []
  const { summary, config, snapshots } = result

  const fiveCrTarget = MILESTONE_TARGETS.find((m) => m.targetINR === 50_000_000)
  if (fiveCrTarget) {
    const hitMonth = snapshots.findIndex((s) => s.totalValue >= fiveCrTarget.targetINR)
    if (hitMonth >= 0) {
      const years = (hitMonth / 12).toFixed(1)
      insights.push({
        id: 'milestone-5cr',
        type: 'milestone',
        message: `Your portfolio is projected to reach ${formatINR(fiveCrTarget.targetINR)} in approximately ${years} years.`,
        highlight: `${years} years`,
      })
    } else {
      insights.push({
        id: 'milestone-5cr-far',
        type: 'milestone',
        message: `At current rates, reaching ${formatINR(fiveCrTarget.targetINR)} would take more than ${Math.round(snapshots.length / 12)} years. Consider increasing contributions.`,
      })
    }
  }

  if (config.inflation.enabled && summary.inflationImpact > 0) {
    const lossPercent = Math.round(
      (summary.inflationImpact / summary.finalCorpus) * 100,
    )
    insights.push({
      id: 'inflation-impact',
      type: 'inflation',
      message: `Inflation at ${config.inflation.rate}% could reduce purchasing power by approximately ${lossPercent}%.`,
      highlight: `${lossPercent}%`,
    })
  }

  if (config.stepUp.enabled) {
    const withoutStepUp = projectPortfolio({
      ...config,
      stepUp: { ...config.stepUp, enabled: false },
    })
    const delta = summary.finalCorpus - withoutStepUp.summary.finalCorpus
    if (delta > 0) {
      insights.push({
        id: 'stepup-impact',
        type: 'stepup',
        message: `Increasing your SIP by ${config.stepUp.annualIncrementPercent}% annually could add ${formatINR(delta)} over the projection period.`,
        highlight: formatINR(delta),
      })
    }
  }

  if (config.multiAsset.enabled) {
    const finalSnapshot = snapshots[snapshots.length - 1]
    if (finalSnapshot) {
      const entries = config.multiAsset.assetClasses
        .map((asset) => ({
          name: asset.name,
          value: finalSnapshot.assetValues[asset.id] ?? 0,
        }))
        .sort((a, b) => b.value - a.value)

      const total = finalSnapshot.totalValue
      if (entries[0] && total > 0) {
        const pct = Math.round((entries[0].value / total) * 100)
        insights.push({
          id: 'top-asset',
          type: 'allocation',
          message: `${entries[0].name} currently contributes ${pct}% of your projected portfolio.`,
          highlight: `${pct}%`,
        })

        const growthLeader = [...config.multiAsset.assetClasses].sort(
          (a, b) => b.expectedReturn - a.expectedReturn,
        )[0]
        if (growthLeader) {
          insights.push({
            id: 'growth-leader',
            type: 'growth',
            message: `${growthLeader.name} is expected to generate the largest share of long-term growth at ${growthLeader.expectedReturn}% annual return.`,
            highlight: growthLeader.name,
          })
        }
      }
    }
  }

  if (
    options?.historicalAvgMonthly &&
    options.currentMonthly &&
    options.currentMonthly > options.historicalAvgMonthly
  ) {
    insights.push({
      id: 'ahead-of-history',
      type: 'history',
      message: `Your current investment rate of ${formatINR(options.currentMonthly)}/month is ahead of your historical average of ${formatINR(options.historicalAvgMonthly)}/month.`,
      highlight: 'ahead of average',
    })
  }

  if (summary.wealthMultiplier > 1) {
    insights.push({
      id: 'wealth-multiplier',
      type: 'milestone',
      message: `Your wealth multiplier is ${summary.wealthMultiplier}x — every ₹1 invested could grow to ₹${summary.wealthMultiplier.toFixed(1)}.`,
      highlight: `${summary.wealthMultiplier}x`,
    })
  }

  return insights
}

export function generateStepUpInsight(
  config: ProjectionConfig,
  incrementPercent: number,
): string {
  const withStepUp = projectPortfolio({
    ...config,
    stepUp: { enabled: true, annualIncrementPercent: incrementPercent },
  })
  const withoutStepUp = projectPortfolio({
    ...config,
    stepUp: { enabled: false, annualIncrementPercent: incrementPercent },
  })
  const delta = withStepUp.summary.finalCorpus - withoutStepUp.summary.finalCorpus
  return `Increasing your SIP by just ${incrementPercent}% annually could add ${formatINR(delta)} over the projection period.`
}
