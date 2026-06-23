import { CategoryIcon } from '@/features/expenses/components/category-icon'
import { getCategoryLabel } from '@/features/expenses/lib/category-meta'

interface CategorySelectOptionProps {
  category: string
}

export function CategorySelectOption({ category }: CategorySelectOptionProps) {
  return (
    <span className="flex items-center gap-2">
      <CategoryIcon category={category} size={12} />
      {getCategoryLabel(category)}
    </span>
  )
}
