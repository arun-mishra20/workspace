import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO, subDays } from 'date-fns'

import { listExpenses } from '@/features/expenses/api/list-expenses'
import { Button } from '@workspace/ui/components/ui/button'
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
import { cn } from '@workspace/ui/lib/utils'
import type { Transaction } from '@workspace/domain'

interface LinkRepaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  debit: Transaction
  onLink: (creditId: string) => void
  onSkip: () => void
  onMarkSettledWithoutLink: () => void
}

function amountProximityScore(debitAmount: number, creditAmount: number): number {
  const delta = Math.abs(debitAmount - creditAmount)
  return delta / Math.max(debitAmount, 1)
}

export function LinkRepaymentDialog({
  open,
  onOpenChange,
  debit,
  onLink,
  onSkip,
  onMarkSettledWithoutLink,
}: LinkRepaymentDialogProps) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const debitDate = debit.transactionDate.slice(0, 10)
  const suggestionFrom = format(subDays(parseISO(debit.transactionDate), 1), 'yyyy-MM-dd')

  const { data, isLoading } = useQuery({
    queryKey: [
      'expenses',
      'transactions',
      'repayment-suggestions',
      debit.id,
      debit.amount,
      suggestionFrom,
    ],
    queryFn: () =>
      listExpenses({
        page: 1,
        page_size: 50,
        date_from: suggestionFrom,
        search: search || undefined,
        sort_by: 'transactionDate',
        sort_order: 'desc',
      }),
    enabled: open,
  })

  const suggestions = useMemo(() => {
    const credits = (data?.data ?? []).filter(
      (txn) =>
        txn.transactionType === 'credited'
        && txn.id !== debit.id
        && !txn.transactionAttributes?.linkedReimbursementTxnId,
    )

    return [...credits]
      .sort((a, b) => {
        const scoreA = amountProximityScore(debit.amount, a.amount)
        const scoreB = amountProximityScore(debit.amount, b.amount)
        if (scoreA !== scoreB) return scoreA - scoreB
        return b.transactionDate.localeCompare(a.transactionDate)
      })
      .slice(0, 12)
  }, [data?.data, debit.amount, debit.id])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return suggestions
    return suggestions.filter(
      (txn) =>
        txn.merchant.toLowerCase().includes(q)
        || txn.amount.toString().includes(q),
    )
  }, [suggestions, search])

  const handleConfirmLink = () => {
    if (!selectedId) return
    onLink(selectedId)
    onOpenChange(false)
    setSelectedId(null)
    setSearch('')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setSelectedId(null)
          setSearch('')
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link repayment</DialogTitle>
          <DialogDescription>
            Optionally pair a credit that repaid{' '}
            <span className="font-medium text-foreground">
              {debit.merchant}
            </span>{' '}
            ({debit.currency} {debit.amount.toLocaleString('en-IN')} on {debitDate}).
            You can skip this and link later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-2">
            <Label htmlFor="repayment-search">Search credits</Label>
            <Input
              id="repayment-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Merchant or amount"
            />
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))
            ) : filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No matching credits found. You can mark settled without linking.
              </p>
            ) : (
              filtered.map((txn) => {
                const selected = selectedId === txn.id
                const closeAmount =
                  amountProximityScore(debit.amount, txn.amount) < 0.02
                return (
                  <button
                    key={txn.id}
                    type="button"
                    onClick={() => setSelectedId(txn.id)}
                    className={cn(
                      'flex w-full items-start justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent hover:bg-muted/60',
                    )}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate font-medium">{txn.merchant}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(txn.transactionDate), 'dd MMM yyyy')}
                        {' · '}
                        {txn.transactionMode.replace(/_/g, ' ')}
                        {closeAmount ? ' · amount match' : null}
                      </p>
                    </div>
                    <span className="shrink-0 tabular-nums text-positive">
                      +{txn.currency} {txn.amount.toLocaleString('en-IN')}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onSkip()
                onOpenChange(false)
              }}
            >
              Skip
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onMarkSettledWithoutLink()
                onOpenChange(false)
              }}
            >
              Mark settled
            </Button>
          </div>
          <Button
            type="button"
            disabled={!selectedId}
            onClick={handleConfirmLink}
          >
            Link selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
