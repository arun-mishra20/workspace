import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { createDefaultInvestmentPlan } from '@workspace/domain'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InvestmentPlansService } from '@/modules/investment-plans/application/services/investment-plans.service'

import type {
  InvestmentPlanRepositoryPort,
  PersistedInvestmentPlan,
} from '@/modules/investment-plans/application/ports/investment-plan.repository.port'

function persisted(overrides: Partial<PersistedInvestmentPlan> = {}): PersistedInvestmentPlan {
  const plan = createDefaultInvestmentPlan()
  return {
    ...plan,
    id: 'plan-1',
    revision: 1,
    updatedAt: '2026-07-13T00:00:00.000Z',
    assets: [{
      ...plan.assets[0]!,
      id: 'asset-1',
      category: 'indian_equity',
      currentValue: 100_000,
      monthlyContribution: 0,
    }],
    ...overrides,
  }
}

describe('investment plans service', () => {
  let repository: {
    [K in keyof InvestmentPlanRepositoryPort]: ReturnType<typeof vi.fn>
  }
  let service: InvestmentPlansService

  beforeEach(() => {
    repository = {
      list: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      replace: vi.fn(),
      delete: vi.fn(),
      getRefreshProposal: vi.fn(),
    }
    service = new InvestmentPlansService(repository as unknown as InvestmentPlanRepositoryPort)
  })

  it('returns 404 when another user cannot access a plan', async () => {
    repository.findById.mockResolvedValue(null)
    await expect(service.get('plan-1', 'other-user')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('creates and returns a plan', async () => {
    const plan = persisted()
    repository.create.mockResolvedValue(plan)
    await expect(service.create('user-1', plan)).resolves.toEqual(plan)
    expect(repository.create).toHaveBeenCalledWith('user-1', plan)
  })

  it('rejects path/body id mismatch with 400', async () => {
    const plan = persisted({ id: 'plan-2' })
    await expect(service.replace('plan-1', 'user-1', 1, plan)).rejects.toBeInstanceOf(BadRequestException)
    expect(repository.replace).not.toHaveBeenCalled()
  })

  it('replaces a plan and bumps revision on success', async () => {
    const current = persisted({ revision: 1 })
    const replaced = persisted({ revision: 2, name: 'Updated' })
    repository.replace.mockResolvedValue(replaced)
    await expect(service.replace('plan-1', 'user-1', 1, current)).resolves.toEqual(replaced)
    expect(repository.replace).toHaveBeenCalledWith('user-1', current, 1)
  })

  it('returns 409 on stale revision', async () => {
    repository.replace.mockResolvedValue('conflict')
    await expect(service.replace('plan-1', 'user-1', 1, persisted())).rejects.toBeInstanceOf(ConflictException)
  })

  it('returns 404 when replacing a missing plan', async () => {
    repository.replace.mockResolvedValue(null)
    await expect(service.replace('plan-1', 'user-1', 1, persisted())).rejects.toBeInstanceOf(NotFoundException)
  })

  it('deletes an owned plan and 404s afterward', async () => {
    repository.delete.mockResolvedValue(true)
    await service.delete('plan-1', 'user-1')
    repository.findById.mockResolvedValue(null)
    await expect(service.get('plan-1', 'user-1')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('returns 404 when deleting a missing plan', async () => {
    repository.delete.mockResolvedValue(false)
    await expect(service.delete('plan-1', 'user-1')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('returns a refresh proposal and category diff without mutating the plan', async () => {
    repository.findById.mockResolvedValue(persisted({
      assets: [{
        id: 'asset-1',
        category: 'indian_equity',
        name: 'Equity',
        currentValue: 100_000,
        monthlyContribution: 0,
        annualEscalationBps: 0,
        expectedAnnualReturnBps: 1200,
        returnBasis: 'nominal',
        growthModel: 'market_return',
        order: 0,
      }, {
        id: 'asset-2',
        category: 'gold',
        name: 'Gold',
        currentValue: 20_000,
        monthlyContribution: 0,
        annualEscalationBps: 0,
        expectedAnnualReturnBps: 800,
        returnBasis: 'nominal',
        growthModel: 'market_return',
        order: 1,
      }],
    }))
    repository.getRefreshProposal.mockResolvedValue({
      assets: [
        { category: 'indian_equity', currentValue: 120_000 },
        { category: 'etf', currentValue: 15_000 },
      ],
    })

    const result = await service.refreshSource('plan-1', 'user-1')
    expect(result.proposal.assets).toHaveLength(2)
    expect(result.diff.added).toEqual([{ category: 'etf', currentValue: 15_000 }])
    expect(result.diff.changed).toEqual([{ category: 'indian_equity', from: 100_000, to: 120_000 }])
    expect(result.diff.removed).toEqual([{ category: 'gold', currentValue: 20_000 }])
    expect(repository.replace).not.toHaveBeenCalled()
  })
})
