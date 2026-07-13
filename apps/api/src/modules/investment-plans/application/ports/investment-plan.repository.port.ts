import type { InvestmentPlanInput } from '@workspace/domain'

export interface PersistedInvestmentPlan extends InvestmentPlanInput {
  revision: number
  updatedAt: string
}

export interface InvestmentPlanRefreshProposal {
  assets: { category: string; currentValue: number }[]
}

export interface InvestmentPlanRefreshResult {
  proposal: InvestmentPlanRefreshProposal
  diff: {
    added: { category: string; currentValue: number }[]
    changed: { category: string; from: number; to: number }[]
    removed: { category: string; currentValue: number }[]
  }
}

export interface InvestmentPlanRepositoryPort {
  list(userId: string): Promise<{ id: string; name: string; revision: number; updatedAt: string }[]>
  findById(id: string, userId: string): Promise<PersistedInvestmentPlan | null>
  create(userId: string, plan: InvestmentPlanInput): Promise<PersistedInvestmentPlan>
  replace(userId: string, plan: InvestmentPlanInput, revision: number): Promise<PersistedInvestmentPlan | 'conflict' | null>
  delete(id: string, userId: string): Promise<boolean>
  getRefreshProposal(userId: string): Promise<InvestmentPlanRefreshProposal>
}

export const INVESTMENT_PLAN_REPOSITORY = Symbol('INVESTMENT_PLAN_REPOSITORY')
