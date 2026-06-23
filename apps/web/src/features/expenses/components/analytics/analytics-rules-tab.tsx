import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { GripVertical, LayoutDashboard, Plus, Sparkles, Trash2 } from 'lucide-react'

import { Link } from 'react-router-dom'
import { appPaths } from '@/config/app-paths'

import {
  applyCategorizationRule,
  createCategorizationRule,
  deleteCategorizationRule,
  fetchCategoryOptions,
  fetchCategorizationRule,
  fetchCategorizationRules,
  fetchSuggestedRules,
  previewCategorizationRule,
  reorderCategorizationRules,
  reapplyAllCategorizationRules,
  updateCategorizationRule,
} from '@/features/expenses/api/categorization-rules'
import { getSubcategoryOptionsForCategory } from '@/features/expenses/constants/category-options'
import {
  createEmptyRuleGroup,
  createRuleGroupFromTransaction,
  RuleBuilderForm,
} from '@/features/expenses/components/rules/rule-builder-form'
import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import { TransactionCategoryTile } from '@/features/expenses/components/transaction-category-tile'
import {
  buildDashboardDeepLink,
} from '@/features/expenses/components/analytics/analytics-dashboards-tab'
import { defaultDashboardDateRange } from '@/features/expenses/components/analytics/analytics-dashboards-tab'
import type {
  CategoryOption,
  CreateCategorizationRuleInput,
  RuleAction,
  RuleConditionGroup,
  RulePreviewResponse,
  SuggestedRule,
  Transaction,
} from '@workspace/domain'
import { Badge } from '@workspace/ui/components/ui/badge'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import { Checkbox } from '@workspace/ui/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/ui/dialog'
import { Input } from '@workspace/ui/components/ui/input'
import { Label } from '@workspace/ui/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/ui/select'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'
import { Switch } from '@workspace/ui/components/ui/switch'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/ui/tabs'
type RuleTemplate =
  | 'exact_merchant'
  | 'keyword'
  | 'vpa_amount'
  | 'amount_type'
  | 'custom'

export interface RuleEditorSeed {
  name?: string
  conditions?: RuleConditionGroup
  action?: Partial<RuleAction>
  template?: RuleTemplate
  merchant?: string
}

interface AnalyticsRulesTabProps {
  seed?: RuleEditorSeed | null
  onSeedConsumed?: () => void
}

export function AnalyticsRulesTab({
  seed,
  onSeedConsumed,
}: AnalyticsRulesTabProps) {
  const queryClient = useQueryClient()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [initialSeed, setInitialSeed] = useState<RuleEditorSeed | null>(null)

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingRuleId(null)
    setInitialSeed(null)
  }

  const openCreate = (nextSeed?: RuleEditorSeed) => {
    setEditingRuleId(null)
    setInitialSeed(nextSeed ?? null)
    setEditorOpen(true)
    onSeedConsumed?.()
  }

  const openEdit = (ruleId: string) => {
    setEditingRuleId(ruleId)
    setInitialSeed(null)
    setEditorOpen(true)
  }

  const rulesQ = useQuery({
    queryKey: ['expenses', 'rules'],
    queryFn: fetchCategorizationRules,
  })

  const categoriesQ = useQuery({
    queryKey: ['expenses', 'categories'],
    queryFn: fetchCategoryOptions,
  })

  const suggestedQ = useQuery({
    queryKey: ['expenses', 'rules', 'suggested'],
    queryFn: fetchSuggestedRules,
  })

  useEffect(() => {
    if (seed) {
      openCreate(seed)
    }
  }, [seed])

  const toggleRule = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      updateCategorizationRule(id, { enabled }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses', 'rules'] })
    },
  })

  const deleteRule = useMutation({
    mutationFn: deleteCategorizationRule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses', 'rules'] })
    },
  })

  const reorder = useMutation({
    mutationFn: reorderCategorizationRules,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses', 'rules'] })
    },
  })

  const reapplyAll = useMutation({
    mutationFn: () => reapplyAllCategorizationRules(false),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })

  const moveRule = (id: string, direction: -1 | 1) => {
    const rules = rulesQ.data ?? []
    const index = rules.findIndex((rule) => rule.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= rules.length) return
    const orderedIds = rules.map((rule) => rule.id)
    ;[orderedIds[index], orderedIds[target]] = [
      orderedIds[target]!,
      orderedIds[index]!,
    ]
    reorder.mutate(orderedIds)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Categorization rules</h2>
          <p className="text-sm text-muted-foreground">
            Build rules that auto-classify transactions during sync and on
            apply.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => reapplyAll.mutate()}
            disabled={reapplyAll.isPending}
          >
            Reapply all
          </Button>
          <Button onClick={() => openCreate()}>
            <Plus className="mr-1.5 size-4" />
            New rule
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active rules</CardTitle>
          <CardDescription>
            Lower priority number = higher precedence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rulesQ.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (rulesQ.data?.length ?? 0) > 0 ? (
            rulesQ.data!.map((rule, index) => (
              <div
                key={rule.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <GripVertical className="size-4 text-muted-foreground" />
                    <TransactionCategoryTile
                      category={rule.action.category}
                      size="sm"
                    />
                    <p className="font-medium">{rule.name}</p>
                    <Badge variant="outline">P{rule.priority}</Badge>
                    {!rule.enabled ? (
                      <Badge variant="secondary">Disabled</Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    → {rule.action.category} / {rule.action.subcategory} ·{' '}
                    {rule.hitCount} hits
                    {rule.lastMatchedAt
                      ? ` · last ${format(parseISO(rule.lastMatchedAt), 'dd MMM yyyy')}`
                      : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(enabled) =>
                      toggleRule.mutate({ id: rule.id, enabled })
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => moveRule(rule.id, -1)}
                  >
                    Up
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={index === (rulesQ.data?.length ?? 0) - 1}
                    onClick={() => moveRule(rule.id, 1)}
                  >
                    Down
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <Link
                      to={`${appPaths.auth.analytics.getHref()}${buildDashboardDeepLink({
                        ruleIds: [rule.id],
                        from: defaultDashboardDateRange().startDate,
                        to: defaultDashboardDateRange().endDate,
                      })}`}
                    >
                      <LayoutDashboard className="mr-1 size-3.5" />
                      View dashboard
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(rule.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRule.mutate(rule.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No rules yet. Create one from a template or the visual builder.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Suggested rules</CardTitle>
              <CardDescription>
                Recurring same-amount debits detected automatically
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestedQ.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (suggestedQ.data?.length ?? 0) > 0 ? (
            suggestedQ.data!.map((suggestion) => (
              <SuggestedRuleRow
                key={suggestion.name}
                suggestion={suggestion}
                onUse={() =>
                  openCreate({
                    name: suggestion.name,
                    conditions: suggestion.conditions,
                    action: suggestion.action,
                    template: 'custom',
                  })
                }
              />
            ))
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No suggestions right now.
            </p>
          )}
        </CardContent>
      </Card>

      <RuleEditorDialog
        key={editingRuleId ?? 'create'}
        open={editorOpen}
        onOpenChange={(next) => {
          if (next) {
            setEditorOpen(true)
            return
          }
          closeEditor()
        }}
        ruleId={editingRuleId}
        seed={initialSeed}
        categories={categoriesQ.data ?? []}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ['expenses'] })
          closeEditor()
        }}
      />
    </div>
  )
}

function SuggestedRuleRow({
  suggestion,
  onUse,
}: {
  suggestion: SuggestedRule
  onUse: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex min-w-0 items-start gap-3">
        <TransactionCategoryTile
          category={suggestion.action.category}
          size="sm"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium">{suggestion.name}</p>
          <p className="text-xs text-muted-foreground">
            {suggestion.matchCount} matches ·{' '}
            {fmtCurrency(suggestion.totalAmount)}
            {suggestion.sampleMerchant
              ? ` · e.g. ${suggestion.sampleMerchant}`
              : ''}
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onUse}>
        Use suggestion
      </Button>
    </div>
  )
}

function RuleEditorDialog({
  open,
  onOpenChange,
  ruleId,
  seed,
  categories,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ruleId: string | null
  seed: RuleEditorSeed | null
  categories: CategoryOption[]
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [template, setTemplate] = useState<RuleTemplate>('custom')
  const [conditions, setConditions] = useState<RuleConditionGroup>(
    createEmptyRuleGroup(),
  )
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [requiresReview, setRequiresReview] = useState(false)
  const [applyOnSave, setApplyOnSave] = useState(true)
  const [preview, setPreview] = useState<RulePreviewResponse | null>(null)

  const [templateMerchant, setTemplateMerchant] = useState('')
  const [templateKeyword, setTemplateKeyword] = useState('')
  const [templateVpa, setTemplateVpa] = useState('')
  const [templateMinAmount, setTemplateMinAmount] = useState('')
  const [templateMaxAmount, setTemplateMaxAmount] = useState('')
  const [templateAmount, setTemplateAmount] = useState('')
  const [templateTxnType, setTemplateTxnType] = useState<
    'debited' | 'credited'
  >('debited')

  const ruleQ = useQuery({
    queryKey: ['expenses', 'rules', ruleId],
    queryFn: () => fetchCategorizationRule(ruleId!),
    enabled: open && ruleId != null,
    refetchOnMount: 'always',
  })

  const resetTemplateFields = () => {
    setTemplateMerchant('')
    setTemplateKeyword('')
    setTemplateVpa('')
    setTemplateMinAmount('')
    setTemplateMaxAmount('')
    setTemplateAmount('')
    setTemplateTxnType('debited')
  }

  const loadRuleIntoForm = (rule: {
    name: string
    conditions: RuleConditionGroup
    action: RuleAction
  }) => {
    resetTemplateFields()
    setName(rule.name)
    setTemplate('custom')
    setConditions(rule.conditions)
    setCategory(rule.action.category)
    setSubcategory(rule.action.subcategory)
    setRequiresReview(rule.action.requiresReview ?? false)
    setApplyOnSave(true)
    setPreview(null)
  }

  const loadSeedIntoForm = (nextSeed: RuleEditorSeed | null) => {
    resetTemplateFields()
    setApplyOnSave(true)
    setPreview(null)

    if (!nextSeed) {
      setName('')
      setTemplate('custom')
      setConditions(createEmptyRuleGroup())
      setCategory('')
      setSubcategory('')
      setRequiresReview(false)
      return
    }

    const nextCategory = nextSeed.action?.category ?? ''
    const nextSubcategory = nextSeed.action?.subcategory ?? ''
    const defaultSubcategory =
      nextCategory && !nextSubcategory
        ? (getSubcategoryOptionsForCategory(nextCategory)[0]?.value ?? '')
        : nextSubcategory

    setName(nextSeed.name ?? '')
    setTemplate(nextSeed.template ?? 'custom')
    setConditions(nextSeed.conditions ?? createEmptyRuleGroup())
    setCategory(nextCategory)
    setSubcategory(defaultSubcategory)
    setRequiresReview(nextSeed.action?.requiresReview ?? false)
    setTemplateMerchant(nextSeed.merchant ?? '')
  }

  useEffect(() => {
    if (!open || ruleId) return
    loadSeedIntoForm(seed)
  }, [open, ruleId, seed])

  useEffect(() => {
    if (!open || !ruleId || !ruleQ.data) return
    loadRuleIntoForm(ruleQ.data)
  }, [open, ruleId, ruleQ.data])

  const subcategoryOptions = useMemo(() => {
    if (!category) return []
    const fromApi =
      categories.find((c) => c.value === category)?.subcategories ?? []
    return fromApi.length > 0
      ? fromApi
      : getSubcategoryOptionsForCategory(category)
  }, [categories, category])

  const handleCategoryChange = (value: string) => {
    setCategory(value)
    const fromApi =
      categories.find((c) => c.value === value)?.subcategories ?? []
    const options =
      fromApi.length > 0
        ? fromApi
        : getSubcategoryOptionsForCategory(value)
    setSubcategory(options[0]?.value ?? '')
  }

  const buildConditions = (): RuleConditionGroup => {
    if (template === 'custom') return conditions
    if (template === 'exact_merchant') {
      return {
        logic: 'AND',
        conditions: [{ field: 'merchant', op: 'eq', value: templateMerchant }],
      }
    }
    if (template === 'keyword') {
      return {
        logic: 'AND',
        conditions: [
          { field: 'merchant_raw', op: 'contains', value: templateKeyword },
        ],
      }
    }
    if (template === 'vpa_amount') {
      return {
        logic: 'AND',
        conditions: [
          { field: 'vpa', op: 'eq', value: templateVpa },
          {
            field: 'amount',
            op: 'between',
            value: Number(templateMinAmount),
            valueTo: Number(templateMaxAmount),
          },
        ],
      }
    }
    return {
      logic: 'AND',
      conditions: [
        { field: 'transaction_type', op: 'eq', value: templateTxnType },
        { field: 'amount', op: 'eq', value: Number(templateAmount) },
      ],
    }
  }

  const previewMutation = useMutation({
    mutationFn: () =>
      previewCategorizationRule({
        conditions: buildConditions(),
        limit: 10,
        offset: 0,
      }),
    onSuccess: (data) => setPreview(data),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input: CreateCategorizationRuleInput = {
        name,
        enabled: true,
        conditions: buildConditions(),
        action: { category, subcategory: subcategory.trim(), requiresReview },
      }

      const saved = ruleId
        ? await updateCategorizationRule(ruleId, input)
        : await createCategorizationRule(input)

      if (applyOnSave) {
        await applyCategorizationRule(saved.id, { force: false })
      }

      return saved
    },
    onSuccess: onSaved,
  })

  const isLoadingRule = ruleId != null && ruleQ.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ruleId ? 'Edit rule' : 'Create rule'}</DialogTitle>
          <DialogDescription>
            Define conditions and the category to apply. Preview matches before
            saving.
          </DialogDescription>
        </DialogHeader>

        {isLoadingRule ? (
          <Skeleton className="h-64 w-full" />
        ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rule-name">Rule name</Label>
            <Input
              id="rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Monthly rent"
            />
          </div>

          <Tabs
            value={template}
            onValueChange={(v) => setTemplate(v as RuleTemplate)}
          >
            <TabsList className="flex h-auto flex-wrap">
              <TabsTrigger value="amount_type">Amount + type</TabsTrigger>
              <TabsTrigger value="exact_merchant">Exact merchant</TabsTrigger>
              <TabsTrigger value="keyword">Keyword</TabsTrigger>
              <TabsTrigger value="vpa_amount">VPA + amount</TabsTrigger>
              <TabsTrigger value="custom">Custom builder</TabsTrigger>
            </TabsList>

            <TabsContent value="amount_type" className="space-y-3 pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Transaction type</Label>
                  <Select
                    value={templateTxnType}
                    onValueChange={(v: 'debited' | 'credited') =>
                      setTemplateTxnType(v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debited">Debited</SelectItem>
                      <SelectItem value="credited">Credited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    value={templateAmount}
                    onChange={(e) => setTemplateAmount(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="exact_merchant" className="space-y-2 pt-4">
              <Label>Merchant</Label>
              <Input
                value={templateMerchant}
                onChange={(e) => setTemplateMerchant(e.target.value)}
              />
            </TabsContent>

            <TabsContent value="keyword" className="space-y-2 pt-4">
              <Label>Keyword in raw payee</Label>
              <Input
                value={templateKeyword}
                onChange={(e) => setTemplateKeyword(e.target.value)}
              />
            </TabsContent>

            <TabsContent value="vpa_amount" className="space-y-3 pt-4">
              <div className="space-y-2">
                <Label>VPA</Label>
                <Input
                  value={templateVpa}
                  onChange={(e) => setTemplateVpa(e.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Min amount</Label>
                  <Input
                    type="number"
                    value={templateMinAmount}
                    onChange={(e) => setTemplateMinAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max amount</Label>
                  <Input
                    type="number"
                    value={templateMaxAmount}
                    onChange={(e) => setTemplateMaxAmount(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="pt-4">
              <RuleBuilderForm
                value={conditions}
                onChange={setConditions}
              />
            </TabsContent>
          </Tabs>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-subcategory">Subcategory</Label>
              <Input
                id="rule-subcategory"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="Type or pick a suggestion"
              />
              {subcategoryOptions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {subcategoryOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={
                        subcategory === option.value ? 'secondary' : 'outline'
                      }
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSubcategory(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="requires-review"
              checked={requiresReview}
              onCheckedChange={(checked) => setRequiresReview(checked === true)}
            />
            <Label htmlFor="requires-review">Mark matches for review</Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="apply-on-save"
              checked={applyOnSave}
              onCheckedChange={(checked) => setApplyOnSave(checked === true)}
            />
            <Label htmlFor="apply-on-save">
              Apply to matching past transactions on save
            </Label>
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Preview matches</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => previewMutation.mutate()}
                disabled={previewMutation.isPending}
              >
                Refresh preview
              </Button>
            </div>
            {preview ? (
              <div className="space-y-2 text-sm">
                <p>
                  {preview.matchedCount} matches ·{' '}
                  {fmtCurrency(preview.totalAmount)}
                </p>
                {preview.transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <TransactionCategoryTile
                        category={txn.category}
                        size="sm"
                      />
                      <span className="truncate">{txn.merchant}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {fmtCurrency(txn.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Click refresh to preview historical matches.
              </p>
            )}
          </div>
        </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={
              isLoadingRule ||
              !name ||
              !category ||
              !subcategory.trim() ||
              saveMutation.isPending
            }
          >
            {saveMutation.isPending
              ? 'Saving…'
              : ruleId
                ? 'Update rule'
                : 'Create rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function buildRuleSeedFromTransaction(
  transaction: Transaction,
  action?: Partial<RuleAction>,
): RuleEditorSeed {
  return {
    name: `Rule for ${transaction.merchant}`,
    conditions: createRuleGroupFromTransaction(transaction),
    action: {
      category: action?.category ?? transaction.category,
      subcategory: action?.subcategory ?? transaction.subcategory,
      requiresReview: action?.requiresReview,
    },
    template: 'custom',
  }
}

export function buildRuleSeedFromMerchant(merchant: string): RuleEditorSeed {
  return {
    name: `Rule for ${merchant}`,
    merchant,
    template: 'exact_merchant',
    conditions: {
      logic: 'AND',
      conditions: [{ field: 'merchant', op: 'eq', value: merchant }],
    },
  }
}
