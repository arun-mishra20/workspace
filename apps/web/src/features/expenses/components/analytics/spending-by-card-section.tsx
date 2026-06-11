import type { CreditCardProfile, SpendingByCardItem } from '@workspace/domain'
import { CreditCard } from 'lucide-react'

import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import { cn } from '@/lib/utils'
import { Badge } from '@workspace/ui/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import { Separator } from '@workspace/ui/components/ui/separator'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/ui/table'

interface SpendingByCardSectionProps {
  cards: CreditCardProfile[]
  cardSpend: SpendingByCardItem[]
  selectedCardLast4?: string
  loading: boolean
}

export function SpendingByCardSection({
  cards,
  cardSpend,
  selectedCardLast4,
  loading,
}: SpendingByCardSectionProps) {
  const spendByLast4 = new Map(cardSpend.map((row) => [row.cardLast4, row]))

  const visibleCards = (selectedCardLast4
    ? cards.filter((card) => card.cardLast4 === selectedCardLast4)
    : cards
  ).sort((a, b) => {
    const amountA = spendByLast4.get(a.cardLast4)?.amount ?? 0
    const amountB = spendByLast4.get(b.cardLast4)?.amount ?? 0
    return amountB - amountA
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-muted-foreground" />
          <div>
            <CardTitle className="text-base">Spending by Card</CardTitle>
            <CardDescription>
              Period spend across your credit cards
            </CardDescription>
          </div>
        </div>
        <Separator className="w-full mt-2" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : visibleCards.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Card</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleCards.map((card) => {
                const spend = spendByLast4.get(card.cardLast4)
                const isArchived = card.status === 'upgraded'
                return (
                  <TableRow
                    key={card.cardLast4}
                    className={cn(isArchived && 'opacity-75')}
                  >
                    <TableCell>
                      <div className="font-medium">{card.cardName}</div>
                      <div className="text-xs text-muted-foreground">
                        ••{card.cardLast4}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {card.bank}
                    </TableCell>
                    <TableCell>
                      {isArchived ? (
                        <Badge variant="outline" className="text-[10px]">
                          Archived
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {spend?.count ?? 0}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {fmtCurrency(spend?.amount ?? 0)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No card spending data for this period.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
