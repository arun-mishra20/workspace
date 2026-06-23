import { CategoryIcon } from '@/features/expenses/components/category-icon'
import {
  getCategoryColor,
  getCategoryLabel,
} from '@/features/expenses/lib/category-meta'
import { cn } from '@/lib/utils'

const TILE_SIZE = {
  sm: {
    container: 'size-7',
    icon: 12,
  },
  md: {
    container: 'size-9',
    icon: 16,
  },
} as const

interface TransactionCategoryTileProps {
  category: string
  size?: keyof typeof TILE_SIZE
  className?: string
  srLabel?: string
}

export function TransactionCategoryTile({
  category,
  size = 'md',
  className,
  srLabel,
}: TransactionCategoryTileProps) {
  const categoryColor = getCategoryColor(category)
  const categoryLabel = srLabel ?? getCategoryLabel(category)
  const { container, icon } = TILE_SIZE[size]

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg border border-border/50',
        container,
        className,
      )}
      style={{
        backgroundColor: `color-mix(in srgb, ${categoryColor} 16%, transparent)`,
      }}
      {...(srLabel
        ? { 'aria-label': categoryLabel }
        : { 'aria-hidden': true })}
    >
      <CategoryIcon category={category} size={icon} />
    </div>
  )
}
