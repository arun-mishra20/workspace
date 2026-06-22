import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Inject, Injectable, NotFoundException } from '@nestjs/common'

import {
  CATEGORIZATION_RULE_REPOSITORY,
} from '@/modules/expenses/application/ports/categorization-rule.repository.port'
import {
  TRANSACTION_REPOSITORY,
} from '@/modules/expenses/application/ports/transaction.repository.port'
import {
  evaluateRuleConditionGroup
  
} from '@/modules/expenses/infrastructure/categorization/rule-condition-evaluator'
import { TransactionCategorizer } from '@/modules/expenses/infrastructure/categorization/transaction-categorizer'

import type { CategorizationRuleRepository } from '@/modules/expenses/application/ports/categorization-rule.repository.port'
import type { TransactionRepository } from '@/modules/expenses/application/ports/transaction.repository.port'
import type {RuleEvaluationInput} from '@/modules/expenses/infrastructure/categorization/rule-condition-evaluator';
import type {
  CategorizationRule,
  CategoryOption,
  CreateCategorizationRuleInput,
  ReapplyAllRulesResponse,
  RuleApplyRequest,
  RuleApplyResponse,
  RuleConflictItem,
  RulePreviewRequest,
  RulePreviewResponse,
  SuggestedRule,
  Transaction,
  UpdateCategorizationRuleInput,
} from '@workspace/domain'

interface DefaultCategoriesConfig {
  categories?: Record<
    string,
    {
      name?: string
      icon?: string
      color?: string
      parent?: string | null
    }
  >
}

interface SubcategoryRulesConfig {
  exact_matches?: Record<string, string>
}

@Injectable()
export class CategorizationRulesService {
  private readonly transactionCategorizer = TransactionCategorizer.getInstance()
  private readonly defaultCategories = this.loadConfig<DefaultCategoriesConfig>(
    'default_categories.json',
  )
  private readonly subcategoryRules = this.loadConfig<SubcategoryRulesConfig>(
    'subcategory_rules.json',
  )

  constructor(
    @Inject(CATEGORIZATION_RULE_REPOSITORY)
    private readonly ruleRepository: CategorizationRuleRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async listRules(userId: string): Promise<CategorizationRule[]> {
    return this.ruleRepository.findAllByUser(userId)
  }

  async getRule(userId: string, id: string): Promise<CategorizationRule> {
    const rule = await this.ruleRepository.findById({ userId, id })
    if (!rule) {
      throw new NotFoundException('Rule not found')
    }
    return rule
  }

  async createRule(
    userId: string,
    input: CreateCategorizationRuleInput,
  ): Promise<CategorizationRule> {
    const existing = await this.ruleRepository.findAllByUser(userId)
    const priority = input.priority ?? existing.length

    return this.ruleRepository.create({
      userId,
      input,
      priority,
    })
  }

  async updateRule(
    userId: string,
    id: string,
    input: UpdateCategorizationRuleInput,
  ): Promise<CategorizationRule> {
    const rule = await this.ruleRepository.update({ userId, id, input })
    if (!rule) {
      throw new NotFoundException('Rule not found')
    }
    return rule
  }

  async deleteRule(userId: string, id: string): Promise<void> {
    const deleted = await this.ruleRepository.delete({ userId, id })
    if (!deleted) {
      throw new NotFoundException('Rule not found')
    }
  }

  async reorderRules(
    userId: string,
    orderedIds: string[],
  ): Promise<CategorizationRule[]> {
    return this.ruleRepository.reorderPriorities({ userId, orderedIds })
  }

  getCategories(): CategoryOption[] {
    const categories = this.defaultCategories.categories ?? {}
    const subcategoryExact = this.subcategoryRules.exact_matches ?? {}

    const subcategoryEntries = Object.entries(subcategoryExact).map(([value, parent]) => ({
      value,
      label: value.replaceAll('_', ' ').replaceAll(/\b\w/g, (c) => c.toUpperCase()),
      parent,
    }))

    const subcategoriesByParent = new Map<string, Array<{ value: string, label: string }>>()
    for (const entry of subcategoryEntries) {
      const list = subcategoriesByParent.get(entry.parent) ?? []
      list.push({ value: entry.value, label: entry.label })
      subcategoriesByParent.set(entry.parent, list)
    }

    return Object.entries(categories).map(([value, meta]) => ({
      value,
      label: meta.name ?? value.replaceAll('_', ' '),
      icon: meta.icon ?? 'question-circle',
      color: meta.color ?? '#BDC3C7',
      parent: meta.parent ?? null,
      subcategories: subcategoriesByParent.get(value) ?? [],
    }))
  }

  async previewRule(
    userId: string,
    request: RulePreviewRequest,
  ): Promise<RulePreviewResponse> {
    const transactions = await this.loadTransactionsForScope(userId, request)
    const matched = transactions.filter((txn) =>
      evaluateRuleConditionGroup(request.conditions, this.toEvaluationInput(txn)),
    )

    const offset = request.offset ?? 0
    const limit = request.limit ?? 20
    const page = matched.slice(offset, offset + limit)

    return {
      matchedCount: matched.length,
      totalAmount: matched.reduce((sum, txn) => sum + txn.amount, 0),
      transactions: page.map((txn) => ({
        id: txn.id,
        merchant: txn.merchant,
        amount: txn.amount,
        transactionDate: txn.transactionDate,
        transactionType: txn.transactionType,
        category: txn.category,
        subcategory: txn.subcategory,
        categorizationMethod: txn.categorizationMethod,
      })),
    }
  }

  async applyRule(
    userId: string,
    ruleId: string,
    request: RuleApplyRequest,
  ): Promise<RuleApplyResponse> {
    const rule = await this.getRule(userId, ruleId)
    const transactions = await this.loadTransactionsForScope(userId, {
      dateFrom: request.dateFrom,
      dateTo: request.dateTo,
    })

    const matched = transactions.filter((txn) =>
      evaluateRuleConditionGroup(rule.conditions, this.toEvaluationInput(txn)),
    )

    const eligible = request.force
      ? matched
      : matched.filter((txn) => txn.categorizationMethod !== 'manual')

    const skippedManualCount = matched.length - eligible.length
    const categoryMetadata = this.transactionCategorizer
      .categorizeTransaction(
        {
          paid_to: 'preview',
          transaction_mode: 'upi',
          amount: 0,
          transaction_type: 'debited',
        },
        {
          composite_rules: [rule],
        },
      ).categoryMetadata

    let appliedCount = 0
    for (const batch of chunkArray(eligible.map((txn) => txn.id), 100)) {
      appliedCount += await this.transactionRepository.bulkApplyRuleByIds({
        userId,
        ids: batch,
        category: rule.action.category,
        subcategory: rule.action.subcategory,
        categoryMetadata,
        requiresReview: rule.action.requiresReview,
        transactionAttributes: rule.action.setAttributes,
      })
    }

    if (appliedCount > 0) {
      await this.ruleRepository.incrementHitCount({
        userId,
        id: ruleId,
        matchedCount: appliedCount,
      })
    }

    return {
      appliedCount,
      skippedManualCount,
      totalAmount: eligible.reduce((sum, txn) => sum + txn.amount, 0),
    }
  }

  async detectConflicts(userId: string): Promise<RuleConflictItem[]> {
    const rules = await this.ruleRepository.findEnabledByUser(userId)
    if (rules.length < 2) return []

    const transactions = await this.transactionRepository.listAllForUser(userId)
    const conflicts: RuleConflictItem[] = []

    for (const txn of transactions) {
      const input = this.toEvaluationInput(txn)
      const matchingRules = rules.filter((rule) =>
        evaluateRuleConditionGroup(rule.conditions, input),
      )

      if (matchingRules.length > 1) {
        conflicts.push({
          transactionId: txn.id,
          merchant: txn.merchant,
          amount: txn.amount,
          ruleIds: matchingRules.map((rule) => rule.id),
          ruleNames: matchingRules.map((rule) => rule.name),
        })
      }
    }

    return conflicts.slice(0, 50)
  }

  async suggestRules(userId: string): Promise<SuggestedRule[]> {
    const transactions = await this.transactionRepository.listAllForUser(userId)
    const debits = transactions.filter((txn) => txn.transactionType === 'debited')

    const amountGroups = new Map<number, Transaction[]>()
    for (const txn of debits) {
      const existing = amountGroups.get(txn.amount) ?? []
      existing.push(txn)
      amountGroups.set(txn.amount, existing)
    }

    const suggestions: SuggestedRule[] = []

    for (const [amount, group] of amountGroups.entries()) {
      if (group.length < 3) continue

      const merchants = [...new Set(group.map((txn) => txn.merchant))]
      const uncategorizedCount = group.filter((txn) => txn.category === 'uncategorized').length
      if (uncategorizedCount === 0) continue

      const sample = group[0]!
      suggestions.push({
        name: `Recurring ₹${amount.toLocaleString('en-IN')} debit`,
        conditions: {
          logic: 'AND',
          conditions: [
            { field: 'transaction_type', op: 'eq', value: 'debited' },
            { field: 'amount', op: 'eq', value: amount },
          ],
        },
        action: {
          category: sample.category === 'uncategorized' ? 'utilities' : sample.category,
          subcategory:
            sample.subcategory === 'uncategorized' ? 'subscription' : sample.subcategory,
        },
        matchCount: group.length,
        totalAmount: group.reduce((sum, txn) => sum + txn.amount, 0),
        sampleMerchant: merchants[0],
      })
    }

    return suggestions
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10)
  }

  async reapplyAllRules(userId: string, force = false): Promise<ReapplyAllRulesResponse> {
    const rules = await this.ruleRepository.findEnabledByUser(userId)
    let appliedCount = 0
    let skippedManualCount = 0

    for (const rule of rules) {
      const result = await this.applyRule(userId, rule.id, { force })
      appliedCount += result.appliedCount
      skippedManualCount += result.skippedManualCount
    }

    return {
      appliedCount,
      skippedManualCount,
      rulesProcessed: rules.length,
    }
  }

  async loadEnabledRulesForCategorization(userId: string): Promise<CategorizationRule[]> {
    return this.ruleRepository.findEnabledByUser(userId)
  }

  private async loadTransactionsForScope(
    userId: string,
    scope: { dateFrom?: string, dateTo?: string },
  ): Promise<Transaction[]> {
    const all = await this.transactionRepository.listAllForUser(userId)

    if (!scope.dateFrom && !scope.dateTo) {
      return all
    }

    return all.filter((txn) => {
      const date = txn.transactionDate.slice(0, 10)
      if (scope.dateFrom && date < scope.dateFrom) return false
      if (scope.dateTo && date > scope.dateTo) return false
      return true
    })
  }

  private toEvaluationInput(transaction: Transaction): RuleEvaluationInput {
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

  private loadConfig<T>(fileName: string): T {
    const moduleDir = dirname(fileURLToPath(import.meta.url))
    const candidatePaths = [
      join(moduleDir, '..', 'infrastructure', 'categorization', 'config', fileName),
      join(process.cwd(), 'src/modules/expenses/infrastructure/categorization/config', fileName),
      join(
        process.cwd(),
        'apps/api/src/modules/expenses/infrastructure/categorization/config',
        fileName,
      ),
    ]

    for (const candidate of candidatePaths) {
      if (existsSync(candidate)) {
        return JSON.parse(readFileSync(candidate, 'utf8')) as T
      }
    }

    return {} as T
  }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}
