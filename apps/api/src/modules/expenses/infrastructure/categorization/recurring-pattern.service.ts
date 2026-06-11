import { differenceInDays, parseISO } from 'date-fns'

import { mergeTransactionAttributes } from '@/modules/expenses/infrastructure/categorization/transaction-attributes.schema'

import type { Transaction } from '@workspace/domain'
import type { TransactionRepository } from '@/modules/expenses/application/ports/transaction.repository.port'

interface RecurringGroup {
  merchant: string
  transactions: Transaction[]
}

export class RecurringPatternService {
  private static instance: RecurringPatternService | null = null

  static getInstance(): RecurringPatternService {
    if (!this.instance) {
      this.instance = new RecurringPatternService()
    }
    return this.instance
  }

  detectGroups(transactions: Transaction[]): RecurringGroup[] {
    const debited = transactions.filter((txn) => txn.transactionType === 'debited')
    const byMerchant = new Map<string, Transaction[]>()

    for (const txn of debited) {
      const key = txn.merchant.toLowerCase()
      const group = byMerchant.get(key) ?? []
      group.push(txn)
      byMerchant.set(key, group)
    }

    const recurring: RecurringGroup[] = []
    for (const [merchant, txns] of byMerchant) {
      if (txns.length < 3) {
        continue
      }

      const sorted = [...txns].sort(
        (a, b) => parseISO(a.transactionDate).getTime() - parseISO(b.transactionDate).getTime(),
      )
      const amounts = sorted.map((txn) => txn.amount)
      const avg = amounts.reduce((sum, value) => sum + value, 0) / amounts.length
      const amountVariance = amounts.every(
        (amount) => Math.abs(amount - avg) / Math.max(avg, 1) <= 0.15,
      )

      const intervals: number[] = []
      for (let index = 1; index < sorted.length; index += 1) {
        intervals.push(
          differenceInDays(
            parseISO(sorted[index]!.transactionDate),
            parseISO(sorted[index - 1]!.transactionDate),
          ),
        )
      }
      const monthlyLike = intervals.filter((days) => days >= 25 && days <= 35).length >= 2

      if (amountVariance && monthlyLike) {
        recurring.push({ merchant, transactions: sorted })
      }
    }

    return recurring
  }

  buildAttributeUpdates(groups: RecurringGroup[]): Map<string, ReturnType<typeof mergeTransactionAttributes>> {
    const updates = new Map<string, ReturnType<typeof mergeTransactionAttributes>>()

    for (const group of groups) {
      for (const txn of group.transactions) {
        updates.set(
          txn.id,
          mergeTransactionAttributes(txn.transactionAttributes, {
            isRecurring: true,
            billingCycle: 'monthly',
            serviceName: txn.merchant,
          }),
        )
      }
    }

    return updates
  }

  async applyForUser(userId: string, repository: TransactionRepository): Promise<number> {
    const transactions = await repository.listAllForUser(userId)
    const groups = this.detectGroups(transactions)
    const updates = this.buildAttributeUpdates(groups)

    if (updates.size === 0) {
      return 0
    }

    await repository.updateTransactionAttributesBatch({
      userId,
      updates: [...updates.entries()].map(([id, transactionAttributes]) => ({
        id,
        transactionAttributes,
      })),
    })

    return updates.size
  }
}
