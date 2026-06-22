import type {
  CardCategoryItem,
  CreditCardProfile,
  MilestoneEta,
  SpendingByCardItem,
} from '@workspace/domain'

import { CardCategoryBreakdown } from '@/features/expenses/components/analytics/card-category-breakdown'
import { AnalyticsSectionCard } from '@/features/expenses/components/analytics/analytics-section-card'
import { SpendingByCardSection } from '@/features/expenses/components/analytics/spending-by-card-section'
import { MilestoneEtaSection } from '@/features/expenses/components/milestone-eta-section'
import { CreditCard } from 'lucide-react'
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <SpendingByCardSection
        cards={cards}
        cardSpend={cardSpend}
        selectedCardLast4={selectedCardLast4}
        loading={cardSpendLoading}
      />

      {milestoneEtas && cards.length > 0 && (
        <MilestoneEtaSection
          etas={milestoneEtas}
          cards={cards}
          headerSelectedCardLast4={selectedCardLast4}
        />
      )}

      <AnalyticsSectionCard
        title="Card × Category"
        description="What you spend on per card"
        icon={CreditCard}
      >
        {cardCategoriesLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : filteredCategories.length > 0 ? (
          <CardCategoryBreakdown data={filteredCategories} cards={cards} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No card category data.
          </p>
        )}
      </AnalyticsSectionCard>
    </div>
  )
}
