import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'

import { INVESTMENT_PLAN_REPOSITORY } from '@/modules/investment-plans/application/ports/investment-plan.repository.port'

import type {
  InvestmentPlanRefreshResult,
  InvestmentPlanRepositoryPort,
  PersistedInvestmentPlan,
} from '@/modules/investment-plans/application/ports/investment-plan.repository.port'
import type { InvestmentPlanInput } from '@workspace/domain'

@Injectable()
export class InvestmentPlansService {
  constructor(@Inject(INVESTMENT_PLAN_REPOSITORY) private readonly repository: InvestmentPlanRepositoryPort) {}

  list(userId: string) {
    return this.repository.list(userId)
  }

  async get(id: string, userId: string): Promise<PersistedInvestmentPlan> {
    const plan = await this.repository.findById(id, userId)
    if (!plan) throw new NotFoundException('Investment plan not found')
    return plan
  }

  create(userId: string, plan: InvestmentPlanInput) {
    return this.repository.create(userId, plan)
  }

  async replace(id: string, userId: string, revision: number, plan: InvestmentPlanInput) {
    if (id !== plan.id) throw new BadRequestException('Plan ID does not match request path')
    const result = await this.repository.replace(userId, plan, revision)
    if (!result) throw new NotFoundException('Investment plan not found')
    if (result === 'conflict') {
      throw new ConflictException('This plan was changed on another device. Reload or save a copy.')
    }
    return result
  }

  async delete(id: string, userId: string) {
    const deleted = await this.repository.delete(id, userId)
    if (!deleted) throw new NotFoundException('Investment plan not found')
  }

  async refreshSource(id: string, userId: string): Promise<InvestmentPlanRefreshResult> {
    const plan = await this.get(id, userId)
    const proposal = await this.repository.getRefreshProposal(userId)
    const currentByCategory = new Map<string, number>()
    for (const asset of plan.assets) {
      currentByCategory.set(asset.category, (currentByCategory.get(asset.category) ?? 0) + asset.currentValue)
    }
    const proposalByCategory = new Map(proposal.assets.map((asset) => [asset.category, asset.currentValue]))
    const categories = new Set([...currentByCategory.keys(), ...proposalByCategory.keys()])
    const added: InvestmentPlanRefreshResult['diff']['added'] = []
    const changed: InvestmentPlanRefreshResult['diff']['changed'] = []
    const removed: InvestmentPlanRefreshResult['diff']['removed'] = []
    for (const category of categories) {
      const from = currentByCategory.get(category)
      const to = proposalByCategory.get(category)
      if (from === undefined && to !== undefined) added.push({ category, currentValue: to })
      else if (from !== undefined && to === undefined) removed.push({ category, currentValue: from })
      else if (from !== undefined && to !== undefined && Math.abs(from - to) > 0.005) {
        changed.push({ category, from, to })
      }
    }
    return { proposal, diff: { added, changed, removed } }
  }
}
