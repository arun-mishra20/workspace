import type {
  RuleCondition,
  RuleConditionGroup,
} from '@workspace/domain'

export interface RuleEvaluationInput {
  id?: string
  merchant?: string
  merchantRaw?: string
  vpa?: string | null
  amount?: number
  transactionType?: string
  transactionMode?: string
  cardLast4?: string | null
  transactionDate?: string | Date
}

export function evaluateRuleConditionGroup(
  group: RuleConditionGroup,
  input: RuleEvaluationInput,
): boolean {
  const conditionResults = group.conditions.map((condition) =>
    evaluateRuleCondition(condition, input),
  )

  const groupResults = (group.groups ?? []).map((nested) =>
    evaluateRuleConditionGroup(nested, input),
  )

  const allResults = [...conditionResults, ...groupResults]

  if (allResults.length === 0) {
    return false
  }

  return group.logic === 'AND'
    ? allResults.every(Boolean)
    : allResults.some(Boolean)
}

export function evaluateRuleCondition(
  condition: RuleCondition,
  input: RuleEvaluationInput,
): boolean {
  switch (condition.field) {
    case 'amount': {
      const amount = input.amount ?? 0
      switch (condition.op) {
        case 'eq': {
          return amount === condition.value
        }
        case 'gte': {
          return amount >= condition.value
        }
        case 'lte': {
          return amount <= condition.value
        }
        case 'between': {
          return (
            amount >= condition.value
            && amount <= (condition.valueTo ?? condition.value)
          )
        }
        default: {
          return false
        }
      }
    }
    case 'transaction_type': {
      return input.transactionType === condition.value
    }
    case 'merchant': {
      return matchString(input.merchant ?? '', condition.op, condition.value)
    }
    case 'merchant_raw': {
      return matchString(input.merchantRaw ?? '', condition.op, condition.value)
    }
    case 'vpa': {
      return matchString(input.vpa ?? '', condition.op, condition.value)
    }
    case 'transaction_mode': {
      return input.transactionMode === condition.value
    }
    case 'card_last4': {
      return (input.cardLast4 ?? '') === condition.value
    }
    case 'day_of_month': {
      const day = getDayOfMonth(input.transactionDate)
      if (day === null) return false
      if (condition.op === 'eq') return day === condition.value
      return day >= condition.value && day <= (condition.valueTo ?? condition.value)
    }
    default: {
      return false
    }
  }
}

function matchString(
  haystack: string,
  op: 'eq' | 'contains' | 'regex',
  needle: string,
): boolean {
  const normalizedHaystack = haystack.toLowerCase()
  const normalizedNeedle = needle.toLowerCase()

  switch (op) {
    case 'eq': {
      return normalizedHaystack === normalizedNeedle
    }
    case 'contains': {
      return normalizedHaystack.includes(normalizedNeedle)
    }
    case 'regex': {
      try {
        return new RegExp(needle, 'i').test(haystack)
      } catch {
        return false
      }
    }
    default: {
      return false
    }
  }
}

function getDayOfMonth(value?: string | Date): number | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.getUTCDate()
}

export function buildConditionsFromTemplate(
  template: 'exact_merchant' | 'keyword' | 'vpa_amount' | 'amount_type',
  params: Record<string, string | number>,
): RuleConditionGroup {
  switch (template) {
    case 'exact_merchant': {
      return {
        logic: 'AND',
        conditions: [
          {
            field: 'merchant',
            op: 'eq',
            value: String(params.merchant),
          },
        ],
      }
    }
    case 'keyword': {
      return {
        logic: 'AND',
        conditions: [
          {
            field: 'merchant_raw',
            op: 'contains',
            value: String(params.keyword),
          },
        ],
      }
    }
    case 'vpa_amount': {
      return {
        logic: 'AND',
        conditions: [
          {
            field: 'vpa',
            op: 'eq',
            value: String(params.vpa),
          },
          {
            field: 'amount',
            op: 'between',
            value: Number(params.minAmount),
            valueTo: Number(params.maxAmount),
          },
        ],
      }
    }
    case 'amount_type': {
      return {
        logic: 'AND',
        conditions: [
          {
            field: 'transaction_type',
            op: 'eq',
            value: params.transactionType as 'debited' | 'credited',
          },
          {
            field: 'amount',
            op: 'eq',
            value: Number(params.amount),
          },
        ],
      }
    }
    default: {
      return { logic: 'AND', conditions: [] }
    }
  }
}
