import { describe, expect, it } from 'vitest'

import { TransactionEnricher } from '@/modules/expenses/infrastructure/categorization/transaction-enricher'

describe('TransactionEnricher credit card bill payments', () => {
  const enricher = TransactionEnricher.getInstance()

  it('marks credit_card_bills debits with isCreditCardBillPayment', () => {
    const result = enricher.enrich({
      merchant: 'HDFC Credit Card Payment',
      merchantRaw: 'HDFC Credit Card Payment',
      category: 'credit_card_bills',
      subcategory: 'credit_card_bills',
      amount: 1000,
      transactionType: 'debited',
    })

    expect(result.transactionAttributes?.isCreditCardBillPayment).toBe(true)
  })
})
