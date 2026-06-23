import { format, parseISO, subDays } from 'date-fns'
import { ArrowDownRight, ArrowUpRight, Calendar, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import { TransactionCategoryTile } from '@/features/expenses/components/transaction-category-tile'
import { TransactionMetadataBadges } from '@/features/expenses/components/analytics/transaction-metadata-badges'
import { getCategoryLabel } from '@/features/expenses/lib/category-meta'
import { SummaryCard } from '@/features/expenses/components/analytics/summary-card'
import type { Transaction } from '@workspace/domain'
import { Badge } from '@workspace/ui/components/ui/badge'
import { Button } from '@workspace/ui/components/ui/button'
import { Calendar as CalendarPicker } from '@workspace/ui/components/ui/calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/ui/popover'
import { Separator } from '@workspace/ui/components/ui/separator'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/ui/tabs'
import { cn } from '@/lib/utils'

interface DaySpendExplorerSectionProps {
  periodLabel?: string
  selectedDate: string
  onSelectedDateChange: (date: string) => void
  summary?: {
    totalSpent: number
    totalReceived: number
    netFlow: number
    transactionCount: number
  }
  transactionsTotal: number
  spentTransactions: Transaction[]
  receivedTransactions: Transaction[]
  loading: boolean
  selectedCardLast4?: string
  viewAllHref?: string
}

export function DaySpendExplorerSection({
  periodLabel,
  selectedDate,
  onSelectedDateChange,
  summary,
  transactionsTotal,
  spentTransactions,
  receivedTransactions,
  loading,
  viewAllHref,
}: DaySpendExplorerSectionProps) {
  const recentDatePresets = Array.from({ length: 7 }, (_, index) => {
    const date = subDays(new Date(), index)

    let label: string
    if (index === 0) {
      label = 'Today'
    } else if (index === 1) {
      label = 'Yesterday'
    } else {
      label = format(date, 'do MMM')
    }

    return {
      value: format(date, 'yyyy-MM-dd'),
      label,
    }
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Explore a day</CardTitle>
            <CardDescription>
              Drill into a single day&apos;s transactions.
              {periodLabel ? (
                <span className="block text-xs">
                  Within selected period: {periodLabel}
                </span>
              ) : null}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {viewAllHref && (
              <Button variant="outline" size="sm" asChild>
                <Link to={viewAllHref}>
                  View all
                  <ExternalLink className="ml-1.5 size-3.5" />
                </Link>
              </Button>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start font-normal">
                  <Calendar className="mr-2 size-4" />
                  {format(parseISO(selectedDate), 'dd MMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-3">
                <CalendarPicker
                  mode="single"
                  selected={parseISO(selectedDate)}
                  onSelect={(date) => {
                    if (!date) return
                    onSelectedDateChange(format(date, 'yyyy-MM-dd'))
                  }}
                  disabled={(date) => date > new Date()}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <Separator className="w-full mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {recentDatePresets.map((preset) => (
            <Button
              key={preset.value}
              variant={preset.value === selectedDate ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelectedDateChange(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <SummaryCard
            title="Spent That Day"
            value={summary ? fmtCurrency(summary.totalSpent) : undefined}
            icon={<ArrowDownRight className="size-4 text-destructive" />}
            subtitle={
              summary
                ? `${spentTransactions.length} outgoing transactions`
                : undefined
            }
            loading={loading}
          />
          <SummaryCard
            title="Received That Day"
            value={summary ? fmtCurrency(summary.totalReceived) : undefined}
            icon={<ArrowUpRight className="size-4 text-chart-2" />}
            subtitle={
              summary ? `Net: ${fmtCurrency(summary.netFlow)}` : undefined
            }
            loading={loading}
          />
        </div>

        <Tabs defaultValue="spent" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="spent">
                Spent ({spentTransactions.length})
              </TabsTrigger>
              <TabsTrigger value="received">
                Received ({receivedTransactions.length})
              </TabsTrigger>
            </TabsList>

            <Badge variant="outline">
              {transactionsTotal} transactions on{' '}
              {format(parseISO(selectedDate), 'dd MMM yyyy')}
            </Badge>
          </div>

          <TabsContent value="spent" className="mt-0">
            <DayTransactionsList
              transactions={spentTransactions}
              loading={loading}
              emptyMessage="No spending transactions for this date."
              amountClassName="text-destructive"
            />
          </TabsContent>

          <TabsContent value="received" className="mt-0">
            <DayTransactionsList
              transactions={receivedTransactions}
              loading={loading}
              emptyMessage="No received transactions for this date."
              amountClassName="text-chart-2"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function DayTransactionsList({
  transactions,
  loading,
  emptyMessage,
  amountClassName,
}: {
  transactions: Transaction[]
  loading: boolean
  emptyMessage: string
  amountClassName: string
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="divide-y rounded-lg border">
      {transactions.map((transaction) => {
        const categoryLabel = getCategoryLabel(transaction.category)

        return (
        <div
          key={transaction.id}
          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <TransactionCategoryTile category={transaction.category} />

            <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{transaction.merchant}</p>
              <Badge variant="outline" className="text-xs capitalize">
                {transaction.subcategory ||
                  transaction.category.replace(/_/g, ' ')}
              </Badge>
              <Badge variant="secondary" className="text-xs uppercase">
                {transaction.transactionMode.replace(/_/g, ' ')}
              </Badge>
            </div>
            <TransactionMetadataBadges transaction={transaction} compact />
            <p className="text-xs text-muted-foreground">
              <span className="sr-only">Category: {categoryLabel}. </span>
              {(() => {
                try {
                  return format(
                    parseISO(transaction.transactionDate),
                    'dd MMM yyyy',
                  )
                } catch {
                  return transaction.transactionDate
                }
              })()}
            </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
            <p
              className={cn(
                'text-sm font-semibold tabular-nums',
                amountClassName,
              )}
            >
              {fmtCurrency(transaction.amount)}
            </p>
            {transaction.cardLast4 ? (
              <p className="text-xs text-muted-foreground">
                ••{transaction.cardLast4}
              </p>
            ) : null}
          </div>
        </div>
        )
      })}
    </div>
  )
}
