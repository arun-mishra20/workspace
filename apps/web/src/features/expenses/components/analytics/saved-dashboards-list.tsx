import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'

import {
  deleteRuleDashboard,
  updateRuleDashboard,
} from '@/features/expenses/api/rule-dashboards'
import type { CategorizationRule, RuleDashboardListItem } from '@workspace/domain'
import { CategoryIcon } from '@/features/expenses/components/category-icon'
import { Badge } from '@workspace/ui/components/ui/badge'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'

interface SavedDashboardsListProps {
  dashboards: RuleDashboardListItem[]
  loading: boolean
  globalRules: CategorizationRule[]
  onOpen: (dashboard: RuleDashboardListItem) => void
  onEdit: (dashboard: RuleDashboardListItem) => void
  editingDashboardId?: string | null
}

export function SavedDashboardsList({
  dashboards,
  loading,
  globalRules,
  onOpen,
  onEdit,
  editingDashboardId,
}: SavedDashboardsListProps) {
  const queryClient = useQueryClient()
  const categoryByRuleId = new Map(
    globalRules.map((rule) => [rule.id, rule.action.category]),
  )

  const deleteDashboard = useMutation({
    mutationFn: deleteRuleDashboard,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses', 'rule-dashboards'] })
    },
  })

  const clearMissingRules = useMutation({
    mutationFn: (dashboard: RuleDashboardListItem) =>
      updateRuleDashboard(dashboard.id, {
        ruleIds: dashboard.ruleIds.filter((ruleId) =>
          dashboard.rules.some(
            (rule) => rule.source === 'global' && rule.id === ruleId,
          ),
        ),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses', 'rule-dashboards'] })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Saved dashboards</CardTitle>
        <CardDescription>
          Named presets with global rules and/or dashboard-only rules
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : dashboards.length > 0 ? (
          dashboards.map((dashboard) => {
            const globalRuleCount = dashboard.ruleIds.length
            const inlineRuleCount = dashboard.inlineRules.length
            const isEditing = editingDashboardId === dashboard.id

            return (
              <div
                key={dashboard.id}
                className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${
                  isEditing ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{dashboard.name}</p>
                    {isEditing ? (
                      <Badge>Editing</Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {dashboard.rules.map((rule) => {
                      const category =
                        rule.source === 'global'
                          ? categoryByRuleId.get(rule.id)
                          : undefined

                      return (
                      <Badge
                        key={rule.id}
                        variant={rule.source === 'inline' ? 'secondary' : 'outline'}
                        className="gap-1.5"
                      >
                        {category ? (
                          <CategoryIcon category={category} size={12} />
                        ) : null}
                        {rule.name}
                        {rule.source === 'inline' ? ' · dashboard' : ''}
                      </Badge>
                      )
                    })}
                    {dashboard.missingRuleIds?.map((ruleId) => (
                      <Badge key={ruleId} variant="destructive">
                        Missing rule
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {globalRuleCount} global · {inlineRuleCount} dashboard-only
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {dashboard.missingRuleIds && dashboard.missingRuleIds.length > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => clearMissingRules.mutate(dashboard)}
                      disabled={
                        dashboard.ruleIds.length === dashboard.missingRuleIds.length ||
                        clearMissingRules.isPending
                      }
                    >
                      Remove missing
                    </Button>
                  ) : null}
                  <Button size="sm" onClick={() => onOpen(dashboard)}>
                    Open
                  </Button>
                  <Button
                    variant={isEditing ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onEdit(dashboard)}
                  >
                    <Pencil className="mr-1 size-3.5" />
                    {isEditing ? 'Editing…' : 'Edit'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteDashboard.mutate(dashboard.id)}
                    disabled={deleteDashboard.isPending}
                  >
                    <Trash2 className="mr-1 size-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            )
          })
        ) : (
          <p className="text-sm text-muted-foreground">
            No saved dashboards yet. Combine rules above and save a preset.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
