import { Injectable, BadRequestException } from '@nestjs/common'
import {
  GrowwImportDataSchema,

} from '@workspace/domain'

import type { GrowwImportData, GrowwEquityHolding, GrowwMutualFundHolding, ParsedGrowwHolding } from '@workspace/domain'

@Injectable()
export class GrowwParserService {
  // ── Public API ─────────────────────────────────────────────────────

  /**
     * Parse + validate raw JSON string from the Groww export and return
     * a flat list of normalised holdings ready for persistence.
     */
  parseAndNormalise(jsonString: string): ParsedGrowwHolding[] {
    const data = this.parseGrowwJson(jsonString)
    return this.normalise(data)
  }

  // ── JSON parsing & Zod validation ──────────────────────────────────

  parseGrowwJson(jsonString: string): GrowwImportData {
    let raw: unknown
    try {
      raw = JSON.parse(jsonString)
    } catch {
      throw new BadRequestException('Invalid JSON format')
    }

    const result = GrowwImportDataSchema.safeParse(raw)
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
      throw new BadRequestException(`Invalid Groww data format – ${issues}`)
    }
    return result.data
  }

  // ── Normalisation ──────────────────────────────────────────────────

  normalise(data: GrowwImportData): ParsedGrowwHolding[] {
    const holdings: ParsedGrowwHolding[] = []

    // ── Equity / Stocks ────────────────────────────────────────────
    if (data.result.EQUITY?.holdings) {
      for (const eq of data.result.EQUITY.holdings) {
        holdings.push(this.normaliseEquity(eq))
      }
    }

    // ── Mutual Funds ───────────────────────────────────────────────
    if (data.result.MUTUAL_FUNDS?.portfolio_details?.holdings) {
      for (const mf of data.result.MUTUAL_FUNDS.portfolio_details.holdings) {
        holdings.push(this.normaliseMutualFund(mf))
      }
    }

    return holdings
  }

  // ── Equity normalisation ───────────────────────────────────────────

  private normaliseEquity(eq: GrowwEquityHolding): ParsedGrowwHolding {
    const investedValue = this.parseIndianValue(eq.invested_value)
    const currentValue = this.parseIndianValue(eq.current_value)
    const totalReturns = eq['p&l']
      ? this.parseIndianValue(eq['p&l'])
      : currentValue - investedValue
    const returnsPercentage = eq['p&l_percent']
      ? this.parsePercentage(eq['p&l_percent'])
      : (investedValue > 0
          ? (totalReturns / investedValue) * 100
          : 0)

    return {
      symbol: eq.trading_symbol,
      name: eq.title,
      isin: eq.isin,
      assetType: 'stock',
      platform: 'Groww',
      quantity: eq.quantity,
      avgBuyPrice: eq.average_price,
      currentPrice: eq.quantity > 0 ? currentValue / eq.quantity : eq.average_price,
      investedValue,
      currentValue,
      totalReturns,
      returnsPercentage,
      exchanges: eq.tradable_exchanges,
    }
  }

  // ── Mutual Fund normalisation ──────────────────────────────────────

  private normaliseMutualFund(mf: GrowwMutualFundHolding): ParsedGrowwHolding {
    const investedValue = this.parseIndianValue(mf.amountInvested)
    const currentValue = this.parseIndianValue(mf.currentValue)
    const totalReturns = currentValue - investedValue
    const returnsPercentage = investedValue > 0 ? (totalReturns / investedValue) * 100 : 0

    // Build a short symbol from fund name
    const symbol = this.extractMutualFundSymbol(mf.schemeName)

    return {
      symbol,
      name: mf.schemeName,
      assetType: 'mutual_fund',
      platform: 'Groww',
      quantity: mf.units,
      avgBuyPrice: mf.averageNav,
      currentPrice: mf.currentNav,
      investedValue,
      currentValue,
      totalReturns,
      returnsPercentage,
      planType: mf.planType,
      category: mf.category,
      xirr: mf.xirr,
      schemeType: mf.schemeType,
    }
  }

  // ── Symbol helpers ─────────────────────────────────────────────────

  /**
     * Produce a short uppercase symbol from a mutual-fund scheme name.
     *   "Parag Parikh Flexi Cap Fund Direct Growth" → "PPFCF_DIRECT"
     */
  private extractMutualFundSymbol(schemeName: string): string {
    // Remove common trailing noise
    const cleaned = schemeName
      .replaceAll(/\s*(Direct|Regular)\s*(Plan)?\s*/gi, ' ')
      .replaceAll(/\s*(Growth|Dividend|IDCW)\s*/gi, ' ')
      .trim()

    const words = cleaned.split(/\s+/).filter(Boolean)

    // Take initials of significant words (skip "Fund", "Ltd", etc.)
    const noise = new Set(['fund', 'scheme', 'plan', 'ltd', 'limited', 'of', 'the', '&', '-'])
    const initials = words
      .filter((w) => !noise.has(w.toLowerCase()))
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')

    // Append plan type hint
    const planHint = /direct/i.test(schemeName) ? '_DIRECT' : '_REGULAR'

    return (initials || cleaned.slice(0, 10).toUpperCase()) + planHint
  }

  // ── Value parsing helpers ──────────────────────────────────────────

  /**
     * Parse Indian-formatted value strings:
     *   "23.25 Thousands" → 23250
     *   "1.47 Lakhs"      → 147000
     *   "2 Crores"         → 20000000
     *   "-553.9"           → -553.9
     *   "134.14"           → 134.14
     */
  parseIndianValue(value: string | number | undefined | null): number {
    if (value === undefined || value === null) return 0
    if (typeof value === 'number') return value

    const cleaned = value.replaceAll(/[₹,]/g, '').trim()
    if (!cleaned) return 0

    // Negative prefix
    const sign = cleaned.startsWith('-') ? -1 : 1
    const abs = cleaned.replace(/^-/, '').trim()

    if (/Thousands$/i.test(abs)) {
      return sign * Number.parseFloat(abs.replace(/Thousands$/i, '').trim()) * 1000
    }
    if (/Lakhs$/i.test(abs)) {
      return sign * Number.parseFloat(abs.replace(/Lakhs$/i, '').trim()) * 100_000
    }
    if (/Crores$/i.test(abs)) {
      return sign * Number.parseFloat(abs.replace(/Crores$/i, '').trim()) * 10_000_000
    }

    const num = Number.parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }

  /**
     * Parse percentage strings: "-51.88%" → -51.88
     */
  parsePercentage(value: string | undefined | null): number {
    if (!value) return 0
    const cleaned = value.replaceAll('%', '').trim()
    const num = Number.parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }
}
