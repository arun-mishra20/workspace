import { describe, expect, it } from 'vitest'

import { TransactionEnricher } from '@/modules/expenses/infrastructure/categorization/transaction-enricher'

describe('transactionEnricher', () => {
  const enricher = TransactionEnricher.getInstance()

  it('classifies Groww investments with platform and asset class', () => {
    const result = enricher.enrich({
      merchant: 'Groww Invest Tech',
      merchantRaw: 'groww invest tech',
      category: 'investments',
      subcategory: 'investments',
      amount: 5000,
      transactionType: 'debited',
    })

    expect(result.subcategory).toBe('stocks')
    expect(result.transactionAttributes).toMatchObject({
      assetClass: 'stocks',
      platform: 'Groww',
    })
  })

  it('classifies BMTC bus routes with operator metadata', () => {
    const result = enricher.enrich({
      merchant: 'BMTC BUS KA57F2391',
      merchantRaw: 'BMTC BUS KA57F2391',
      category: 'transport',
      subcategory: 'transport',
      amount: 30,
      transactionType: 'debited',
    })

    expect(result.subcategory).toBe('bus')
    expect(result.transactionAttributes).toMatchObject({
      operator: 'BMTC',
      routeId: 'KA57F2391',
      vehicleType: 'bus',
    })
  })

  it('infers subscription subcategory for software merchants', () => {
    const result = enricher.enrich({
      merchant: 'OpenAI ChatGPT',
      merchantRaw: 'openai chatgpt subscription',
      category: 'apps_and_software',
      subcategory: 'apps_and_software',
      amount: 1999,
      transactionType: 'debited',
    })

    expect(result.subcategory).toBe('subscription')
    expect(result.transactionAttributes?.serviceName).toBe('OpenAI ChatGPT')
  })
})
