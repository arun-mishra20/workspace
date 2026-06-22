import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import {
  CATEGORIZATION_RULE_REPOSITORY,
} from '@/modules/expenses/application/ports/categorization-rule.repository.port'
import {
  RULE_DASHBOARD_REPOSITORY,
} from '@/modules/expenses/application/ports/rule-dashboard.repository.port'
import {
  evaluateRuleConditionGroup,
} from '@/modules/expenses/infrastructure/categorization/rule-condition-evaluator'

import type { CategorizationRuleRepository } from '@/modules/expenses/application/ports/categorization-rule.repository.port'
import type { RuleDashboardRepository } from '@/modules/expenses/application/ports/rule-dashboard.repository.port'
import type {RuleEvaluationInput} from '@/modules/expenses/infrastructure/categorization/rule-condition-evaluator';
import type {
  CreateRuleDashboardInput,
  DashboardInlineRule,
  RuleConditionGroup,
  RuleDashboard,
  RuleDashboardListItem,
  Transaction,
  UpdateRuleDashboardInput,
} from '@workspace/domain'

export interface DashboardEvaluableRule {
  id: string
  name: string
  conditions: RuleConditionGroup
}

@Injectable()
export class RuleDashboardsService {
  constructor(
    @Inject(RULE_DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: RuleDashboardRepository,
    @Inject(CATEGORIZATION_RULE_REPOSITORY)
    private readonly ruleRepository: CategorizationRuleRepository,
  ) {}

  async listDashboards(userId: string): Promise<RuleDashboardListItem[]> {
    const dashboards = await this.dashboardRepository.findAllByUser(userId)
    const allRules = await this.ruleRepository.findAllByUser(userId)
    const ruleById = new Map(allRules.map((rule) => [rule.id, rule]))

    return dashboards.map((dashboard) =>
      this.toListItem(dashboard, ruleById),
    )
  }

  async getDashboard(userId: string, id: string): Promise<RuleDashboardListItem> {
    const dashboard = await this.dashboardRepository.findById({ userId, id })
    if (!dashboard) {
      throw new NotFoundException('Dashboard not found')
    }

    const allRules = await this.ruleRepository.findAllByUser(userId)
    const ruleById = new Map(allRules.map((rule) => [rule.id, rule]))

    return this.toListItem(dashboard, ruleById)
  }

  async createDashboard(
    userId: string,
    input: CreateRuleDashboardInput,
  ): Promise<RuleDashboardListItem> {
    this.validateDashboardSources(input.ruleIds, input.inlineRules)
    if (input.ruleIds.length > 0) {
      await this.validateRuleIds(userId, input.ruleIds)
    }

    const dashboard = await this.dashboardRepository.create({ userId, input })
    const allRules = await this.ruleRepository.findAllByUser(userId)
    const ruleById = new Map(allRules.map((rule) => [rule.id, rule]))

    return this.toListItem(dashboard, ruleById)
  }

  async updateDashboard(
    userId: string,
    id: string,
    input: UpdateRuleDashboardInput,
  ): Promise<RuleDashboardListItem> {
    const existing = await this.dashboardRepository.findById({ userId, id })
    if (!existing) {
      throw new NotFoundException('Dashboard not found')
    }

    const nextRuleIds = input.ruleIds ?? existing.ruleIds
    const nextInlineRules = input.inlineRules ?? existing.inlineRules
    this.validateDashboardSources(nextRuleIds, nextInlineRules)

    if (input.ruleIds && input.ruleIds.length > 0) {
      await this.validateRuleIds(userId, input.ruleIds)
    }

    const dashboard = await this.dashboardRepository.update({ userId, id, input })
    if (!dashboard) {
      throw new NotFoundException('Dashboard not found')
    }

    const allRules = await this.ruleRepository.findAllByUser(userId)
    const ruleById = new Map(allRules.map((rule) => [rule.id, rule]))

    return this.toListItem(dashboard, ruleById)
  }

  async deleteDashboard(userId: string, id: string): Promise<void> {
    const deleted = await this.dashboardRepository.delete({ userId, id })
    if (!deleted) {
      throw new NotFoundException('Dashboard not found')
    }
  }

  async resolveRulesForAnalytics(
    userId: string,
    ruleIds: string[],
    inlineRules: DashboardInlineRule[],
  ): Promise<{
    rules: DashboardEvaluableRule[]
    missingRuleIds: string[]
  }> {
    const allRules = await this.ruleRepository.findAllByUser(userId)
    const ruleById = new Map(allRules.map((rule) => [rule.id, rule]))

    const rules: DashboardEvaluableRule[] = []
    const missingRuleIds: string[] = []

    for (const ruleId of ruleIds) {
      const rule = ruleById.get(ruleId)
      if (!rule) {
        missingRuleIds.push(ruleId)
        continue
      }
      rules.push({
        id: rule.id,
        name: rule.name,
        conditions: rule.conditions,
      })
    }

    for (const inlineRule of inlineRules) {
      rules.push({
        id: inlineRule.id,
        name: inlineRule.name,
        conditions: inlineRule.conditions,
      })
    }

    return { rules, missingRuleIds }
  }

  private validateDashboardSources(
    ruleIds: string[],
    inlineRules: DashboardInlineRule[],
  ): void {
    if (ruleIds.length === 0 && inlineRules.length === 0) {
      throw new BadRequestException(
        'At least one global rule or dashboard-only rule is required',
      )
    }
  }

  private async validateRuleIds(userId: string, ruleIds: string[]): Promise<void> {
    const allRules = await this.ruleRepository.findAllByUser(userId)
    const ruleById = new Map(allRules.map((rule) => [rule.id, rule]))
    const missingRuleIds = ruleIds.filter((ruleId) => !ruleById.has(ruleId))

    if (missingRuleIds.length > 0) {
      throw new BadRequestException(
        `Unknown rule IDs: ${missingRuleIds.join(', ')}`,
      )
    }
  }

  private toListItem(
    dashboard: RuleDashboard,
    ruleById: Map<string, { id: string, name: string }>,
  ): RuleDashboardListItem {
    const rules: RuleDashboardListItem['rules'] = []
    const missingRuleIds: string[] = []

    for (const ruleId of dashboard.ruleIds) {
      const rule = ruleById.get(ruleId)
      if (rule) {
        rules.push({ id: rule.id, name: rule.name, source: 'global' })
      } else {
        missingRuleIds.push(ruleId)
      }
    }

    for (const inlineRule of dashboard.inlineRules) {
      rules.push({
        id: inlineRule.id,
        name: inlineRule.name,
        source: 'inline',
      })
    }

    return {
      ...dashboard,
      rules,
      ...(missingRuleIds.length > 0 ? { missingRuleIds } : {}),
    }
  }
}

export function toRuleEvaluationInput(transaction: {
  id: string
  merchant: string
  merchantRaw: string
  vpa?: string
  amount: number
  transactionType: string
  transactionMode: string
  cardLast4?: string
  transactionDate: string
}): RuleEvaluationInput {
  return {
    id: transaction.id,
    merchant: transaction.merchant,
    merchantRaw: transaction.merchantRaw,
    vpa: transaction.vpa,
    amount: transaction.amount,
    transactionType: transaction.transactionType,
    transactionMode: transaction.transactionMode,
    cardLast4: transaction.cardLast4,
    transactionDate: transaction.transactionDate,
  }
}

export function groupDailySpending(
  transactions: Array<{
    transactionDate: string
    amount: number
    transactionType: string
  }>,
) {
  const grouped = new Map<string, typeof transactions>()

  for (const txn of transactions) {
    const date = txn.transactionDate.slice(0, 10)
    const existing = grouped.get(date) ?? []
    existing.push(txn)
    grouped.set(date, existing)
  }

  return [...grouped.entries()]
    .map(([date, items]) => ({
      date,
      debited: items
        .filter((txn) => txn.transactionType === 'debited')
        .reduce((sum, txn) => sum + txn.amount, 0),
      credited: items
        .filter((txn) => txn.transactionType === 'credited')
        .reduce((sum, txn) => sum + txn.amount, 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function computeDashboardSummary(
  transactions: Array<{ amount: number, transactionType: string }>,
) {
  const totalSpent = transactions
    .filter((txn) => txn.transactionType === 'debited')
    .reduce((sum, txn) => sum + txn.amount, 0)
  const totalReceived = transactions
    .filter((txn) => txn.transactionType === 'credited')
    .reduce((sum, txn) => sum + txn.amount, 0)
  const transactionCount = transactions.length
  const avgTransaction =
    transactionCount > 0
      ? transactions.reduce((sum, txn) => sum + txn.amount, 0) / transactionCount
      : 0

  return {
    totalSpent,
    totalReceived,
    netFlow: totalReceived - totalSpent,
    transactionCount,
    avgTransaction,
  }
}

export function matchTransactionsToRules(
  transactions: Transaction[],
  rules: DashboardEvaluableRule[],
) {
  const matched: Array<{
    transaction: Transaction
    matchedRules: DashboardEvaluableRule[]
  }> = []

  for (const transaction of transactions) {
    const input = toRuleEvaluationInput(transaction)
    const matchedRules = rules.filter((rule) =>
      evaluateRuleConditionGroup(rule.conditions, input),
    )
    if (matchedRules.length > 0) {
      matched.push({ transaction, matchedRules })
    }
  }

  return matched
}
