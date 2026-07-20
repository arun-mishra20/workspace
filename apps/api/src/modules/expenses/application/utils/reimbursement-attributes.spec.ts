import { describe, expect, it } from 'vitest'

import {
  applyDebitReimbursementAttributes,
  hasReimbursementPatch,
  markCreditAsReimbursementLink,
  stripReimbursementFields,
  unlinkCreditAttributes,
} from '@/modules/expenses/application/utils/reimbursement-attributes'
import { transactionMatchesSpendExclusion } from '@/modules/expenses/infrastructure/repositories/analytics-range-query'

describe('reimbursement-attributes', () => {
  it('detects reimbursement patches', () => {
    expect(hasReimbursementPatch({ merchant: 'X' })).toBe(false)
    expect(hasReimbursementPatch({ paidForSomeone: true })).toBe(true)
    expect(hasReimbursementPatch({ linkedReimbursementTxnId: null })).toBe(true)
  })

  it('strips reimbursement fields from column updates', () => {
    expect(
      stripReimbursementFields({
        merchant: 'Cafe',
        paidForSomeone: true,
        reimbursementStatus: 'pending',
        linkedReimbursementTxnId: null,
        reimbursementNote: 'note',
      }),
    ).toEqual({ merchant: 'Cafe' })
  })

  it('marks debit as paid for someone with pending status by default', () => {
    expect(applyDebitReimbursementAttributes(undefined, { paidForSomeone: true })).toEqual({
      paidForSomeone: true,
      reimbursementStatus: 'pending',
    })
  })

  it('clears debit annotation when paidForSomeone is false', () => {
    expect(
      applyDebitReimbursementAttributes(
        {
          paidForSomeone: true,
          reimbursementStatus: 'settled',
          linkedReimbursementTxnId: '550e8400-e29b-41d4-a716-446655440000',
          reimbursementNote: 'tax',
          isRecurring: true,
        },
        { paidForSomeone: false },
      ),
    ).toEqual({ isRecurring: true })
  })

  it('links a credit id and marks settled', () => {
    expect(
      applyDebitReimbursementAttributes(
        { paidForSomeone: true, reimbursementStatus: 'pending' },
        { linkedReimbursementTxnId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' },
      ),
    ).toEqual({
      paidForSomeone: true,
      reimbursementStatus: 'settled',
      linkedReimbursementTxnId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    })
  })

  it('marks and clears credit-side reimbursement link', () => {
    const linked = markCreditAsReimbursementLink(
      { platform: 'upi' },
      '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
    )
    expect(linked).toEqual({
      platform: 'upi',
      incomeType: 'reimbursement',
      linkedReimbursementTxnId: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
    })

    expect(unlinkCreditAttributes(linked)).toEqual({ platform: 'upi' })
  })
})

describe('transactionMatchesSpendExclusion paid_for_someone', () => {
  it('matches annotated debits only', () => {
    const rules = [{ category: 'paid_for_someone' }]

    expect(
      transactionMatchesSpendExclusion(
        {
          transactionType: 'debited',
          category: 'food',
          subcategory: 'dining',
          transactionAttributes: { paidForSomeone: true },
        },
        rules,
      ),
    ).toBe(true)

    expect(
      transactionMatchesSpendExclusion(
        {
          transactionType: 'debited',
          category: 'friends',
          subcategory: 'uncategorized',
          transactionAttributes: {},
        },
        rules,
      ),
    ).toBe(false)

    expect(
      transactionMatchesSpendExclusion(
        {
          transactionType: 'credited',
          category: 'income_salary',
          subcategory: 'reimbursement',
          transactionAttributes: { paidForSomeone: true },
        },
        rules,
      ),
    ).toBe(false)
  })
})
