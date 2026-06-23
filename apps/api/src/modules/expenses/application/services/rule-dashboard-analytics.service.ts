import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common'

import {
  TRANSACTION_REPOSITORY,
} from '@/modules/expenses/application/ports/transaction.repository.port'
import {
  computeDashboardSummary,
  groupDailySpending,
  matchTransactionsToRules,
  RuleDashboardsService,
} from '@/modules/expenses/application/services/rule-dashboards.service'

import type { TransactionRepository } from '@/modules/expenses/application/ports/transaction.repository.port'
import type {
  RuleDashboardAnalytics,
  RuleDashboardAnalyticsRequest,
  Transaction,
} from '@workspace/domain'

const MAX_TRANSACTIONS = 10_000

@Injectable()
export class RuleDashboardAnalyticsService {
  constructor(
    private readonly ruleDashboardsService: RuleDashboardsService,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async computeAnalytics(
    userId: string,
    request: RuleDashboardAnalyticsRequest,
  ): Promise<RuleDashboardAnalytics> {
    if (request.startDate > request.endDate) {
      throw new BadRequestException('startDate must be on or before endDate')
    }

    const { rules, missingRuleIds } =
      await this.ruleDashboardsService.resolveRulesForAnalytics(
        userId,
        request.ruleIds,
        request.inlineRules,
      )

    if (rules.length === 0) {
      throw new BadRequestException('No valid rules found for this dashboard')
    }

    const transactions = await this.transactionRepository.listByUserInDateRange({
      userId,
      range: {
        start: new Date(`${request.startDate}T00:00:00.000Z`),
        end: new Date(`${request.endDate}T23:59:59.999Z`),
      },
      cardLast4: request.cardLast4,
      limit: MAX_TRANSACTIONS + 1,
    })

    const truncated = transactions.length > MAX_TRANSACTIONS
    const scopedTransactions = truncated
      ? transactions.slice(0, MAX_TRANSACTIONS)
      : transactions

    const matched = matchTransactionsToRules(scopedTransactions, rules)
    const uniqueMatched = matched.map((entry) => entry.transaction)

    const byRule = rules.map((rule) => {
      const ruleMatches = matched.filter((entry) =>
        entry.matchedRules.some((matchedRule) => matchedRule.id === rule.id),
      )
      return {
        ruleId: rule.id,
        name: rule.name,
        matchCount: ruleMatches.length,
        amount: ruleMatches.reduce((sum, entry) => sum + entry.transaction.amount, 0),
      }
    })

    const page = request.page ?? 1
    const pageSize = request.pageSize ?? 25
    const offset = (page - 1) * pageSize
    const pageItems = matched.slice(offset, offset + pageSize)

    return {
      startDate: request.startDate,
      endDate: request.endDate,
      ruleIds: request.ruleIds,
      inlineRules: request.inlineRules,
      rules: rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        source: request.inlineRules.some((inlineRule) => inlineRule.id === rule.id)
          ? ('inline' as const)
          : ('global' as const),
      })),
      missingRuleIds,
      ...(truncated ? { truncated: true } : {}),
      summary: computeDashboardSummary(uniqueMatched),
      daily: groupDailySpending(uniqueMatched),
      byRule,
      transactions: {
        data: pageItems.map((entry) =>
          this.toDashboardTransaction(entry.transaction, entry.matchedRules),
        ),
        total: matched.length,
        page,
        pageSize,
      },
    }
  }

  private toDashboardTransaction(
    transaction: Transaction,
    matchedRules: Array<{ id: string, name: string }>,
  ) {
    return {
      ...transaction,
      matchedRuleIds: matchedRules.map((rule) => rule.id),
      matchedRuleNames: matchedRules.map((rule) => rule.name),
    }
  }
}
