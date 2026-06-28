import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  differenceInDays,
  format,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns'

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
  PeriodComparison,
  RuleConditionGroup,
  RuleDashboardByRuleItem,
  RuleDashboardByRuleMonthlyItem,
  RuleDashboardInsights,
  RuleDashboardMonthlyItem,
  RuleDashboardCadence,
  RuleDashboardSummary,
  RuleDashboard,
  RuleDashboardListItem,
  Transaction,
  UpdateRuleDashboardInput,
} from '@workspace/domain'

export const INSIGHTS_LOOKBACK_MONTHS = 12

function round(value: number, precision = 0): number {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

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

export function computeInsightsLookbackStartDate(endDate: string): string {
  const endMonth = parseISO(`${endDate}T00:00:00.000Z`)
  return format(
    startOfMonth(subMonths(endMonth, INSIGHTS_LOOKBACK_MONTHS - 1)),
    'yyyy-MM-dd',
  )
}

export function filterTransactionsByDateRange<
  T extends { transactionDate: string },
>(transactions: T[], startDate: string, endDate: string): T[] {
  return transactions.filter((txn) => {
    const date = txn.transactionDate.slice(0, 10)
    return date >= startDate && date <= endDate
  })
}

export function groupMonthlySpending(
  transactions: Array<{
    transactionDate: string
    amount: number
    transactionType: string
  }>,
): RuleDashboardMonthlyItem[] {
  const grouped = new Map<string, RuleDashboardMonthlyItem>()

  for (const txn of transactions) {
    const month = txn.transactionDate.slice(0, 7)
    const existing = grouped.get(month) ?? {
      month,
      debited: 0,
      credited: 0,
      transactionCount: 0,
    }

    existing.transactionCount += 1
    if (txn.transactionType === 'debited') {
      existing.debited += txn.amount
    } else if (txn.transactionType === 'credited') {
      existing.credited += txn.amount
    }

    grouped.set(month, existing)
  }

  return [...grouped.values()].sort((a, b) => a.month.localeCompare(b.month))
}

export function buildMonthlyTrendSeries(
  monthlyItems: RuleDashboardMonthlyItem[],
  endDate: string,
  lookbackMonths = INSIGHTS_LOOKBACK_MONTHS,
): RuleDashboardMonthlyItem[] {
  const endMonth = parseISO(`${endDate}T00:00:00.000Z`)
  const byMonth = new Map(monthlyItems.map((item) => [item.month, item]))

  return Array.from({ length: lookbackMonths }, (_, index) => {
    const monthDate = subMonths(endMonth, lookbackMonths - index - 1)
    const month = format(monthDate, 'yyyy-MM')

    return (
      byMonth.get(month) ?? {
        month,
        debited: 0,
        credited: 0,
        transactionCount: 0,
      }
    )
  })
}

export function detectSpendCadence(
  monthlyTrend: RuleDashboardMonthlyItem[],
): RuleDashboardCadence {
  const monthsWithSpend = monthlyTrend.filter((item) => item.debited > 0).length

  if (monthsWithSpend >= 6) {
    return 'recurring'
  }

  if (monthsWithSpend >= 2) {
    return 'occasional'
  }

  return 'sparse'
}

export function cadenceLabel(cadence: RuleDashboardCadence): string {
  switch (cadence) {
    case 'recurring': {
      return 'Recurring spend'
    }
    case 'occasional': {
      return 'Occasional spend'
    }
    case 'sparse': {
      return 'Sparse spend'
    }
    default: {
      return 'Spend pattern'
    }
  }
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!
}

export function computeBaselines(
  monthlyTrend: RuleDashboardMonthlyItem[],
): RuleDashboardInsights['baselines'] {
  const activeMonths = monthlyTrend.filter((item) => item.debited > 0)
  const nonZeroDebited = activeMonths.map((item) => item.debited)
  const totalDebited = monthlyTrend.reduce((sum, item) => sum + item.debited, 0)
  const totalTxnCount = activeMonths.reduce(
    (sum, item) => sum + item.transactionCount,
    0,
  )

  return {
    medianMonthlySpend: median(nonZeroDebited),
    avgMonthlySpend:
      monthlyTrend.length > 0 ? totalDebited / monthlyTrend.length : 0,
    avgTransactionsPerActiveMonth:
      activeMonths.length > 0 ? totalTxnCount / activeMonths.length : 0,
    monthsWithSpend: activeMonths.length,
  }
}

export function pctChange(current: number, previous: number): number {
  if (previous > 0) {
    return round(((current - previous) / previous) * 100, 2)
  }

  return current > 0 ? 100 : 0
}

export function computePreviousDateRange(startDate: string, endDate: string) {
  const start = parseISO(`${startDate}T00:00:00.000Z`)
  const end = parseISO(`${endDate}T23:59:59.999Z`)
  const durationMs = end.getTime() - start.getTime()
  const previousEnd = new Date(start.getTime() - 1)
  const previousStart = new Date(start.getTime() - durationMs)

  return {
    startDate: format(previousStart, 'yyyy-MM-dd'),
    endDate: format(previousEnd, 'yyyy-MM-dd'),
  }
}

export function computeRulePeriodComparison(
  matchedTransactions: Transaction[],
  startDate: string,
  endDate: string,
): PeriodComparison {
  const currentTransactions = filterTransactionsByDateRange(
    matchedTransactions,
    startDate,
    endDate,
  )
  const previousRange = computePreviousDateRange(startDate, endDate)
  const previousTransactions = filterTransactionsByDateRange(
    matchedTransactions,
    previousRange.startDate,
    previousRange.endDate,
  )

  const currentPeriod = computeDashboardSummary(currentTransactions)
  const previousPeriod = computeDashboardSummary(previousTransactions)

  return {
    currentPeriod,
    previousPeriod,
    changes: {
      spentChange: pctChange(
        currentPeriod.totalSpent,
        previousPeriod.totalSpent,
      ),
      receivedChange: pctChange(
        currentPeriod.totalReceived,
        previousPeriod.totalReceived,
      ),
      countChange: pctChange(
        currentPeriod.transactionCount,
        previousPeriod.transactionCount,
      ),
      avgChange: pctChange(
        currentPeriod.avgTransaction,
        previousPeriod.avgTransaction,
      ),
    },
  }
}

export function computeCadenceComparison(
  cadence: RuleDashboardCadence,
  monthlyTrend: RuleDashboardMonthlyItem[],
  viewSummary: RuleDashboardSummary,
  endDate: string,
): RuleDashboardInsights['primaryComparison'] {
  const endMonth = format(parseISO(`${endDate}T00:00:00.000Z`), 'yyyy-MM')
  const endMonthIndex = monthlyTrend.findIndex((item) => item.month === endMonth)
  const currentMonthItem =
    endMonthIndex === -1 ? undefined : monthlyTrend[endMonthIndex]
  const previousMonthItem =
    endMonthIndex > 0 ? monthlyTrend[endMonthIndex - 1] : undefined
  const baselines = computeBaselines(monthlyTrend)
  const nonZeroMonths = monthlyTrend.filter((item) => item.debited > 0)
  const lastActiveMonth = nonZeroMonths.at(-1)

  if (cadence === 'recurring') {
    const currentValue = currentMonthItem?.debited ?? viewSummary.totalSpent
    const referenceValue = previousMonthItem?.debited ?? 0

    return {
      mode: 'month_over_month',
      label: 'Spend this month',
      referenceLabel: 'Previous month',
      currentValue,
      referenceValue,
      changePct: pctChange(currentValue, referenceValue),
    }
  }

  if (cadence === 'occasional') {
    const currentValue = viewSummary.totalSpent
    const referenceValue = baselines.medianMonthlySpend

    return {
      mode: 'vs_baseline',
      label: 'Spend in selected range',
      referenceLabel: 'Typical active month (median)',
      currentValue,
      referenceValue,
      changePct: pctChange(currentValue, referenceValue),
    }
  }

  const currentValue = viewSummary.totalSpent
  const referenceValue =
    lastActiveMonth?.debited ?? nonZeroMonths[0]?.debited ?? 0

  return {
    mode: 'vs_baseline',
    label: 'Spend in selected range',
    referenceLabel: lastActiveMonth
      ? `Last active month (${lastActiveMonth.month})`
      : 'Last active month',
    currentValue,
    referenceValue,
    changePct: pctChange(currentValue, referenceValue),
  }
}

export function computeDaysSinceLastSpend(
  debitedTransactions: Array<{ transactionDate: string }>,
  endDate: string,
): number | undefined {
  if (debitedTransactions.length === 0) {
    return undefined
  }

  let lastDate = debitedTransactions[0]!.transactionDate.slice(0, 10)
  for (const txn of debitedTransactions) {
    const date = txn.transactionDate.slice(0, 10)
    if (date > lastDate) {
      lastDate = date
    }
  }

  return differenceInDays(
    parseISO(`${endDate}T00:00:00.000Z`),
    parseISO(`${lastDate}T00:00:00.000Z`),
  )
}

export function computeAverageDaysBetweenSpend(
  debitedTransactions: Array<{ transactionDate: string }>,
): number | undefined {
  if (debitedTransactions.length < 2) {
    return undefined
  }

  const sortedDates = [
    ...new Set(
      debitedTransactions.map((txn) => txn.transactionDate.slice(0, 10)),
    ),
  ].sort()

  let totalGap = 0
  for (let index = 1; index < sortedDates.length; index += 1) {
    totalGap += differenceInDays(
      parseISO(`${sortedDates[index]!}T00:00:00.000Z`),
      parseISO(`${sortedDates[index - 1]!}T00:00:00.000Z`),
    )
  }

  return Math.round(totalGap / (sortedDates.length - 1))
}

export function pickLargestTransactions(
  transactions: Transaction[],
  limit = 5,
): RuleDashboardInsights['largestTransactions'] {
  return [...transactions]
    .filter((txn) => txn.transactionType === 'debited')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map((txn) => ({
      id: txn.id,
      merchant: txn.merchant,
      amount: txn.amount,
      transactionDate: txn.transactionDate,
    }))
}

export function groupByRuleMonthly(
  matched: Array<{
    transaction: Transaction
    matchedRules: DashboardEvaluableRule[]
  }>,
  rules: DashboardEvaluableRule[],
): RuleDashboardByRuleMonthlyItem[] {
  const amounts = new Map<string, number>()

  for (const entry of matched) {
    if (entry.transaction.transactionType !== 'debited') {
      continue
    }

    const month = entry.transaction.transactionDate.slice(0, 7)
    for (const rule of entry.matchedRules) {
      const key = `${rule.id}|${month}`
      amounts.set(
        key,
        (amounts.get(key) ?? 0) + entry.transaction.amount,
      )
    }
  }

  const months = [
    ...new Set(
      [...amounts.keys()].map((key) => key.split('|')[1]!),
    ),
  ].sort()

  return rules.flatMap((rule) =>
    months.map((month) => ({
      ruleId: rule.id,
      name: rule.name,
      month,
      amount: amounts.get(`${rule.id}|${month}`) ?? 0,
    })),
  )
}

function formatPct(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value}%`
}

export function buildInsightHighlights(params: {
  cadence: RuleDashboardCadence
  monthlyTrend: RuleDashboardMonthlyItem[]
  primaryComparison: RuleDashboardInsights['primaryComparison']
  viewSummary: RuleDashboardSummary
  byRule: RuleDashboardByRuleItem[]
  daysSinceLastSpend?: number
  avgDaysBetweenSpend?: number
  endDate: string
  startDate: string
}): string[] {
  const highlights: string[] = []
  const {
    cadence,
    monthlyTrend,
    primaryComparison,
    viewSummary,
    byRule,
    daysSinceLastSpend,
    avgDaysBetweenSpend,
    endDate,
  } = params

  if (viewSummary.transactionCount === 0) {
    highlights.push(
      'No matching transactions in the selected range. Try widening the date range or adjusting your rules.',
    )
    return highlights
  }

  const changeText = formatPct(primaryComparison.changePct)
  highlights.push(
    `${primaryComparison.label}: ${primaryComparison.currentValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })} (${changeText} vs ${primaryComparison.referenceLabel.toLowerCase()}).`,
  )

  if (cadence === 'recurring') {
    const baselines = computeBaselines(monthlyTrend)
    if (baselines.avgMonthlySpend > 0) {
      const vsAvg = pctChange(
        viewSummary.totalSpent,
        baselines.avgMonthlySpend,
      )
      highlights.push(
        `Average across the last ${INSIGHTS_LOOKBACK_MONTHS} months is ${baselines.avgMonthlySpend.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })} (${formatPct(vsAvg)} vs selected range).`,
      )
    }
  }

  if (cadence === 'occasional') {
    const endMonth = format(parseISO(`${endDate}T00:00:00.000Z`), 'yyyy-MM')
    const ranked = [...monthlyTrend]
      .filter((item) => item.debited > 0)
      .sort((a, b) => b.debited - a.debited)
    const currentRank = ranked.findIndex((item) => item.month === endMonth)

    if (currentRank !== -1 && currentRank < 2) {
      highlights.push(
        'This looks like an active spending month — among your highest in the last 12 months.',
      )
    }

    if (daysSinceLastSpend !== undefined && daysSinceLastSpend > 0) {
      highlights.push(`Last matching spend was ${daysSinceLastSpend} days ago.`)
    }
  }

  if (cadence === 'sparse' && daysSinceLastSpend !== undefined) {
    highlights.push(
      daysSinceLastSpend === 0
        ? 'Spend occurred on the last day of the selected range.'
        : `Last matching spend was ${daysSinceLastSpend} days ago.`,
    )
  }

  if (avgDaysBetweenSpend !== undefined) {
    highlights.push(
      `Average gap between spend days in the lookback window: ${avgDaysBetweenSpend} days.`,
    )
  }

  if (byRule.length > 1) {
    const topRule = [...byRule].sort((a, b) => b.amount - a.amount)[0]
    if (topRule) {
      const share =
        viewSummary.totalSpent > 0
          ? round((topRule.amount / viewSummary.totalSpent) * 100, 0)
          : 0
      highlights.push(
        `"${topRule.name}" accounts for ${share}% of spend in this range (${topRule.matchCount} transactions).`,
      )
    }
  }

  return highlights.slice(0, 4)
}

export function buildRuleDashboardInsights(params: {
  lookbackMatchedTransactions: Transaction[]
  viewMatchedTransactions: Transaction[]
  viewSummary: RuleDashboardSummary
  byRule: RuleDashboardByRuleItem[]
  startDate: string
  endDate: string
}): RuleDashboardInsights {
  const {
    lookbackMatchedTransactions,
    viewMatchedTransactions,
    viewSummary,
    byRule,
    startDate,
    endDate,
  } = params

  const monthlyFromData = groupMonthlySpending(lookbackMatchedTransactions)
  const monthlyTrend = buildMonthlyTrendSeries(monthlyFromData, endDate)
  const cadence = detectSpendCadence(monthlyTrend)
  const baselines = computeBaselines(monthlyTrend)
  const primaryComparison = computeCadenceComparison(
    cadence,
    monthlyTrend,
    viewSummary,
    endDate,
  )
  const debitedLookback = lookbackMatchedTransactions.filter(
    (txn) => txn.transactionType === 'debited',
  )
  const daysSinceLastSpend = computeDaysSinceLastSpend(
    debitedLookback,
    endDate,
  )
  const avgDaysBetweenSpend = computeAverageDaysBetweenSpend(debitedLookback)
  const highlights = buildInsightHighlights({
    cadence,
    monthlyTrend,
    primaryComparison,
    viewSummary,
    byRule,
    daysSinceLastSpend,
    avgDaysBetweenSpend,
    endDate,
    startDate,
  })

  return {
    cadence,
    cadenceLabel: cadenceLabel(cadence),
    lookbackMonths: INSIGHTS_LOOKBACK_MONTHS,
    monthlyTrend,
    baselines,
    primaryComparison,
    ...(daysSinceLastSpend === undefined ? {} : { daysSinceLastSpend }),
    highlights,
    largestTransactions: pickLargestTransactions(viewMatchedTransactions),
  }
}
