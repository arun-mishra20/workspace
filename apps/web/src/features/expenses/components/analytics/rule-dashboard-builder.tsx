import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LayoutDashboard, Save } from 'lucide-react'

import {
  createRuleDashboard,
  updateRuleDashboard,
} from '@/features/expenses/api/rule-dashboards'
import { DashboardInlineRulesEditor } from '@/features/expenses/components/analytics/dashboard-inline-rules-editor'
import { TransactionCategoryTile } from '@/features/expenses/components/transaction-category-tile'
import type { CategorizationRule, DashboardInlineRule } from '@workspace/domain'
import { Alert, AlertDescription } from '@workspace/ui/components/ui/alert'
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
import { Skeleton } from '@workspace/ui/components/ui/skeleton'

interface RuleDashboardBuilderProps {
  rules: CategorizationRule[]
  rulesLoading: boolean
  selectedRuleIds: string[]
  onSelectedRuleIdsChange: (ruleIds: string[]) => void
  inlineRules: DashboardInlineRule[]
  onInlineRulesChange: (rules: DashboardInlineRule[]) => void
  onViewDashboard: () => void
  editingDashboardId?: string | null
  editingDashboardName?: string | null
  onCancelEdit?: () => void
  previewDateFrom?: string
  previewDateTo?: string
}

export function RuleDashboardBuilder({
  rules,
  rulesLoading,
  selectedRuleIds,
  onSelectedRuleIdsChange,
  inlineRules,
  onInlineRulesChange,
  onViewDashboard,
  editingDashboardId,
  editingDashboardName,
  onCancelEdit,
  previewDateFrom,
  previewDateTo,
}: RuleDashboardBuilderProps) {
  const queryClient = useQueryClient()
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')

  const hasRuleSources = selectedRuleIds.length > 0 || inlineRules.length > 0
  const isEditing = Boolean(editingDashboardId)

  const saveDashboard = useMutation({
    mutationFn: () => {
      const payload = {
        name: (isEditing ? editingDashboardName ?? '' : saveName).trim(),
        ruleIds: selectedRuleIds,
        inlineRules,
      }

      if (isEditing && editingDashboardId) {
        return updateRuleDashboard(editingDashboardId, payload)
      }

      return createRuleDashboard(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses', 'rule-dashboards'] })
      setSaveOpen(false)
      setSaveName('')
      onCancelEdit?.()
    },
  })

  const toggleRule = (ruleId: string, checked: boolean) => {
    if (checked) {
      onSelectedRuleIdsChange([...selectedRuleIds, ruleId])
      return
    }
    onSelectedRuleIdsChange(selectedRuleIds.filter((id) => id !== ruleId))
  }

  const openSaveDialog = () => {
    if (isEditing) {
      saveDashboard.mutate()
      return
    }
    setSaveName('')
    setSaveOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      {isEditing ? (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Editing saved dashboard <strong>{editingDashboardName}</strong>. Update rules below, then save changes.
            </span>
            {onCancelEdit ? (
              <Button variant="outline" size="sm" onClick={onCancelEdit}>
                Cancel edit
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <DashboardInlineRulesEditor
        inlineRules={inlineRules}
        onInlineRulesChange={onInlineRulesChange}
        previewDateFrom={previewDateFrom}
        previewDateTo={previewDateTo}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Global rules</CardTitle>
          <CardDescription>
            Optionally combine with saved rules from the Rules tab (OR logic).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rulesLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : rules.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {rules.map((rule) => (
                <label
                  key={rule.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
                >
                  <Checkbox
                    checked={selectedRuleIds.includes(rule.id)}
                    onCheckedChange={(checked) =>
                      toggleRule(rule.id, checked === true)
                    }
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <TransactionCategoryTile
                        category={rule.action.category}
                        size="sm"
                      />
                      <span className="font-medium">{rule.name}</span>
                      {!rule.enabled ? (
                        <Badge variant="secondary">Disabled</Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {rule.action.category} / {rule.action.subcategory}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No global rules yet. You can still build a dashboard using dashboard-only rules above.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={onViewDashboard} disabled={!hasRuleSources}>
              <LayoutDashboard className="mr-1.5 size-4" />
              View dashboard
            </Button>
            <Button
              variant="outline"
              disabled={!hasRuleSources || saveDashboard.isPending}
              onClick={openSaveDialog}
            >
              <Save className="mr-1.5 size-4" />
              {isEditing ? 'Save changes' : 'Save dashboard'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save dashboard</DialogTitle>
            <DialogDescription>
              Save this rule combination as a named preset.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dashboard-name">Name</Label>
            <Input
              id="dashboard-name"
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              placeholder="All Smartbuy"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => saveDashboard.mutate()}
              disabled={!saveName.trim() || saveDashboard.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
