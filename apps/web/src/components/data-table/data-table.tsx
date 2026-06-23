import { flexRender, type Row, type Table as TanstackTable } from '@tanstack/react-table'

import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/ui/table'

interface DataTableProps<TData> {
  table: TanstackTable<TData>
  emptyMessage?: string
  onRowClick?: (row: Row<TData>) => void
  getRowClassName?: (row: Row<TData>) => string
}

export function DataTable<TData>({
  table,
  emptyMessage = 'No results.',
  onRowClick,
  getRowClassName,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            data-state={row.getIsSelected() ? 'selected' : undefined}
            className={cn(
              onRowClick && 'cursor-pointer hover:bg-muted/40',
              getRowClassName?.(row),
            )}
            role={onRowClick ? 'link' : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onClick={
              onRowClick
                ? () => {
                    onRowClick(row)
                  }
                : undefined
            }
            onKeyDown={
              onRowClick
                ? (event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') {
                      return
                    }
                    event.preventDefault()
                    onRowClick(row)
                  }
                : undefined
            }
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
