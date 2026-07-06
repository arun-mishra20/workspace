import { describe, expect, it, vi } from 'vitest'

import { RuleDashboardAnalyticsService } from '@/modules/expenses/application/services/rule-dashboard-analytics.service'

import type { TransactionRepository } from '@/modules/expenses/application/ports/transaction.repository.port'
import type { RuleDashboardsService } from '@/modules/expenses/application/services/rule-dashboards.service'
import type { RuleDashboardAnalyticsRequest, Transaction } from '@workspace/domain'

const matchingTransaction = {
    id: 'txn-1',
    userId: 'user-1',
    merchant: 'Swiggy',
    merchantRaw: 'SWIGGY',
    amount: 500,
    currency: 'INR',
    transactionType: 'debited',
    transactionMode: 'upi',
    category: 'food',
    categoryMetadata: { icon: 'utensils', color: '#64748b', parent: null },
    subcategory: 'delivery',
    confidence: 1,
    categorizationMethod: 'manual',
    dedupeHash: 'dedupe-1',
    requiresReview: false,
    sourceEmailId: 'email-1',
    transactionDate: '2025-06-15T10:00:00.000Z',
    createdAt: '2025-06-15T10:00:00.000Z',
    updatedAt: '2025-06-15T10:00:00.000Z',
} as Transaction

const unmatchedTransaction = {
    ...matchingTransaction,
    id: 'txn-2',
    merchant: 'Book Store',
    merchantRaw: 'BOOK STORE',
} as Transaction

const rule = {
    id: 'rule-a',
    name: 'Food delivery',
    conditions: {
        logic: 'AND' as const,
        conditions: [{ field: 'merchant' as const, op: 'contains' as const, value: 'swiggy' }],
    },
}

const request: RuleDashboardAnalyticsRequest = {
    startDate: '2025-06-01',
    endDate: '2025-06-30',
    ruleIds: ['rule-a'],
    inlineRules: [],
    page: 1,
    pageSize: 25,
}

function createService(params: {
    optimizedResult: Transaction[] | null
    fallbackResult?: Transaction[]
}) {
    const ruleDashboardsService = {
        resolveRulesForAnalytics: vi.fn().mockResolvedValue({
            rules: [rule],
            missingRuleIds: [],
        }),
    } as unknown as RuleDashboardsService

    const transactionRepository = {
        listByUserInDateRangeMatchingRules: vi.fn().mockResolvedValue(params.optimizedResult),
        listByUserInDateRange: vi.fn().mockResolvedValue(params.fallbackResult ?? []),
    } as unknown as TransactionRepository

    return {
        service: new RuleDashboardAnalyticsService(ruleDashboardsService, transactionRepository),
        transactionRepository,
    }
}

describe('rule dashboard analytics service', () => {
    it('uses rule-matching repository prefilter before in-memory rule evaluation', async () => {
        const { service, transactionRepository } = createService({
            optimizedResult: [matchingTransaction, unmatchedTransaction],
        })

        const result = await service.computeAnalytics('user-1', request)

        expect(transactionRepository.listByUserInDateRangeMatchingRules).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'user-1',
                limit: 10_001,
                rules: [rule],
            }),
        )
        expect(transactionRepository.listByUserInDateRange).not.toHaveBeenCalled()
        expect(result.transactions.total).toBe(1)
        expect(result.transactions.data[0]?.id).toBe('txn-1')
    })

    it('falls back to broad date-range loading when rules cannot be translated', async () => {
        const { service, transactionRepository } = createService({
            optimizedResult: null,
            fallbackResult: [matchingTransaction],
        })

        const result = await service.computeAnalytics('user-1', request)

        expect(transactionRepository.listByUserInDateRange).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'user-1',
                limit: 10_001,
            }),
        )
        expect(result.transactions.total).toBe(1)
    })
})
