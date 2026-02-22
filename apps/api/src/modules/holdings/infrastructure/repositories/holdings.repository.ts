import { Inject, Injectable } from '@nestjs/common'
import { holdingsTable } from '@workspace/database'
import { eq, and, sql } from 'drizzle-orm'

import { DB_TOKEN } from '@/shared/infrastructure/db/db.port'

import type { HoldingsRepositoryPort } from '../../application/ports/holdings.repository.port'
import type { DrizzleDb } from '@/shared/infrastructure/db/db.port'
import type { Holding } from '@workspace/database'
import type { PortfolioSummary } from '@workspace/domain'

interface BreakdownRow {
  assetType?: string
  platform?: string | null
  investedValue: number
  currentValue: number
  returns: number
  count: number
}

@Injectable()
export class HoldingsRepository implements HoldingsRepositoryPort {
  constructor(@Inject(DB_TOKEN) private readonly db: DrizzleDb) {}

  async findByUserId(userId: string): Promise<Holding[]> {
    return this.db.select().from(holdingsTable).where(eq(holdingsTable.userId, userId))
  }

  async findById(id: string, userId: string): Promise<Holding | null> {
    const [holding] = await this.db
      .select()
      .from(holdingsTable)
      .where(and(eq(holdingsTable.id, id), eq(holdingsTable.userId, userId)))
      .limit(1)
    return holding || null
  }

  async findBySymbol(symbol: string, userId: string): Promise<Holding | null> {
    const [holding] = await this.db
      .select()
      .from(holdingsTable)
      .where(and(eq(holdingsTable.symbol, symbol), eq(holdingsTable.userId, userId)))
      .limit(1)
    return holding || null
  }

  async create(holding: Omit<Holding, 'id' | 'createdAt' | 'updatedAt'>): Promise<Holding> {
    const [created] = await this.db.insert(holdingsTable).values(holding).returning()
    return created!
  }

  async update(id: string, userId: string, data: Partial<Holding>): Promise<Holding> {
    const [updated] = await this.db
      .update(holdingsTable)
      .set(data)
      .where(and(eq(holdingsTable.id, id), eq(holdingsTable.userId, userId)))
      .returning()
    return updated!
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.db
      .delete(holdingsTable)
      .where(and(eq(holdingsTable.id, id), eq(holdingsTable.userId, userId)))
  }

  async deleteAll(userId: string): Promise<void> {
    await this.db.delete(holdingsTable).where(eq(holdingsTable.userId, userId))
  }

  async deleteByPlatform(userId: string, platform: string): Promise<void> {
    await this.db
      .delete(holdingsTable)
      .where(and(eq(holdingsTable.userId, userId), eq(holdingsTable.platform, platform)))
  }

  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    // Get overall totals
    const [totalsRow] = await this.db
      .select({
        totalInvestedValue: sql<number>`COALESCE(SUM(CAST(${holdingsTable.investedValue} AS NUMERIC)), 0)`,
        totalCurrentValue: sql<number>`COALESCE(SUM(CAST(${holdingsTable.currentValue} AS NUMERIC)), 0)`,
        totalReturns: sql<number>`COALESCE(SUM(CAST(${holdingsTable.totalReturns} AS NUMERIC)), 0)`,
      })
      .from(holdingsTable)
      .where(eq(holdingsTable.userId, userId))

    const totals = totalsRow ?? {
      totalInvestedValue: 0,
      totalCurrentValue: 0,
      totalReturns: 0,
    }

    const totalReturnsPercentage
      = totals.totalInvestedValue > 0
        ? (totals.totalReturns / totals.totalInvestedValue) * 100
        : 0

    // Get asset type breakdown
    const assetTypeBreakdown: BreakdownRow[] = await this.db
      .select({
        assetType: holdingsTable.assetType,
        investedValue: sql<number>`COALESCE(SUM(CAST(${holdingsTable.investedValue} AS NUMERIC)), 0)`,
        currentValue: sql<number>`COALESCE(SUM(CAST(${holdingsTable.currentValue} AS NUMERIC)), 0)`,
        returns: sql<number>`COALESCE(SUM(CAST(${holdingsTable.totalReturns} AS NUMERIC)), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(holdingsTable)
      .where(eq(holdingsTable.userId, userId))
      .groupBy(holdingsTable.assetType)

    // Get platform breakdown
    const platformBreakdown: BreakdownRow[] = await this.db
      .select({
        platform: holdingsTable.platform,
        investedValue: sql<number>`COALESCE(SUM(CAST(${holdingsTable.investedValue} AS NUMERIC)), 0)`,
        currentValue: sql<number>`COALESCE(SUM(CAST(${holdingsTable.currentValue} AS NUMERIC)), 0)`,
        returns: sql<number>`COALESCE(SUM(CAST(${holdingsTable.totalReturns} AS NUMERIC)), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(holdingsTable)
      .where(eq(holdingsTable.userId, userId))
      .groupBy(holdingsTable.platform)

    return {
      totalInvestedValue: totals.totalInvestedValue,
      totalCurrentValue: totals.totalCurrentValue,
      totalReturns: totals.totalReturns,
      totalReturnsPercentage,
      assetTypeBreakdown: assetTypeBreakdown.map((item) => ({
        assetType: item.assetType ?? 'Unknown',
        investedValue: item.investedValue,
        currentValue: item.currentValue,
        returns: item.returns,
        returnsPercentage:
                    item.investedValue > 0 ? (item.returns / item.investedValue) * 100 : 0,
        count: item.count,
      })),
      platformBreakdown: platformBreakdown.map((item) => ({
        platform: item.platform || 'Unknown',
        investedValue: item.investedValue,
        currentValue: item.currentValue,
        returns: item.returns,
        returnsPercentage:
                    item.investedValue > 0 ? (item.returns / item.investedValue) * 100 : 0,
        count: item.count,
      })),
    }
  }
}
