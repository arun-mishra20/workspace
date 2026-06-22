import {
  CATEGORY_OPTIONS,
  SUBCATEGORY_OPTIONS,
} from '@/features/expenses/constants/category-options'
import { getChartTokenColor } from '@/features/expenses/components/analytics/analytics-utils'

export type CategoryMeta = (typeof CATEGORY_OPTIONS)[number]

export function getCategoryMeta(category: string): CategoryMeta | undefined {
  return CATEGORY_OPTIONS.find((option) => option.value === category)
}

export function getCategoryLabel(category: string): string {
  return getCategoryMeta(category)?.label ?? category.replace(/_/g, ' ')
}

export function getCategoryColor(
  category: string,
  fallbackIndex = 0,
): string {
  return (
    getCategoryMeta(category)?.color ?? getChartTokenColor(fallbackIndex)
  )
}

export function getSubcategoryParentCategory(subcategory: string): string | undefined {
  return SUBCATEGORY_OPTIONS.find((option) => option.value === subcategory)?.parent
}
