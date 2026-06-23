import type { Table as TanstackTable } from '@tanstack/react-table'
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

import {
  DEFAULT_PAGE_SIZE,
  getPageItemRange,
  getPaginationRange,
  getTotalPages,
  PAGE_SIZE_OPTIONS,
} from '@/lib/pagination'
import { cn } from '@/lib/utils'
import { Button } from '@workspace/ui/components/ui/button'
import { Label } from '@workspace/ui/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@workspace/ui/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/ui/select'

type DataTablePaginationBaseProps = {
  totalItems: number
  itemLabel?: string
  pageSizeOptions?: readonly number[]
  className?: string
}

type DataTablePaginationControlledProps = DataTablePaginationBaseProps & {
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  table?: never
}

type DataTablePaginationTableProps<TData> = DataTablePaginationBaseProps & {
  table: TanstackTable<TData>
  onPageSizeChange?: (pageSize: number) => void
  page?: never
  pageSize?: never
  onPageChange?: never
}

export type DataTablePaginationProps<TData = unknown> =
  | DataTablePaginationControlledProps
  | DataTablePaginationTableProps<TData>

export function DataTablePagination<TData>(
  props: DataTablePaginationProps<TData>,
) {
  const {
    totalItems,
    itemLabel = 'results',
    pageSizeOptions = PAGE_SIZE_OPTIONS,
    className,
  } = props

  const page = props.table
    ? props.table.getState().pagination.pageIndex + 1
    : props.page
  const pageSize = props.table
    ? props.table.getState().pagination.pageSize
    : props.pageSize
  const totalPages = props.table
    ? Math.max(1, props.table.getPageCount())
    : getTotalPages(totalItems, pageSize)

  const { start, end } = getPageItemRange(page, pageSize, totalItems)
  const pageRange = getPaginationRange(page, totalPages)

  if (totalItems === 0) {
    return null
  }

  const goToPage = (nextPage: number) => {
    const clampedPage = Math.min(Math.max(nextPage, 1), totalPages)

    if (props.table) {
      props.table.setPageIndex(clampedPage - 1)
      return
    }

    props.onPageChange(clampedPage)
  }

  const changePageSize = (nextPageSize: number) => {
    if (props.table) {
      props.table.setPageSize(nextPageSize)
      props.table.setPageIndex(0)
      props.onPageSizeChange?.(nextPageSize)
      return
    }

    props.onPageSizeChange(nextPageSize)
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        Showing{' '}
        <span className="font-medium text-foreground tabular-nums">{start}</span>
        {' to '}
        <span className="font-medium text-foreground tabular-nums">{end}</span>
        {' of '}
        <span className="font-medium text-foreground tabular-nums">
          {totalItems.toLocaleString()}
        </span>{' '}
        {itemLabel}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="table-page-size" className="text-sm text-muted-foreground">
            Rows per page
          </Label>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => changePageSize(Number(value))}
          >
            <SelectTrigger id="table-page-size" className="h-8 w-[4.5rem]" size="sm">
              <SelectValue placeholder={String(DEFAULT_PAGE_SIZE)} />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="Go to first page"
                disabled={page <= 1}
                onClick={() => goToPage(1)}
              >
                <ChevronFirst className="size-4" />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="Go to previous page"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
            </PaginationItem>

            {pageRange.map((item, index) =>
              item === 'ellipsis' ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <Button
                    type="button"
                    variant={item === page ? 'default' : 'outline'}
                    size="icon"
                    className="size-8 tabular-nums"
                    aria-label={`Go to page ${item}`}
                    aria-current={item === page ? 'page' : undefined}
                    onClick={() => goToPage(item)}
                  >
                    {item}
                  </Button>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="Go to next page"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="Go to last page"
                disabled={page >= totalPages}
                onClick={() => goToPage(totalPages)}
              >
                <ChevronLast className="size-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
