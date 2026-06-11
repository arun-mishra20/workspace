import type {
  CardCategoryItem,
  CreditCardProfile,
  MilestoneEta,
  SpendingByCardItem,
} from '@workspace/domain'
import { CreditCard } from 'lucide-react'

import { CardCategoryBreakdown } from '@/features/expenses/components/analytics/card-category-breakdown'
import { SpendingByCardSection } from '@/features/expenses/components/analytics/spending-by-card-section'
import { MilestoneEtaSection } from '@/features/expenses/components/milestone-eta-section'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import { Separator } from '@workspace/ui/components/ui/separator'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'

interface AnalyticsCardsTabProps {
  cards: CreditCardProfile[]
  cardSpend: SpendingByCardItem[]
  cardSpendLoading: boolean
  selectedCardLast4?: string
  milestoneEtas?: MilestoneEta[]
  cardCategories?: CardCategoryItem[]
  cardCategoriesLoading: boolean
}

export function AnalyticsCardsTab({
  cards,
  cardSpend,
  cardSpendLoading,
  selectedCardLast4,
  milestoneEtas,
  cardCategories,
  cardCategoriesLoading,
}: AnalyticsCardsTabProps) {
  const filteredCategories = selectedCardLast4
    ? (cardCategories ?? []).filter(
        (item) => item.cardLast4 === selectedCardLast4,
      )
    : (cardCategories ?? [])

  return (
    <div className="flex flex-col gap-6">
      <SpendingByCardSection
        cards={cards}
        cardSpend={cardSpend}
        selectedCardLast4={selectedCardLast4}
        loading={cardSpendLoading}
      />

      {milestoneEtas && cards.length > 0 && (
        <MilestoneEtaSection etas={milestoneEtas} cards={cards} />
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Card × Category</CardTitle>
              <CardDescription>What you spend on per card</CardDescription>
            </div>
          </div>
          <Separator className="w-full mt-2" />
        </CardHeader>
        <CardContent>
          {cardCategoriesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : filteredCategories.length > 0 ? (
            <CardCategoryBreakdown data={filteredCategories} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No card category data.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
