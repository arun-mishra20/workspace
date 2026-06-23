export const PAGE_SIZE_OPTIONS = [10, 20, 25, 50, 100] as const

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

export const DEFAULT_PAGE_SIZE = 20

export const PAGE_SIZE_STORAGE_KEY = 'app-table-page-size'

export function isPageSizeOption(value: number): value is PageSizeOption {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(value)
}

export function readStoredPageSize(fallback = DEFAULT_PAGE_SIZE): number {
  try {
    const raw = localStorage.getItem(PAGE_SIZE_STORAGE_KEY)
    if (!raw) {
      return fallback
    }

    const parsed = Number(raw)
    return isPageSizeOption(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

export function writeStoredPageSize(pageSize: number) {
  try {
    localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize))
  } catch {
    // ignore storage failures
  }
}

export function getPageItemRange(
  page: number,
  pageSize: number,
  totalItems: number,
) {
  if (totalItems === 0) {
    return { start: 0, end: 0 }
  }

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)
  return { start, end }
}

export function getTotalPages(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize))
}

export function getPaginationRange(
  currentPage: number,
  totalPages: number,
  siblingCount = 1,
): Array<number | 'ellipsis'> {
  if (totalPages <= 1) {
    return [1]
  }

  const totalPageNumbers = siblingCount * 2 + 5

  if (totalPages <= totalPageNumbers) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)

  const showLeftEllipsis = leftSiblingIndex > 2
  const showRightEllipsis = rightSiblingIndex < totalPages - 1

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount
    const leftRange = Array.from({ length: leftItemCount }, (_, index) => index + 1)
    return [...leftRange, 'ellipsis', totalPages]
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightItemCount = 3 + 2 * siblingCount
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, index) => totalPages - rightItemCount + index + 1,
    )
    return [1, 'ellipsis', ...rightRange]
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, index) => leftSiblingIndex + index,
  )

  return [1, 'ellipsis', ...middleRange, 'ellipsis', totalPages]
}
