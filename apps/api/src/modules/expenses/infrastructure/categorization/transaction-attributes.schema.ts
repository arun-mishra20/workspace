import { z } from 'zod'

export const InvestmentAssetClassSchema = z.enum([
  'stocks',
  'mutual_funds',
  'gold',
  'sip',
  'fd_rd',
])

export const TransactionAttributesSchema = z
  .object({
    assetClass: InvestmentAssetClassSchema.optional(),
    platform: z.string().optional(),
    isSip: z.boolean().optional(),
    operator: z.string().optional(),
    routeId: z.string().optional(),
    vehicleType: z.string().optional(),
    isRecurring: z.boolean().optional(),
    billingCycle: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).optional(),
    serviceName: z.string().optional(),
    counterpartyType: z.enum(['person', 'business', 'government']).optional(),
    incomeType: z.enum(['salary', 'bonus', 'freelance', 'refund', 'dividend', 'reimbursement']).optional(),
    isCreditCardBillPayment: z.boolean().optional(),
    llmReasoning: z.string().optional(),
    paidForSomeone: z.boolean().optional(),
    reimbursementStatus: z.enum(['pending', 'settled']).optional(),
    linkedReimbursementTxnId: z.string().uuid().optional(),
    reimbursementNote: z.string().max(280).optional(),
  })
  .partial()

export type TransactionAttributes = z.infer<typeof TransactionAttributesSchema>

export function mergeTransactionAttributes(
  base: TransactionAttributes | undefined,
  patch: TransactionAttributes | undefined,
): TransactionAttributes | undefined {
  if (!base && !patch) {
    return undefined
  }
  return TransactionAttributesSchema.parse({ ...base, ...patch })
}

/** Strip paid-for-someone annotation keys from attributes. */
export function clearPaidForSomeoneAttributes(
  attrs: TransactionAttributes | undefined,
): TransactionAttributes | undefined {
  if (!attrs) {
    return undefined
  }

  const {
    paidForSomeone: _paid,
    reimbursementStatus: _status,
    linkedReimbursementTxnId: _link,
    reimbursementNote: _note,
    ...rest
  } = attrs

  return Object.keys(rest).length > 0 ? rest : undefined
}

/** Strip credit-side reimbursement link markers (keeps other attrs). */
export function clearReimbursementCreditLink(
  attrs: TransactionAttributes | undefined,
): TransactionAttributes | undefined {
  if (!attrs) {
    return undefined
  }

  const next: TransactionAttributes = { ...attrs }
  delete next.linkedReimbursementTxnId
  if (next.incomeType === 'reimbursement') {
    delete next.incomeType
  }

  return Object.keys(next).length > 0 ? next : undefined
}
