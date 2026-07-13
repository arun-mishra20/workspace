import { InvestmentPlanInputSchema } from '@workspace/domain'
import { z } from 'zod'

export const CreateInvestmentPlanSchema = InvestmentPlanInputSchema
export type CreateInvestmentPlanInput = z.infer<typeof CreateInvestmentPlanSchema>

export const ReplaceInvestmentPlanSchema = z.object({
  revision: z.number().int().positive(),
  plan: InvestmentPlanInputSchema,
})
export type ReplaceInvestmentPlanInput = z.infer<typeof ReplaceInvestmentPlanSchema>
