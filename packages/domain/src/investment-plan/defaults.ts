import { format, startOfMonth } from 'date-fns'

import type { InvestmentPlanAssetCategory, InvestmentPlanInput, InvestmentPlanScenario } from './investment-plan.schema.js'

const id = () => globalThis.crypto.randomUUID()

export const ASSET_CATEGORY_LABELS: Record<InvestmentPlanAssetCategory, string> = {
  indian_equity: 'Indian Equity', us_equity: 'US Equity', mutual_fund: 'Mutual Funds', etf: 'ETFs',
  gold: 'Gold', debt: 'Debt', fixed_deposit: 'Fixed Deposits', cash: 'Cash', crypto: 'Crypto', other: 'Other',
}

export function createDefaultPlanScenarios(): InvestmentPlanScenario[] {
  return [
    { id: id(), kind: 'conservative', name: 'Conservative', marketReturnDeltaBps: -200, inflationDeltaBps: 100 },
    { id: id(), kind: 'base', name: 'Base', marketReturnDeltaBps: 0, inflationDeltaBps: 0 },
    { id: id(), kind: 'optimistic', name: 'Optimistic', marketReturnDeltaBps: 200, inflationDeltaBps: -100 },
  ]
}

export function createDefaultInvestmentPlan(): InvestmentPlanInput {
  const categories: InvestmentPlanAssetCategory[] = ['indian_equity', 'us_equity', 'mutual_fund', 'etf', 'gold', 'debt', 'fixed_deposit', 'cash', 'crypto', 'other']
  return {
    version: 1,
    id: id(),
    name: 'My Investment Plan',
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    projectionHorizonMonths: 360,
    inflationRateBps: 600,
    contributionTiming: 'end',
    assets: categories.map((category, order) => ({
      id: id(), category, name: ASSET_CATEGORY_LABELS[category], order,
      currentValue: 0, monthlyContribution: category === 'indian_equity' ? 10_000 : 0,
      annualEscalationBps: 0, expectedAnnualReturnBps: category === 'indian_equity' ? 1_200 : category === 'debt' ? 700 : category === 'cash' ? 300 : 800,
      returnBasis: 'nominal', growthModel: category === 'fixed_deposit' || category === 'cash' ? 'fixed_rate' : 'market_return',
    })),
    events: [], goals: [], goalAllocations: [], scenarios: createDefaultPlanScenarios(),
  }
}
