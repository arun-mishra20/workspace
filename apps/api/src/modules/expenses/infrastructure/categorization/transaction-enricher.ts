import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  mergeTransactionAttributes,
  type TransactionAttributes,
} from '@/modules/expenses/infrastructure/categorization/transaction-attributes.schema'

export interface EnrichmentInput {
  merchant: string
  merchantRaw: string
  vpa?: string
  category: string
  subcategory: string
  amount: number
  transactionType: string
}

export interface EnrichmentResult {
  subcategory: string
  transactionAttributes?: TransactionAttributes
}

interface SubcategoryKeywordPattern {
  category: string
  keywords: string[]
  subcategory: string
}

interface SubcategoryRulesConfig {
  exact_matches?: Record<string, string>
  keyword_patterns?: SubcategoryKeywordPattern[]
  category_defaults?: Record<string, string>
}

const BUS_MERCHANT_REGEX = /^(BMTC BUS )?[A-Z]{2}\d{2}[A-Z]{1,2}\d{3,5}$/i
const INVESTMENT_MERCHANT_REGEX = /^(groww invest tech|zerodha broking|mutual funds iccl|mmtc pamp india)/i

export class TransactionEnricher {
  private static instance: TransactionEnricher | null = null

  static getInstance(): TransactionEnricher {
    if (!this.instance) {
      this.instance = new TransactionEnricher()
    }
    return this.instance
  }

  private readonly subcategoryRules: SubcategoryRulesConfig

  private constructor() {
    this.subcategoryRules = this.loadConfig<SubcategoryRulesConfig>('subcategory_rules.json')
  }

  enrich(input: EnrichmentInput): EnrichmentResult {
    const merchantLower = input.merchant.toLowerCase()
    const merchantRawLower = input.merchantRaw.toLowerCase()
    const searchable = `${merchantLower} ${merchantRawLower} ${input.vpa?.toLowerCase() ?? ''}`

    let subcategory = input.subcategory
    let attributes: TransactionAttributes | undefined

    const investment = this.classifyInvestment(merchantLower)
    if (investment) {
      subcategory = investment.subcategory
      attributes = mergeTransactionAttributes(attributes, {
        assetClass: investment.assetClass,
        platform: investment.platform,
        isSip: investment.isSip,
      })
    }

    const bus = this.classifyBus(input.merchant)
    if (bus) {
      subcategory = 'bus'
      attributes = mergeTransactionAttributes(attributes, bus)
    }

    if (input.category === 'apps_and_software' && this.looksLikeSubscription(searchable)) {
      subcategory = 'subscription'
      attributes = mergeTransactionAttributes(attributes, { serviceName: input.merchant })
    }

    if (input.category === 'income_salary' && input.transactionType === 'credited') {
      const incomeType = this.inferIncomeType(searchable)
      if (incomeType) {
        subcategory = incomeType
        attributes = mergeTransactionAttributes(attributes, { incomeType })
      }
    }

    if (input.category === 'credit_card_bills' && input.transactionType === 'debited') {
      attributes = mergeTransactionAttributes(attributes, { isCreditCardBillPayment: true })
    }

    const resolvedSubcategory = this.resolveSubcategory(
      input.category,
      subcategory,
      searchable,
      merchantRawLower,
    )

    return {
      subcategory: resolvedSubcategory,
      transactionAttributes: attributes,
    }
  }

  private resolveSubcategory(
    category: string,
    currentSubcategory: string,
    searchable: string,
    merchantRawLower: string,
  ): string {
    if (currentSubcategory !== category) {
      return currentSubcategory
    }

    const exactMatches = this.subcategoryRules.exact_matches ?? {}
    if (exactMatches[merchantRawLower]) {
      return exactMatches[merchantRawLower]
    }

    for (const pattern of this.subcategoryRules.keyword_patterns ?? []) {
      if (pattern.category !== category) {
        continue
      }
      for (const keyword of pattern.keywords) {
        if (searchable.includes(keyword.toLowerCase())) {
          return pattern.subcategory
        }
      }
    }

    return this.subcategoryRules.category_defaults?.[category] ?? category
  }

  private classifyInvestment(merchantLower: string): {
    subcategory: string
    assetClass: TransactionAttributes['assetClass']
    platform: string
    isSip?: boolean
  } | null {
    if (
      !INVESTMENT_MERCHANT_REGEX.test(merchantLower)
      && !/(zerodha|groww|upstox|kuvera|mutual fund|mmtc|pamp)/i.test(merchantLower)
    ) {
      return null
    }

    if (merchantLower.includes('mutual funds iccl') || merchantLower.includes('mutual fund')) {
      return {
        subcategory: 'mutual_funds',
        assetClass: 'mutual_funds',
        platform: 'ICCL',
        isSip: merchantLower.includes('sip'),
      }
    }
    if (merchantLower.includes('mmtc') || merchantLower.includes('pamp')) {
      return {
        subcategory: 'gold',
        assetClass: 'gold',
        platform: 'MMTC-PAMP',
      }
    }
    if (merchantLower.includes('groww')) {
      return {
        subcategory: 'stocks',
        assetClass: 'stocks',
        platform: 'Groww',
      }
    }
    if (merchantLower.includes('zerodha')) {
      return {
        subcategory: 'stocks',
        assetClass: 'stocks',
        platform: 'Zerodha',
      }
    }
    if (merchantLower.includes('kuvera')) {
      return {
        subcategory: 'mutual_funds',
        assetClass: 'mutual_funds',
        platform: 'Kuvera',
        isSip: true,
      }
    }

    return {
      subcategory: 'stocks',
      assetClass: 'stocks',
      platform: merchantLower,
    }
  }

  private classifyBus(merchant: string): Pick<TransactionAttributes, 'operator' | 'routeId' | 'vehicleType'> | null {
    if (!BUS_MERCHANT_REGEX.test(merchant) && !merchant.toUpperCase().includes('BMTC')) {
      return null
    }

    const routeMatch = /(?:BMTC BUS )?([A-Z]{2}\d{2}[A-Z]{1,2}\d{3,5})/i.exec(merchant)
    return {
      operator: 'BMTC',
      routeId: routeMatch?.[1]?.toUpperCase(),
      vehicleType: 'bus',
    }
  }

  private looksLikeSubscription(searchable: string): boolean {
    return /subscription|premium|saas|chatgpt|notion|github|netflix|spotify|icloud|google one/.test(
      searchable,
    )
  }

  private inferIncomeType(
    searchable: string,
  ): TransactionAttributes['incomeType'] | null {
    if (searchable.includes('bonus') || searchable.includes('incentive')) {
      return 'bonus'
    }
    if (searchable.includes('reimbursement')) {
      return 'reimbursement'
    }
    if (searchable.includes('refund') || searchable.includes('reversal')) {
      return 'refund'
    }
    if (searchable.includes('dividend')) {
      return 'dividend'
    }
    if (searchable.includes('freelance') || searchable.includes('consulting')) {
      return 'freelance'
    }
    return 'salary'
  }

  private loadConfig<T>(fileName: string): T {
    const moduleDir = dirname(fileURLToPath(import.meta.url))
    const candidatePaths = [
      join(moduleDir, 'config', fileName),
      join(process.cwd(), 'src/modules/expenses/infrastructure/categorization/config', fileName),
      join(
        process.cwd(),
        'apps/api/src/modules/expenses/infrastructure/categorization/config',
        fileName,
      ),
    ]

    for (const path of candidatePaths) {
      if (!existsSync(path)) {
        continue
      }
      return JSON.parse(readFileSync(path, 'utf-8')) as T
    }

    throw new Error(
      `Enrichment config not found (${fileName}). Checked: ${candidatePaths.join(', ')}`,
    )
  }
}
