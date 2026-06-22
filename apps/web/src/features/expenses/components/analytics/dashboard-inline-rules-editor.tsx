import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import { previewCategorizationRule } from '@/features/expenses/api/categorization-rules'
import {
  createEmptyRuleGroup,
  RuleBuilderForm,
} from '@/features/expenses/components/rules/rule-builder-form'
import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import type { DashboardInlineRule, RulePreviewResponse } from '@workspace/domain'
import { Badge } from '@workspace/ui/components/ui/badge'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
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

interface DashboardInlineRulesEditorProps {
  inlineRules: DashboardInlineRule[]
  onInlineRulesChange: (rules: DashboardInlineRule[]) => void
  previewDateFrom?: string
  previewDateTo?: string
}

export function DashboardInlineRulesEditor({
  inlineRules,
  onInlineRulesChange,
  previewDateFrom,
  previewDateTo,
}: DashboardInlineRulesEditorProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<DashboardInlineRule | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftConditions, setDraftConditions] = useState(createEmptyRuleGroup())
  const [preview, setPreview] = useState<RulePreviewResponse | null>(null)

  const previewMutation = useMutation({
    mutationFn: () =>
      previewCategorizationRule({
        conditions: draftConditions,
        limit: 10,
        offset: 0,
        dateFrom: previewDateFrom,
        dateTo: previewDateTo,
      }),
    onSuccess: (data) => setPreview(data),
  })

  useEffect(() => {
    setPreview(null)
  }, [draftConditions, previewDateFrom, previewDateTo])

  const openCreate = () => {
    setEditingRule(null)
    setDraftName('')
    setDraftConditions(createEmptyRuleGroup())
    setPreview(null)
    setEditorOpen(true)
  }

  const openEdit = (rule: DashboardInlineRule) => {
    setEditingRule(rule)
    setDraftName(rule.name)
    setDraftConditions(rule.conditions)
    setPreview(null)
    setEditorOpen(true)
  }

  const saveRule = () => {
    const name = draftName.trim()
    if (!name) return

    if (editingRule) {
      onInlineRulesChange(
        inlineRules.map((rule) =>
          rule.id === editingRule.id
            ? { ...rule, name, conditions: draftConditions }
            : rule,
        ),
      )
    } else {
      onInlineRulesChange([
        ...inlineRules,
        {
          id: crypto.randomUUID(),
          name,
          conditions: draftConditions,
        },
      ])
    }

    setEditorOpen(false)
  }

  const deleteRule = (ruleId: string) => {
    onInlineRulesChange(inlineRules.filter((rule) => rule.id !== ruleId))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Dashboard-only rules</CardTitle>
            <CardDescription>
              Define rules here that stay on this dashboard and do not appear on the Rules tab.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus className="mr-1 size-3.5" />
            Add rule
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {inlineRules.length > 0 ? (
          inlineRules.map((rule) => (
            <div
              key={rule.id}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{rule.name}</p>
                  <Badge variant="secondary">Dashboard only</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {rule.conditions.conditions.length} condition
                  {rule.conditions.conditions.length === 1 ? '' : 's'}
                  {(rule.conditions.groups?.length ?? 0) > 0
                    ? ` · ${rule.conditions.groups!.length} nested group(s)`
                    : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(rule)}>
                  <Pencil className="mr-1 size-3.5" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteRule(rule.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No dashboard-only rules yet. Add one to filter transactions without creating a global rule.
          </p>
        )}

        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Edit dashboard rule' : 'New dashboard rule'}
              </DialogTitle>
              <DialogDescription>
                This rule is only used for dashboard analytics. Preview matches
                before saving.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inline-rule-name">Name</Label>
                <Input
                  id="inline-rule-name"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder="Weekend dining"
                />
              </div>
              <RuleBuilderForm
                value={draftConditions}
                onChange={setDraftConditions}
              />
              <div className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Preview matches</p>
                    {previewDateFrom && previewDateTo ? (
                      <p className="text-xs text-muted-foreground">
                        Within dashboard date range
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => previewMutation.mutate()}
                    disabled={previewMutation.isPending}
                  >
                    {previewMutation.isPending ? 'Loading…' : 'Refresh preview'}
                  </Button>
                </div>
                {preview ? (
                  <div className="space-y-2 text-sm">
                    <p>
                      {preview.matchedCount} matches ·{' '}
                      {fmtCurrency(preview.totalAmount)}
                    </p>
                    {preview.transactions.length > 0 ? (
                      preview.transactions.map((txn) => (
                        <div
                          key={txn.id}
                          className="flex justify-between text-xs text-muted-foreground"
                        >
                          <span className="truncate pr-3">{txn.merchant}</span>
                          <span className="shrink-0 tabular-nums">
                            {fmtCurrency(txn.amount)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No sample transactions in this range.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Click refresh to preview historical matches.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={saveRule}
                disabled={!draftName.trim()}
              >
                {editingRule ? 'Save changes' : 'Add rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
