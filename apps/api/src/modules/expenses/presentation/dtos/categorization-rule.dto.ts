
import { z } from 'zod'


export const ReorderRulesRequestSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
})



export {CreateCategorizationRuleInputSchema, RuleApplyRequestSchema, RulePreviewRequestSchema, UpdateCategorizationRuleInputSchema} from '@workspace/domain'