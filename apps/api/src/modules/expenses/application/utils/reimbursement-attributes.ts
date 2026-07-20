import type { Transaction, TransactionAttributes, UpdateTransactionInput } from '@workspace/domain'

import {
  clearPaidForSomeoneAttributes,
  clearReimbursementCreditLink,
  mergeTransactionAttributes,
} from '@/modules/expenses/infrastructure/categorization/transaction-attributes.schema'

export function hasReimbursementPatch(data: UpdateTransactionInput): boolean {
  return (
    data.paidForSomeone !== undefined
    || data.reimbursementStatus !== undefined
    || data.linkedReimbursementTxnId !== undefined
    || data.reimbursementNote !== undefined
  )
}

export function stripReimbursementFields(
  data: UpdateTransactionInput,
): Omit<
  UpdateTransactionInput,
  'paidForSomeone' | 'reimbursementStatus' | 'linkedReimbursementTxnId' | 'reimbursementNote'
> {
  const {
    paidForSomeone: _paid,
    reimbursementStatus: _status,
    linkedReimbursementTxnId: _link,
    reimbursementNote: _note,
    ...rest
  } = data
  return rest
}

/**
 * Apply a reimbursement patch onto a debit's attributes (no link-side effects).
 */
export function applyDebitReimbursementAttributes(
  current: TransactionAttributes | undefined,
  patch: Pick<
    UpdateTransactionInput,
    'paidForSomeone' | 'reimbursementStatus' | 'linkedReimbursementTxnId' | 'reimbursementNote'
  >,
): TransactionAttributes | undefined {
  if (patch.paidForSomeone === false) {
    return clearPaidForSomeoneAttributes(current)
  }

  let next = current ? { ...current } : {}

  if (patch.paidForSomeone === true) {
    next.paidForSomeone = true
    next.reimbursementStatus = patch.reimbursementStatus
      ?? next.reimbursementStatus
      ?? 'pending'
  }

  if (patch.reimbursementStatus !== undefined && next.paidForSomeone) {
    next.reimbursementStatus = patch.reimbursementStatus
  }

  if (patch.linkedReimbursementTxnId === null) {
    delete next.linkedReimbursementTxnId
  } else if (typeof patch.linkedReimbursementTxnId === 'string') {
    next.paidForSomeone = true
    next.linkedReimbursementTxnId = patch.linkedReimbursementTxnId
    next.reimbursementStatus = patch.reimbursementStatus ?? 'settled'
  }

  if (patch.reimbursementNote === null) {
    delete next.reimbursementNote
  } else if (typeof patch.reimbursementNote === 'string') {
    next.reimbursementNote = patch.reimbursementNote
  }

  // Enabling any reimbursement field implies paidForSomeone
  if (
    patch.paidForSomeone !== false
    && (
      patch.paidForSomeone === true
      || patch.reimbursementStatus !== undefined
      || typeof patch.linkedReimbursementTxnId === 'string'
      || typeof patch.reimbursementNote === 'string'
    )
  ) {
    next.paidForSomeone = true
    next.reimbursementStatus = next.reimbursementStatus ?? 'pending'
  }

  const parsed = mergeTransactionAttributes(undefined, next)
  return parsed && Object.keys(parsed).length > 0 ? parsed : undefined
}

export function markCreditAsReimbursementLink(
  current: TransactionAttributes | undefined,
  debitId: string,
): TransactionAttributes {
  return mergeTransactionAttributes(current, {
    incomeType: 'reimbursement',
    linkedReimbursementTxnId: debitId,
  })!
}

export function unlinkCreditAttributes(
  current: TransactionAttributes | undefined,
): TransactionAttributes | undefined {
  return clearReimbursementCreditLink(current)
}

export function previousLinkedCreditId(txn: Transaction): string | undefined {
  return txn.transactionAttributes?.linkedReimbursementTxnId
}
