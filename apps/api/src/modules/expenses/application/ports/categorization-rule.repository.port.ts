import type {
  CategorizationRule,
  CreateCategorizationRuleInput,
  RuleAction,
  RuleConditionGroup,
  UpdateCategorizationRuleInput,
} from '@workspace/domain'

export interface CategorizationRuleRepository {
  findAllByUser(userId: string): Promise<CategorizationRule[]>
  findEnabledByUser(userId: string): Promise<CategorizationRule[]>
  findById(params: { userId: string, id: string }): Promise<CategorizationRule | null>
  create(params: {
    userId: string
    input: CreateCategorizationRuleInput
    priority: number
  }): Promise<CategorizationRule>
  update(params: {
    userId: string
    id: string
    input: UpdateCategorizationRuleInput
  }): Promise<CategorizationRule | null>
  delete(params: { userId: string, id: string }): Promise<boolean>
  reorderPriorities(params: {
    userId: string
    orderedIds: string[]
  }): Promise<CategorizationRule[]>
  incrementHitCount(params: {
    userId: string
    id: string
    matchedCount: number
  }): Promise<void>
}

export type { RuleAction, RuleConditionGroup }

export const CATEGORIZATION_RULE_REPOSITORY = Symbol('CATEGORIZATION_RULE_REPOSITORY')
