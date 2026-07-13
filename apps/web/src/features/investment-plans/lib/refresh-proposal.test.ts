import { afterEach, describe, expect, it } from 'vitest'
import { createDefaultInvestmentPlan } from '@workspace/domain'

import {
  applyRefreshProposalToPlan,
  countMeaningfulRefreshChanges,
  normalizeInvestmentPlan,
} from './refresh-proposal'

import type { InvestmentPlanRefreshResult } from '@/features/investment-plans/api/investment-plans'

describe('refresh proposal helpers', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('applies proposal current values onto matching categories', () => {
    const plan = createDefaultInvestmentPlan()
    const result: InvestmentPlanRefreshResult = {
      proposal: {
        assets: [
          { category: 'indian_equity', currentValue: 2_133_809.17 },
          { category: 'gold', currentValue: 356_500 },
        ],
      },
      diff: {
        added: [],
        changed: [
          { category: 'indian_equity', from: 0, to: 2_133_809.17 },
          { category: 'gold', from: 0, to: 356_500 },
        ],
        removed: [{ category: 'crypto', currentValue: 0 }],
      },
    }

    const next = applyRefreshProposalToPlan(plan, result)
    expect(next.assets.find((asset) => asset.category === 'indian_equity')?.currentValue).toBe(2_133_809.17)
    expect(next.assets.find((asset) => asset.category === 'gold')?.currentValue).toBe(356_500)
    expect(next.assets.find((asset) => asset.category === 'cash')?.currentValue).toBe(0)
    expect(countMeaningfulRefreshChanges(result)).toBe(2)
  })

  it('strips empty optional date strings before validation', () => {
    const plan = createDefaultInvestmentPlan()
    plan.assets[0]!.contributionEndDate = '' as unknown as string
    const normalized = normalizeInvestmentPlan(plan)
    expect(normalized.assets[0]!.contributionEndDate).toBeUndefined()
  })
})
