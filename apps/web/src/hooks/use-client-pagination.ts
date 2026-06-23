import { useEffect, useMemo, useState } from 'react'

import {
  DEFAULT_PAGE_SIZE,
  getTotalPages,
  readStoredPageSize,
  writeStoredPageSize,
} from '@/lib/pagination'

interface UseClientPaginationOptions {
  initialPageSize?: number
  persistPageSize?: boolean
}

export function useClientPagination<T>(
  items: T[],
  options: UseClientPaginationOptions = {},
) {
  const {
    initialPageSize = readStoredPageSize(DEFAULT_PAGE_SIZE),
    persistPageSize = true,
  } = options

  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(initialPageSize)

  const totalItems = items.length
  const totalPages = getTotalPages(totalItems, pageSize)

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [items.length, pageSize])

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  const setPageSize = (nextPageSize: number) => {
    setPageSizeState(nextPageSize)
    if (persistPageSize) {
      writeStoredPageSize(nextPageSize)
    }
    setPage(1)
  }

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
    setPage,
    setPageSize,
  }
}
