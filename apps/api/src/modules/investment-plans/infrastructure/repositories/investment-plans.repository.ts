import { Inject, Injectable } from '@nestjs/common'
import {
  holdingsTable,
  investmentPlanAssetsTable,
  investmentPlanEventsTable,
  investmentPlanGoalAllocationsTable,
  investmentPlanGoalsTable,
  investmentPlansTable,
  investmentPlanScenariosTable,
  principalDistributionTable,
} from '@workspace/database'
import { and, eq } from 'drizzle-orm'

import { DB_TOKEN } from '@/shared/infrastructure/db/db.port'

import type {
  InvestmentPlanRefreshProposal,
  InvestmentPlanRepositoryPort,
  PersistedInvestmentPlan,
} from '@/modules/investment-plans/application/ports/investment-plan.repository.port'
import type { DrizzleDb } from '@/shared/infrastructure/db/db.port'
import type { InvestmentPlanInput } from '@workspace/domain'

const toNumber = (value: string | number | null) => Number(value ?? 0)

function mapHoldingAssetType(assetType: string): string {
  if (assetType === 'stock') return 'indian_equity'
  if (assetType === 'mutual_fund') return 'mutual_fund'
  if (assetType === 'etf') return 'etf'
  if (assetType === 'gold') return 'gold'
  return 'other'
}

function mapPrincipalDistributionName(name: string): string {
  const normalized = name.trim().toLowerCase()
  if (normalized.includes('us equity') || normalized.includes('us stock')) return 'us_equity'
  if (normalized.includes('stock') || normalized.includes('equity')) return 'indian_equity'
  if (normalized.includes('mutual')) return 'mutual_fund'
  if (normalized.includes('etf')) return 'etf'
  if (normalized.includes('gold')) return 'gold'
  if (normalized.includes('crypto')) return 'crypto'
  if (normalized.includes('cash') || normalized.includes('liquid')) return 'cash'
  if (normalized.includes('fd') || normalized.includes('fixed deposit') || normalized.includes('fixed_deposit')) {
    return 'fixed_deposit'
  }
  if (
    normalized.includes('debt')
    || normalized.includes('bond')
    || normalized.includes('pf')
    || normalized.includes('ppf')
    || normalized.includes('epf')
  ) {
    return 'debt'
  }
  return 'other'
}

@Injectable()
export class InvestmentPlansRepository implements InvestmentPlanRepositoryPort {
  constructor(@Inject(DB_TOKEN) private readonly db: DrizzleDb) {}

  async list(userId: string) {
    const rows = await this.db
      .select({
        id: investmentPlansTable.id,
        name: investmentPlansTable.name,
        revision: investmentPlansTable.revision,
        updatedAt: investmentPlansTable.updatedAt,
      })
      .from(investmentPlansTable)
      .where(eq(investmentPlansTable.userId, userId))
      .orderBy(investmentPlansTable.updatedAt)
    return rows.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() }))
  }

  async findById(id: string, userId: string): Promise<PersistedInvestmentPlan | null> {
    const [plan] = await this.db
      .select()
      .from(investmentPlansTable)
      .where(and(eq(investmentPlansTable.id, id), eq(investmentPlansTable.userId, userId)))
    if (!plan) return null
    const [assets, events, goals, allocations, scenarios] = await Promise.all([
      this.db.select().from(investmentPlanAssetsTable).where(eq(investmentPlanAssetsTable.planId, id)).orderBy(investmentPlanAssetsTable.sortOrder),
      this.db
        .select({ event: investmentPlanEventsTable })
        .from(investmentPlanEventsTable)
        .innerJoin(investmentPlanAssetsTable, eq(investmentPlanEventsTable.assetId, investmentPlanAssetsTable.id))
        .where(eq(investmentPlanAssetsTable.planId, id)),
      this.db.select().from(investmentPlanGoalsTable).where(eq(investmentPlanGoalsTable.planId, id)),
      this.db
        .select({ allocation: investmentPlanGoalAllocationsTable })
        .from(investmentPlanGoalAllocationsTable)
        .innerJoin(investmentPlanAssetsTable, eq(investmentPlanGoalAllocationsTable.assetId, investmentPlanAssetsTable.id))
        .where(eq(investmentPlanAssetsTable.planId, id)),
      this.db.select().from(investmentPlanScenariosTable).where(eq(investmentPlanScenariosTable.planId, id)),
    ])
    return {
      version: 1,
      id: plan.id,
      name: plan.name,
      startDate: plan.startDate,
      projectionHorizonMonths: plan.projectionHorizonMonths,
      inflationRateBps: plan.inflationRateBps,
      contributionTiming: plan.contributionTiming as 'beginning' | 'end',
      revision: plan.revision,
      updatedAt: plan.updatedAt.toISOString(),
      assets: assets.map((asset) => ({
        id: asset.id,
        category: asset.category as InvestmentPlanInput['assets'][number]['category'],
        name: asset.name,
        currentValue: toNumber(asset.currentValue),
        monthlyContribution: toNumber(asset.monthlyContribution),
        contributionEndDate: asset.contributionEndDate ?? undefined,
        annualEscalationBps: asset.annualEscalationBps,
        expectedAnnualReturnBps: asset.expectedAnnualReturnBps,
        returnBasis: asset.returnBasis as 'nominal' | 'real',
        growthModel: asset.growthModel as 'market_return' | 'fixed_rate',
        volatilityBps: asset.volatilityBps ?? undefined,
        notes: asset.notes ?? undefined,
        order: asset.sortOrder,
      })),
      events: events.map(({ event }) => ({
        id: event.id,
        assetId: event.assetId,
        type: event.type as 'investment' | 'withdrawal',
        effectiveDate: event.effectiveDate,
        amount: toNumber(event.amount),
        note: event.note ?? undefined,
      })),
      goals: goals.map((goal) => ({
        id: goal.id,
        name: goal.name,
        type: goal.type as InvestmentPlanInput['goals'][number]['type'],
        targetDate: goal.targetDate,
        targetValueToday: goal.targetValueToday === null ? undefined : toNumber(goal.targetValueToday),
        inflationRateBps: goal.inflationRateBps ?? undefined,
        annualSpendingToday: goal.annualSpendingToday === null ? undefined : toNumber(goal.annualSpendingToday),
        safeWithdrawalRateBps: goal.safeWithdrawalRateBps ?? undefined,
      })),
      goalAllocations: allocations.map(({ allocation }) => ({
        id: allocation.id,
        assetId: allocation.assetId,
        goalId: allocation.goalId,
        currentValueAllocationBps: allocation.currentValueAllocationBps,
        contributionAllocationBps: allocation.contributionAllocationBps,
      })),
      scenarios: scenarios.map((scenario) => ({
        id: scenario.id,
        kind: scenario.kind as InvestmentPlanInput['scenarios'][number]['kind'],
        name: scenario.name,
        marketReturnDeltaBps: scenario.marketReturnDeltaBps,
        inflationDeltaBps: scenario.inflationDeltaBps,
      })),
    }
  }

  async create(userId: string, plan: InvestmentPlanInput): Promise<PersistedInvestmentPlan> {
    await this.db.transaction(async (tx) => {
      await this.insertPlan(tx as DrizzleDb, userId, plan, 1)
    })
    return (await this.findById(plan.id, userId))!
  }

  async replace(userId: string, plan: InvestmentPlanInput, revision: number): Promise<PersistedInvestmentPlan | 'conflict' | null> {
    const result = await this.db.transaction(async (tx) => {
      const updated = await tx
        .update(investmentPlansTable)
        .set({
          name: plan.name,
          startDate: plan.startDate,
          projectionHorizonMonths: plan.projectionHorizonMonths,
          inflationRateBps: plan.inflationRateBps,
          contributionTiming: plan.contributionTiming,
          revision: revision + 1,
          updatedAt: new Date(),
        })
        .where(and(
          eq(investmentPlansTable.id, plan.id),
          eq(investmentPlansTable.userId, userId),
          eq(investmentPlansTable.revision, revision),
        ))
        .returning({ id: investmentPlansTable.id })

      if (updated.length === 0) {
        const [existing] = await tx
          .select({ id: investmentPlansTable.id })
          .from(investmentPlansTable)
          .where(and(eq(investmentPlansTable.id, plan.id), eq(investmentPlansTable.userId, userId)))
        return existing ? 'conflict' as const : null
      }

      await tx.delete(investmentPlanAssetsTable).where(eq(investmentPlanAssetsTable.planId, plan.id))
      await tx.delete(investmentPlanGoalsTable).where(eq(investmentPlanGoalsTable.planId, plan.id))
      await tx.delete(investmentPlanScenariosTable).where(eq(investmentPlanScenariosTable.planId, plan.id))
      await this.insertChildren(tx as DrizzleDb, plan)
      return 'ok' as const
    })

    if (result === null || result === 'conflict') return result
    return (await this.findById(plan.id, userId))!
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(investmentPlansTable)
      .where(and(eq(investmentPlansTable.id, id), eq(investmentPlansTable.userId, userId)))
      .returning({ id: investmentPlansTable.id })
    return deleted.length > 0
  }

  async getRefreshProposal(userId: string): Promise<InvestmentPlanRefreshProposal> {
    const [holdings, distributions] = await Promise.all([
      this.db.select().from(holdingsTable).where(eq(holdingsTable.userId, userId)),
      this.db.select().from(principalDistributionTable).where(eq(principalDistributionTable.userId, userId)),
    ])

    const totals = new Map<string, number>()
    const categoriesFromHoldings = new Set<string>()
    for (const holding of holdings) {
      const category = mapHoldingAssetType(holding.assetType)
      categoriesFromHoldings.add(category)
      totals.set(category, (totals.get(category) ?? 0) + toNumber(holding.currentValue))
    }

    for (const distribution of distributions) {
      const category = mapPrincipalDistributionName(distribution.name)
      // Avoid double-counting when principal is a summary of holdings for the same category.
      if (categoriesFromHoldings.has(category)) continue
      totals.set(category, (totals.get(category) ?? 0) + toNumber(distribution.value))
    }

    return {
      assets: [...totals.entries()]
        .map(([category, currentValue]) => ({ category, currentValue: Math.round(currentValue * 100) / 100 }))
        .filter((asset) => asset.currentValue > 0)
        .sort((a, b) => a.category.localeCompare(b.category)),
    }
  }

  private async insertPlan(tx: DrizzleDb, userId: string, plan: InvestmentPlanInput, revision: number) {
    await tx.insert(investmentPlansTable).values({
      id: plan.id,
      userId,
      name: plan.name,
      startDate: plan.startDate,
      projectionHorizonMonths: plan.projectionHorizonMonths,
      inflationRateBps: plan.inflationRateBps,
      contributionTiming: plan.contributionTiming,
      revision,
    })
    await this.insertChildren(tx, plan)
  }

  private async insertChildren(tx: DrizzleDb, plan: InvestmentPlanInput) {
    await tx.insert(investmentPlanAssetsTable).values(plan.assets.map((asset) => ({
      id: asset.id,
      planId: plan.id,
      category: asset.category,
      name: asset.name,
      currentValue: asset.currentValue.toFixed(2),
      monthlyContribution: asset.monthlyContribution.toFixed(2),
      contributionEndDate: asset.contributionEndDate ?? null,
      annualEscalationBps: asset.annualEscalationBps,
      expectedAnnualReturnBps: asset.expectedAnnualReturnBps,
      returnBasis: asset.returnBasis,
      growthModel: asset.growthModel,
      volatilityBps: asset.volatilityBps ?? null,
      notes: asset.notes ?? null,
      sortOrder: asset.order,
    })))
    if (plan.events.length > 0) {
      await tx.insert(investmentPlanEventsTable).values(plan.events.map((event) => ({
        id: event.id,
        assetId: event.assetId,
        type: event.type,
        effectiveDate: event.effectiveDate,
        amount: event.amount.toFixed(2),
        note: event.note ?? null,
      })))
    }
    if (plan.goals.length > 0) {
      await tx.insert(investmentPlanGoalsTable).values(plan.goals.map((goal) => ({
        id: goal.id,
        planId: plan.id,
        name: goal.name,
        type: goal.type,
        targetDate: goal.targetDate,
        targetValueToday: goal.targetValueToday?.toFixed(2) ?? null,
        inflationRateBps: goal.inflationRateBps ?? null,
        annualSpendingToday: goal.annualSpendingToday?.toFixed(2) ?? null,
        safeWithdrawalRateBps: goal.safeWithdrawalRateBps ?? null,
      })))
    }
    if (plan.goalAllocations.length > 0) {
      await tx.insert(investmentPlanGoalAllocationsTable).values(plan.goalAllocations.map((allocation) => ({
        id: allocation.id,
        assetId: allocation.assetId,
        goalId: allocation.goalId,
        currentValueAllocationBps: allocation.currentValueAllocationBps,
        contributionAllocationBps: allocation.contributionAllocationBps,
      })))
    }
    await tx.insert(investmentPlanScenariosTable).values(plan.scenarios.map((scenario) => ({
      id: scenario.id,
      planId: plan.id,
      kind: scenario.kind,
      name: scenario.name,
      marketReturnDeltaBps: scenario.marketReturnDeltaBps,
      inflationDeltaBps: scenario.inflationDeltaBps,
    })))
  }
}
