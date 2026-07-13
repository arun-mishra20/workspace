import type { InvestmentPlanInput } from '@workspace/domain'
import type { InvestmentPlanRefreshResult } from '@/features/investment-plans/api/investment-plans'

/** Normalize empty optional fields so Zod date/optional parsers stay valid. */
export function normalizeInvestmentPlan(plan: InvestmentPlanInput): InvestmentPlanInput {
  return {
    ...plan,
    assets: (plan.assets ?? []).map((asset) => ({
      ...asset,
      contributionEndDate: asset.contributionEndDate || undefined,
      notes: asset.notes || undefined,
      volatilityBps: asset.volatilityBps || undefined,
    })),
    events: (plan.events ?? []).map((event) => ({
      ...event,
      note: event.note || undefined,
    })),
    goals: (plan.goals ?? []).map((goal) => ({
      ...goal,
      targetValueToday: goal.targetValueToday || undefined,
      inflationRateBps: goal.inflationRateBps || undefined,
      annualSpendingToday: goal.annualSpendingToday || undefined,
      safeWithdrawalRateBps: goal.safeWithdrawalRateBps || undefined,
    })),
    goalAllocations: plan.goalAllocations ?? [],
    scenarios: plan.scenarios ?? [],
  }
}

/**
 * Apply a refresh proposal onto the plan form (client-side only).
 * Matching categories get updated currentValue; contributions/returns are unchanged.
 * Persistence still happens through the normal PUT autosave path.
 */
export function applyRefreshProposalToPlan(
  plan: InvestmentPlanInput,
  result: InvestmentPlanRefreshResult,
): InvestmentPlanInput {
  const byCategory = new Map(
    result.proposal.assets.map((asset) => [asset.category, asset.currentValue]),
  )
  return {
    ...plan,
    assets: plan.assets.map((asset) => {
      const nextValue = byCategory.get(asset.category)
      if (nextValue === undefined) return asset
      return { ...asset, currentValue: nextValue }
    }),
  }
}

export function countMeaningfulRefreshChanges(result: InvestmentPlanRefreshResult): number {
  const removedNonZero = result.diff.removed.filter((item) => item.currentValue > 0).length
  return result.diff.added.length + result.diff.changed.length + removedNonZero
}
