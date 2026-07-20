import { useState } from 'react'
import type { CreditCardProfile } from '@workspace/domain'
import { Check, ChevronDown, CreditCard } from 'lucide-react'

import { CreditCardTile } from '@/features/expenses/components/credit-card-tile'
import { cn } from '@/lib/utils'
import { Badge } from '@workspace/ui/components/ui/badge'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/ui/popover'

interface CreditCardFilterProps {
  cards: CreditCardProfile[]
  selectedLast4?: string
  onSelect: (last4: string | undefined) => void
  className?: string
}

function partitionCards(cards: CreditCardProfile[]) {
  const active = cards.filter((card) => card.status !== 'upgraded')
  const archived = cards.filter((card) => card.status === 'upgraded')
  return { active, archived }
}

export function CreditCardFilter({
  cards,
  selectedLast4,
  onSelect,
  className,
}: CreditCardFilterProps) {
  const [open, setOpen] = useState(false)

  if (cards.length === 0) return null

  const selectedCard = cards.find((card) => card.cardLast4 === selectedLast4)
  const { active, archived } = partitionCards(cards)

  const handleSelect = (last4: string | undefined) => {
    onSelect(last4)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-9 min-w-0 justify-between gap-2 px-3 text-xs font-normal',
            selectedCard ? 'min-w-44' : 'w-40',
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selectedCard ? (
              <>
                <CreditCardTile card={selectedCard} compact />
                <span className="truncate">
                  {selectedCard.cardName} ••{selectedCard.cardLast4}
                </span>
                {selectedCard.status === 'upgraded' && (
                  <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[9px]">
                    Archived
                  </Badge>
                )}
              </>
            ) : (
              <>
                <CreditCard className="size-3.5 shrink-0 text-muted-foreground" />
                <span>All Cards</span>
              </>
            )}
          </span>
          <ChevronDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <button
          type="button"
          onClick={() => handleSelect(undefined)}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent',
            !selectedLast4 && 'bg-accent',
          )}
        >
          <CreditCard className="size-4 text-muted-foreground" />
          <span className="flex-1 font-medium">All Cards</span>
          {!selectedLast4 && <Check className="size-4 text-primary" />}
        </button>

        {active.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Active
            </p>
            <div className="grid grid-cols-2 gap-2">
              {active.map((card) => (
                <CreditCardTile
                  key={card.cardLast4}
                  card={card}
                  isSelected={selectedLast4 === card.cardLast4}
                  onClick={() => handleSelect(card.cardLast4)}
                />
              ))}
            </div>
          </div>
        )}

        {archived.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Archived
            </p>
            <div className="grid grid-cols-2 gap-2">
              {archived.map((card) => (
                <CreditCardTile
                  key={card.cardLast4}
                  card={card}
                  isSelected={selectedLast4 === card.cardLast4}
                  onClick={() => handleSelect(card.cardLast4)}
                />
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
