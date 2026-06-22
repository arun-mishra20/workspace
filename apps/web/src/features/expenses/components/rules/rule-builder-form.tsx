import { useMemo } from 'react'
import type {
  RuleCondition,
  RuleConditionGroup,
} from '@workspace/domain'
import { Button } from '@workspace/ui/components/ui/button'
import { Input } from '@workspace/ui/components/ui/input'
import { Label } from '@workspace/ui/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/ui/select'

const FIELD_OPTIONS = [
  { value: 'amount', label: 'Amount' },
  { value: 'transaction_type', label: 'Transaction type' },
  { value: 'merchant', label: 'Merchant' },
  { value: 'merchant_raw', label: 'Merchant (raw)' },
  { value: 'vpa', label: 'VPA' },
  { value: 'transaction_mode', label: 'Payment mode' },
  { value: 'card_last4', label: 'Card last 4' },
  { value: 'day_of_month', label: 'Day of month' },
] as const

interface RuleBuilderFormProps {
  value: RuleConditionGroup
  onChange: (value: RuleConditionGroup) => void
}

export function RuleBuilderForm({ value, onChange }: RuleBuilderFormProps) {
  const updateCondition = (index: number, patch: Partial<RuleCondition>) => {
    const nextConditions = value.conditions.map((condition, i) =>
      i === index ? ({ ...condition, ...patch } as RuleCondition) : condition,
    )
    onChange({ ...value, conditions: nextConditions })
  }

  const addCondition = () => {
    onChange({
      ...value,
      conditions: [
        ...value.conditions,
        { field: 'merchant', op: 'contains', value: '' },
      ],
    })
  }

  const removeCondition = (index: number) => {
    onChange({
      ...value,
      conditions: value.conditions.filter((_, i) => i !== index),
    })
  }

  const addNestedGroup = () => {
    onChange({
      ...value,
      groups: [
        ...(value.groups ?? []),
        { logic: 'AND', conditions: [{ field: 'merchant', op: 'contains', value: '' }] },
      ],
    })
  }

  const updateNestedGroup = (index: number, group: RuleConditionGroup) => {
    const groups = [...(value.groups ?? [])]
    groups[index] = group
    onChange({ ...value, groups })
  }

  const removeNestedGroup = (index: number) => {
    onChange({
      ...value,
      groups: (value.groups ?? []).filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label>Match logic</Label>
        <Select
          value={value.logic}
          onValueChange={(logic: 'AND' | 'OR') => onChange({ ...value, logic })}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">AND</SelectItem>
            <SelectItem value="OR">OR</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {value.conditions.map((condition, index) => (
          <ConditionRow
            key={index}
            condition={condition}
            onChange={(patch) => updateCondition(index, patch)}
            onRemove={() => removeCondition(index)}
          />
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addCondition}>
        Add condition
      </Button>

      {(value.groups ?? []).map((group, index) => (
        <div key={index} className="rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Nested group {index + 1}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeNestedGroup(index)}
            >
              Remove group
            </Button>
          </div>
          <RuleBuilderForm
            value={group}
            onChange={(next) => updateNestedGroup(index, next)}
          />
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addNestedGroup}>
        Add nested group
      </Button>
    </div>
  )
}

function ConditionRow({
  condition,
  onChange,
  onRemove,
}: {
  condition: RuleCondition
  onChange: (patch: Partial<RuleCondition>) => void
  onRemove: () => void
}) {
  const operators = useMemo(() => getOperatorsForField(condition.field), [condition.field])

  return (
    <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <Select
        value={condition.field}
        onValueChange={(field) =>
          onChange({ field: field as RuleCondition['field'] })
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FIELD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={condition.op}
        onValueChange={(op) => onChange({ op: op as RuleCondition['op'] })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op} value={op}>
              {op}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ConditionValueInputs condition={condition} onChange={onChange} />

      <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
        Remove
      </Button>
    </div>
  )
}

function ConditionValueInputs({
  condition,
  onChange,
}: {
  condition: RuleCondition
  onChange: (patch: Partial<RuleCondition>) => void
}) {
  if (condition.field === 'amount' || condition.field === 'day_of_month') {
    return (
      <div className="flex gap-2">
        <Input
          type="number"
          value={condition.value}
          onChange={(e) => onChange({ value: Number(e.target.value) })}
        />
        {condition.op === 'between' ? (
          <Input
            type="number"
            value={condition.valueTo ?? ''}
            placeholder="To"
            onChange={(e) => onChange({ valueTo: Number(e.target.value) })}
          />
        ) : null}
      </div>
    )
  }

  if (condition.field === 'transaction_type') {
    return (
      <Select
        value={condition.value}
        onValueChange={(value: 'debited' | 'credited') => onChange({ value })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="debited">Debited</SelectItem>
          <SelectItem value="credited">Credited</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  return (
    <Input
      value={condition.value}
      onChange={(e) => onChange({ value: e.target.value })}
      placeholder="Value"
    />
  )
}

function getOperatorsForField(field: RuleCondition['field']) {
  switch (field) {
    case 'amount':
    case 'day_of_month':
      return ['eq', 'between', 'gte', 'lte']
    case 'transaction_type':
    case 'transaction_mode':
    case 'card_last4':
      return ['eq']
    default:
      return ['eq', 'contains', 'regex']
  }
}

export function createEmptyRuleGroup(): RuleConditionGroup {
  return {
    logic: 'AND',
    conditions: [{ field: 'merchant', op: 'contains', value: '' }],
  }
}

export function createRuleGroupFromTransaction(transaction: {
  merchant?: string
  merchantRaw?: string
  amount?: number
  transactionType?: string
  vpa?: string | null
  cardLast4?: string | null
  transactionMode?: string
}): RuleConditionGroup {
  const conditions: RuleCondition[] = []

  if (transaction.merchant) {
    conditions.push({ field: 'merchant', op: 'eq', value: transaction.merchant })
  }
  if (transaction.amount !== undefined) {
    conditions.push({ field: 'amount', op: 'eq', value: transaction.amount })
  }
  if (transaction.transactionType) {
    conditions.push({
      field: 'transaction_type',
      op: 'eq',
      value: transaction.transactionType as 'debited' | 'credited',
    })
  }
  if (transaction.vpa) {
    conditions.push({ field: 'vpa', op: 'eq', value: transaction.vpa })
  }

  return {
    logic: 'AND',
    conditions: conditions.length > 0 ? conditions : createEmptyRuleGroup().conditions,
  }
}
