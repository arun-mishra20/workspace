import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common'

import { GrowwParserService } from './groww-parser.service'
import { HOLDINGS_REPOSITORY } from '../ports/holdings.repository.port'

import type { HoldingsRepositoryPort } from '../ports/holdings.repository.port'
import type { Holding } from '@workspace/database'
import type { CreateHolding, PortfolioSummary } from '@workspace/domain'

@Injectable()
export class HoldingsService {
  constructor(
    @Inject(HOLDINGS_REPOSITORY)
    private readonly holdingsRepository: HoldingsRepositoryPort,
    private readonly growwParser: GrowwParserService,
  ) {}

  async getHoldings(userId: string): Promise<Holding[]> {
    return this.holdingsRepository.findByUserId(userId)
  }

  async getHolding(id: string, userId: string): Promise<Holding> {
    const holding = await this.holdingsRepository.findById(id, userId)
    if (!holding) {
      throw new NotFoundException('Holding not found')
    }
    return holding
  }

  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    return this.holdingsRepository.getPortfolioSummary(userId)
  }

  async createHolding(userId: string, data: CreateHolding): Promise<Holding> {
    // Check if holding already exists
    const existing = await this.holdingsRepository.findBySymbol(data.symbol, userId)
    if (existing) {
      throw new ConflictException(`Holding with symbol ${data.symbol} already exists`)
    }

    const quantity
      = typeof data.quantity === 'string' ? Number.parseFloat(data.quantity) : data.quantity
    const avgBuyPrice
      = typeof data.avgBuyPrice === 'string' ? Number.parseFloat(data.avgBuyPrice) : data.avgBuyPrice
    const currentPrice = data.currentPrice
      ? (typeof data.currentPrice === 'string'
          ? Number.parseFloat(data.currentPrice)
          : data.currentPrice)
      : avgBuyPrice

    const investedValue = quantity * avgBuyPrice
    const currentValue = quantity * currentPrice
    const totalReturns = currentValue - investedValue
    const returnsPercentage = investedValue > 0 ? (totalReturns / investedValue) * 100 : 0

    return this.holdingsRepository.create({
      userId,
      symbol: data.symbol,
      name: data.name,
      assetType: data.assetType,
      platform: data.platform || null,
      quantity: quantity.toString(),
      avgBuyPrice: avgBuyPrice.toFixed(2),
      currentPrice: currentPrice.toFixed(2),
      investedValue: investedValue.toFixed(2),
      currentValue: currentValue.toFixed(2),
      totalReturns: totalReturns.toFixed(2),
      returnsPercentage: returnsPercentage.toFixed(4),
    })
  }

  async updateHolding(
    id: string,
    userId: string,
    data: Partial<CreateHolding>,
  ): Promise<Holding> {
    const existing = await this.getHolding(id, userId)

    const quantity = data.quantity
      ? (typeof data.quantity === 'string'
          ? Number.parseFloat(data.quantity)
          : data.quantity)
      : Number.parseFloat(existing.quantity)

    const avgBuyPrice = data.avgBuyPrice
      ? (typeof data.avgBuyPrice === 'string'
          ? Number.parseFloat(data.avgBuyPrice)
          : data.avgBuyPrice)
      : Number.parseFloat(existing.avgBuyPrice)

    const currentPrice = data.currentPrice
      ? (typeof data.currentPrice === 'string'
          ? Number.parseFloat(data.currentPrice)
          : data.currentPrice)
      : (existing.currentPrice
          ? Number.parseFloat(existing.currentPrice)
          : avgBuyPrice)

    const investedValue = quantity * avgBuyPrice
    const currentValue = quantity * currentPrice
    const totalReturns = currentValue - investedValue
    const returnsPercentage = investedValue > 0 ? (totalReturns / investedValue) * 100 : 0

    return this.holdingsRepository.update(id, userId, {
      ...(data.symbol && { symbol: data.symbol }),
      ...(data.name && { name: data.name }),
      ...(data.assetType && { assetType: data.assetType }),
      ...(data.platform !== undefined && { platform: data.platform || null }),
      quantity: quantity.toString(),
      avgBuyPrice: avgBuyPrice.toFixed(2),
      currentPrice: currentPrice.toFixed(2),
      investedValue: investedValue.toFixed(2),
      currentValue: currentValue.toFixed(2),
      totalReturns: totalReturns.toFixed(2),
      returnsPercentage: returnsPercentage.toFixed(4),
    })
  }

  async deleteHolding(id: string, userId: string): Promise<void> {
    const holding = await this.holdingsRepository.findById(id, userId)
    if (!holding) {
      throw new NotFoundException('Holding not found')
    }
    await this.holdingsRepository.delete(id, userId)
  }

  async importFromGroww(
    userId: string,
    jsonString: string,
  ): Promise<{ imported: number, skipped: number, errors: string[] }> {
    const parsed = this.growwParser.parseAndNormalise(jsonString)

    if (parsed.length === 0) {
      return { imported: 0, skipped: 0, errors: ['No holdings found in the provided data'] }
    }

    // Clear existing Groww holdings only (preserve manual / other platform entries)
    await this.holdingsRepository.deleteByPlatform(userId, 'Groww')

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const h of parsed) {
      try {
        await this.holdingsRepository.create({
          userId,
          symbol: h.symbol,
          name: h.name,
          assetType: h.assetType,
          platform: h.platform,
          quantity: h.quantity.toString(),
          avgBuyPrice: h.avgBuyPrice.toFixed(2),
          currentPrice: h.currentPrice.toFixed(2),
          investedValue: h.investedValue.toFixed(2),
          currentValue: h.currentValue.toFixed(2),
          totalReturns: h.totalReturns.toFixed(2),
          returnsPercentage: h.returnsPercentage.toFixed(4),
        })
        imported++
      } catch (error) {
        skipped++
        errors.push(`Failed to import ${h.symbol}: ${(error as Error).message}`)
      }
    }

    return { imported, skipped, errors }
  }
}
