import type { SortingState } from '@tanstack/react-table'

export type SortOrder = 'asc' | 'desc'

export const EXPENSE_SORT_FIELDS = [
  'transactionDate',
  'merchant',
  'amount',
  'category',
  'subcategory',
  'transactionMode',
  'categorizationMethod',
  'confidence',
  'requiresReview',
] as const

export type ExpenseSortField = (typeof EXPENSE_SORT_FIELDS)[number]

export const EMAIL_SORT_FIELDS = [
  'from',
  'subject',
  'receivedAt',
  'provider',
] as const

export type EmailSortField = (typeof EMAIL_SORT_FIELDS)[number]

function isExpenseSortField(value: string): value is ExpenseSortField {
  return (EXPENSE_SORT_FIELDS as readonly string[]).includes(value)
}

function isEmailSortField(value: string): value is EmailSortField {
  return (EMAIL_SORT_FIELDS as readonly string[]).includes(value)
}

export function parseExpenseSorting(searchParams: URLSearchParams): SortingState {
  const sortBy = searchParams.get('sort_by')
  const sortOrder = searchParams.get('sort_order')

  if (sortBy && isExpenseSortField(sortBy)) {
    return [{ id: sortBy, desc: sortOrder !== 'asc' }]
  }

  return [{ id: 'transactionDate', desc: true }]
}

export function parseEmailSorting(searchParams: URLSearchParams): SortingState {
  const sortBy = searchParams.get('sort_by')
  const sortOrder = searchParams.get('sort_order')

  if (sortBy && isEmailSortField(sortBy)) {
    return [{ id: sortBy, desc: sortOrder !== 'asc' }]
  }

  return [{ id: 'receivedAt', desc: true }]
}

export function sortingToQueryParams(
  sorting: SortingState,
  defaults: { id: string; desc: boolean },
): { sort_by?: string; sort_order?: SortOrder } {
  const active = sorting[0]
  if (!active) {
    return {}
  }

  if (active.id === defaults.id && active.desc === defaults.desc) {
    return {}
  }

  return {
    sort_by: active.id,
    sort_order: active.desc ? 'desc' : 'asc',
  }
}
