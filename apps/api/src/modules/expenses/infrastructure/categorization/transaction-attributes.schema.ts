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
