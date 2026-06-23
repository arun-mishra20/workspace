import type { CardCategoryItem, CreditCardProfile } from '@workspace/domain'

import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import { CategoryIcon } from '@/features/expenses/components/category-icon'
import { CreditCardTile } from '@/features/expenses/components/credit-card-tile'
import { getCategoryColor } from '@/features/expenses/lib/category-meta'
import { Badge } from '@workspace/ui/components/ui/badge'

interface CardCategoryBreakdownProps {
  data: CardCategoryItem[]
  cards: CreditCardProfile[]
}

export function CardCategoryBreakdown({ data, cards }: CardCategoryBreakdownProps) {
  const cardByLast4 = new Map(cards.map((card) => [card.cardLast4, card]))

  const byCard = new Map<
    string,
    { cardName: string; items: CardCategoryItem[] }
  >()

  for (const item of data) {
    if (!byCard.has(item.cardLast4)) {
      byCard.set(item.cardLast4, { cardName: item.cardName, items: [] })
    }
    byCard.get(item.cardLast4)!.items.push(item)
  }

  return (
    <div className="space-y-4">
      {[...byCard.entries()].map(([last4, { cardName, items }]) => {
        const total = items.reduce((sum, item) => sum + item.amount, 0)
        const cardProfile = cardByLast4.get(last4)

        return (
          <div key={last4} className="space-y-2">
            <div className="flex items-center gap-2">
              {cardProfile ? <CreditCardTile card={cardProfile} compact /> : null}
              <span className="text-sm font-medium">{cardName}</span>
              <Badge variant="outline" className="text-[10px]">
                ••{last4}
              </Badge>
              <span className="ml-auto text-sm font-semibold tabular-nums">
                {fmtCurrency(total)}
              </span>
            </div>
            <div className="ml-5 space-y-1.5">
              {items.map((item) => {
                const pct = total > 0 ? (item.amount / total) * 100 : 0
                const color = getCategoryColor(item.category)
                return (
                  <div key={item.category} className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        <CategoryIcon category={item.category} size={12} />
                        <span className="capitalize text-foreground/80">
                          {item.displayName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="text-[10px] tabular-nums"
                        >
                          {item.count}
                        </Badge>
                        <span className="min-w-16 text-right tabular-nums font-medium">
                          {fmtCurrency(item.amount)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
