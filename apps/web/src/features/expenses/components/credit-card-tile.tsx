import type { CreditCardProfile } from '@workspace/domain'
import { Check } from 'lucide-react'

import { getCreditCardImage } from '@/features/expenses/constants/credit-card-assets'
import { cn } from '@/lib/utils'
import { Badge } from '@workspace/ui/components/ui/badge'

interface CreditCardTileProps {
  card: CreditCardProfile
  isSelected?: boolean
  onClick?: () => void
  /** Compact thumbnail for the filter trigger */
  compact?: boolean
  className?: string
}

export function CreditCardTile({
  card,
  isSelected = false,
  onClick,
  compact = false,
  className,
}: CreditCardTileProps) {
  const isUpgraded = card.status === 'upgraded'
  const imageSrc = getCreditCardImage(card.imageKey)

  if (compact) {
    return (
      <div
        className={cn(
          'relative aspect-[1.586/1] w-8 shrink-0 overflow-hidden rounded border bg-muted',
          isUpgraded && 'grayscale',
          className,
        )}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[8px] text-muted-foreground">
            ••
          </div>
        )}
      </div>
    )
  }

  const content = (
    <>
      <div
        className={cn(
          'relative aspect-[1.586/1] w-full overflow-hidden rounded-lg border bg-muted shadow-sm',
          isUpgraded && 'grayscale',
        )}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={card.cardName}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted text-xs text-muted-foreground">
            {card.cardName}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5">
          <p className="truncate text-left text-[10px] font-medium text-white">
            {card.cardName}
          </p>
          <p className="text-left text-[9px] text-white/80">••{card.cardLast4}</p>
        </div>
        {isUpgraded && (
          <div className="absolute inset-x-0 top-0 p-1.5">
            <Badge
              variant="secondary"
              className="h-4 px-1 text-[8px] font-normal leading-none shadow-sm"
            >
              Upgraded · not in use
            </Badge>
          </div>
        )}
        {isSelected && (
          <div className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Check className="size-3" strokeWidth={3} />
          </div>
        )}
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        aria-pressed={isSelected}
        aria-label={`Filter by ${card.cardName} ending ${card.cardLast4}`}
        onClick={onClick}
        className={cn(
          'rounded-lg text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isSelected && 'ring-2 ring-primary ring-offset-1',
          className,
        )}
      >
        {content}
      </button>
    )
  }

  return <div className={className}>{content}</div>
}
