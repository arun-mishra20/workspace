import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { format } from 'date-fns'

import { MainLayout } from '@/components/layouts'
import { readStoredPageSize, writeStoredPageSize } from '@/lib/pagination'
import {
  DataTable,
  DataTablePagination,
  SortableColumnHeader,
} from '@/components/data-table'
import { connectGmail } from '@/features/expenses/api/connect-gmail'
import { disconnectGmail } from '@/features/expenses/api/disconnect-gmail'
import { fetchGmailStatus } from '@/features/expenses/api/gmail-status'
import { listExpenseEmails } from '@/features/expenses/api/list-expense-emails'
import { listExpenses } from '@/features/expenses/api/list-expenses'
import {
  updateTransaction,
  type UpdateTransactionInput,
} from '@/features/expenses/api/update-transaction'
import { useSyncJob } from '@/features/expenses/hooks/use-sync-job'
import { MerchantCategorizeDialog } from '@/features/expenses/components/merchant-categorize-dialog'
import { BulkActionsToolbar } from '@/features/expenses/components/bulk-actions-toolbar'
import { CreditCardFilter } from '@/features/expenses/components/credit-card-filter'
import { LlmCategorizeDialog } from '@/features/expenses/components/llm-categorize-dialog'
import { fetchCreditCards } from '@/features/expenses/api/credit-cards'
import {
  CATEGORY_OPTIONS,
  getSubcategoryLabel,
  SUBCATEGORY_OPTIONS,
} from '@/features/expenses/constants/category-options'
import { Badge } from '@workspace/ui/components/ui/badge'
import { Button } from '@workspace/ui/components/ui/button'
import { Calendar } from '@workspace/ui/components/ui/calendar'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@workspace/ui/components/ui/alert'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import { Checkbox } from '@workspace/ui/components/ui/checkbox'
import { Input } from '@workspace/ui/components/ui/input'
import { Label } from '@workspace/ui/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/ui/sheet'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/ui/tabs'
import {
  Dot,
  MailSearch,
  MoreVertical,
  Pencil,
  RotateCw,
  RefreshCcw,
  Unplug,
  AlertTriangle,
  Sparkles,
  IndianRupee,
  Send,
  ArrowLeft,
  CreditCard,
} from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { appPaths } from '@/config/app-paths'
import type { Transaction } from '@workspace/domain'
import {
  SelectFilter,
  DateRangeFilter,
  SearchFilter,
  type FilterOption,
} from '@/components/filters'
import { useDebounce } from '@/hooks/use-debounce'
import { Separator } from '@workspace/ui/components/ui/separator'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'
import { cn } from '@workspace/ui/lib/utils'
import {
  parseEmailSorting,
  parseExpenseSorting,
  sortingToQueryParams,
} from '@/lib/table-sort'

const TRANSACTION_TYPES = ['debited', 'credited'] as const
const TRANSACTION_MODES = [
  'upi',
  'credit_card',
  'neft',
  'imps',
  'rtgs',
] as const
import { getCategoryMeta } from '@/features/expenses/lib/category-meta'
import { CategoryIcon } from '@/features/expenses/components/category-icon'
import { CategorySelectOption } from '@/features/expenses/components/category-select-option'
import { TransactionCategoryTile } from '@/features/expenses/components/transaction-category-tile'

const CATEGORY_FILTER_OPTIONS: FilterOption[] = CATEGORY_OPTIONS.map((c) => ({
  value: c.value,
  label: c.label,
  categoryIcon: true,
}))

const MODE_FILTER_OPTIONS: FilterOption[] = TRANSACTION_MODES.map((m) => ({
  value: m,
  label: m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
}))

const REVIEW_FILTER_OPTIONS: FilterOption[] = [
  { value: 'true', label: 'Needs Review' },
  { value: 'false', label: 'Reviewed' },
]

const CATEGORIZATION_METHOD_FILTER_OPTIONS: FilterOption[] = [
  { value: 'default', label: 'Default' },
  { value: 'manual', label: 'Manual' },
  { value: 'merchant_rule', label: 'Merchant Rule' },
  { value: 'vpa_rule', label: 'VPA Rule' },
  { value: 'neft_rule', label: 'NEFT Rule' },
  { value: 'user_rule', label: 'User Rule' },
]

const SUBCATEGORY_FILTER_OPTIONS: FilterOption[] = SUBCATEGORY_OPTIONS.map(
  (option) => ({
    value: option.value,
    label: option.label,
  }),
)

type ExpenseView = 'expense' | 'emails'

type RawEmail = {
  id: string
  userId: string
  provider: string
  providerMessageId: string
  from: string
  subject: string
  receivedAt: string
  bodyText: string
  bodyHtml?: string
  rawHeaders: Record<string, string>
}

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return format(date, "MMM d, yyyy 'at' h:mm a")
}

const formatAmount = (transaction: Transaction) => {
  const signedAmount =
    transaction.transactionType === 'debited'
      ? -Math.abs(transaction.amount)
      : Math.abs(transaction.amount)

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: transaction.currency,
    }).format(signedAmount)
  } catch {
    const sign = signedAmount < 0 ? '-' : ''
    return `${sign}${transaction.currency} ${Math.abs(signedAmount).toFixed(2)}`
  }
}

const emailColumns: ColumnDef<RawEmail>[] = [
  {
    accessorKey: 'from',
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="From" />
    ),
    cell: ({ row }) => (
      <div className="font-medium text-foreground">
        {row.getValue('from') || 'Unknown sender'}
      </div>
    ),
  },
  {
    accessorKey: 'subject',
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Subject" />
    ),
    cell: ({ row }) => (
      <div className="max-w-125 truncate">
        {row.getValue('subject') || '(no subject)'}
      </div>
    ),
  },
  {
    accessorKey: 'receivedAt',
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Received" />
    ),
    cell: ({ row }) => formatDate(row.getValue('receivedAt')),
  },
  {
    accessorKey: 'provider',
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Provider" />
    ),
    cell: ({ row }) => (
      <Badge variant="secondary" className="capitalize">
        {row.getValue('provider')}
      </Badge>
    ),
  },
]

const buildExpenseColumns = (
  onEdit: (transaction: Transaction) => void,
): ColumnDef<Transaction>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={
          table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'transactionDate',
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => formatDate(row.original.transactionDate),
  },
  {
    accessorKey: 'merchant',
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Merchant" />
    ),
    cell: ({ row }) => (
      <div className="flex gap-2 items-center max-w-72">
        <TransactionCategoryTile category={row.original.category} size="sm" />
        <div className="min-w-0 flex flex-col gap-1">
          <div className="font-medium text-foreground truncate">
            {row.original.merchant}
          </div>
          <Badge className="w-fit text-[10px] p-0.5 px-2" variant="outline">
            <div className="h-fit max-w-30 flex gap-1 items-center">
              <p className="truncate">
                {row.original.cardName ??
                  row.original.vpa ??
                  row.original.merchantRaw ??
                  'Unknown source'}
              </p>
              {row.original.cardName && <CreditCard className={cn('size-3')} />}
            </div>
          </Badge>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => (
      <SortableColumnHeader
        column={column}
        title="Amount"
        className="justify-end"
      />
    ),
    cell: ({ row }) => (
      <div
        className={
          row.original.transactionType === 'debited'
            ? 'font-medium text-negative'
            : 'font-medium text-positive'
        }
      >
        {formatAmount(row.original)}
      </div>
    ),
  },
  {
    accessorKey: 'category',
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Category" />
    ),
    cell: ({ row }) => {
      const meta = getCategoryMeta(row.original.category)
      return (
        <Badge
          variant="secondary"
          className="inline-flex items-center capitalize gap-1.5"
          style={{
            borderColor: meta?.color,
            color: meta?.color,
          }}
        >
          <CategoryIcon
            category={row.original.category}
            size={12}
            className="mr-1.5"
          />
          {meta?.label ?? row.original.category.replace(/_/g, ' ')}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'subcategory',
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Subcategory" />
    ),
    cell: ({ row }) => {
      const subcategory = row.original.subcategory
      if (!subcategory) {
        return <span className="text-muted-foreground">—</span>
      }

      return (
        <span className="text-sm">
          {getSubcategoryLabel(subcategory, row.original.category)}
        </span>
      )
    },
  },
  {
    accessorKey: 'categorizationMethod',
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Method" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline" className="text-[10px] capitalize">
        {row.original.categorizationMethod.replace(/_/g, ' ')}
      </Badge>
    ),
  },
  {
    accessorKey: 'transactionMode',
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Mode" />
    ),
    cell: ({ row }) => (
      <span className="capitalize">
        {row.original.transactionMode.replace(/_/g, ' ')}
      </span>
    ),
  },
  {
    accessorKey: 'confidence',
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Confidence" />
    ),
    cell: ({ row }) => (
      <span className="capitalize">{row.original.confidence}</span>
    ),
  },
  {
    accessorKey: 'requiresReview',
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Review" />
    ),
    cell: ({ row }) =>
      row.original.requiresReview ? (
        <Badge variant="outline">Required</Badge>
      ) : (
        <Badge variant="secondary">Done</Badge>
      ),
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={(e) => {
          e.stopPropagation()
          onEdit(row.original)
        }}
      >
        <Pencil className="size-3.5" />
        <span className="sr-only">Edit transaction</span>
      </Button>
    ),
  },
]

function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, (latest) => Math.round(latest))

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.4,
      ease: 'easeOut',
    })
    return controls.stop
  }, [value, mv])

  return <motion.span>{rounded}</motion.span>
}

const ExpenseEmailsPage = () => {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterCard = searchParams.get('card') ?? ''
  const returnTo = searchParams.get('return')
  const [activeView, setActiveView] = useState<ExpenseView>('expense')
  const [emailPageIndex, setEmailPageIndex] = useState(0)
  const [expensePageIndex, setExpensePageIndex] = useState(0)
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null)
  const [expensePageSize, setExpensePageSize] = useState(() =>
    readStoredPageSize(20),
  )
  const [emailPageSize, setEmailPageSize] = useState(() =>
    readStoredPageSize(20),
  )
  const navigate = useNavigate()

  // ── Row selection ──
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [queueLlmOpen, setQueueLlmOpen] = useState(false)

  // ── Filter state (initialized from URL for analytics drill-down) ──
  const [filterCategory, setFilterCategory] = useState(
    () => searchParams.get('category') ?? '',
  )
  const [filterMode, setFilterMode] = useState(
    () => searchParams.get('mode') ?? '',
  )
  const [filterReview, setFilterReview] = useState(
    () => searchParams.get('review') ?? '',
  )
  const [filterSubcategory, setFilterSubcategory] = useState(
    () => searchParams.get('subcategory') ?? '',
  )
  const [filterCategorizationMethod, setFilterCategorizationMethod] = useState(
    () => searchParams.get('categorization_method') ?? '',
  )
  const [filterDateFrom, setFilterDateFrom] = useState<string | undefined>(
    () => searchParams.get('date_from') ?? undefined,
  )
  const [filterDateTo, setFilterDateTo] = useState<string | undefined>(
    () => searchParams.get('date_to') ?? undefined,
  )
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get('search') ?? '',
  )
  const debouncedSearch = useDebounce(searchInput, 300)

  const [expenseSorting, setExpenseSorting] = useState<SortingState>(() =>
    parseExpenseSorting(searchParams),
  )
  const [emailSorting, setEmailSorting] = useState<SortingState>(() =>
    parseEmailSorting(searchParams),
  )

  const activeExpenseSort = expenseSorting[0]
  const activeEmailSort = emailSorting[0]

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        const setOrDelete = (key: string, value: string | undefined) => {
          if (value) {
            next.set(key, value)
          } else {
            next.delete(key)
          }
        }

        setOrDelete('category', filterCategory || undefined)
        setOrDelete('subcategory', filterSubcategory || undefined)
        setOrDelete('mode', filterMode || undefined)
        setOrDelete(
          'categorization_method',
          filterCategorizationMethod || undefined,
        )
        setOrDelete('review', filterReview || undefined)
        setOrDelete('date_from', filterDateFrom)
        setOrDelete('date_to', filterDateTo)
        setOrDelete('search', debouncedSearch || undefined)

        const sortParams =
          activeView === 'expense'
            ? sortingToQueryParams(expenseSorting, {
                id: 'transactionDate',
                desc: true,
              })
            : sortingToQueryParams(emailSorting, {
                id: 'receivedAt',
                desc: true,
              })
        setOrDelete('sort_by', sortParams.sort_by)
        setOrDelete('sort_order', sortParams.sort_order)

        if (prev.toString() === next.toString()) {
          return prev
        }
        return next
      },
      { replace: true },
    )
  }, [
    debouncedSearch,
    filterCategory,
    filterSubcategory,
    filterCategorizationMethod,
    filterDateFrom,
    filterDateTo,
    filterMode,
    filterReview,
    expenseSorting,
    emailSorting,
    activeView,
    setSearchParams,
  ])

  const handleCardSelect = (last4: string | undefined) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (last4) {
          next.set('card', last4)
        } else {
          next.delete('card')
        }
        return next
      },
      { replace: true },
    )
  }

  const { data: creditCards = [] } = useQuery({
    queryKey: ['expenses', 'credit-cards'],
    queryFn: fetchCreditCards,
    enabled: activeView === 'expense',
  })

  const subcategoryFilterOptions = useMemo(() => {
    if (!filterCategory) {
      return SUBCATEGORY_FILTER_OPTIONS
    }

    return SUBCATEGORY_OPTIONS.filter(
      (option) => option.parent === filterCategory,
    ).map((option) => ({
      value: option.value,
      label: option.label,
    }))
  }, [filterCategory])

  const hasActiveFilters =
    filterCategory ||
    filterSubcategory ||
    filterCategorizationMethod ||
    filterMode ||
    filterReview ||
    filterDateFrom ||
    filterDateTo ||
    debouncedSearch ||
    filterCard

  const showAiCategorizePrompt =
    filterCategory === 'uncategorized' || filterReview === 'true'

  // Reset to first page and clear selection whenever filters change
  useEffect(() => {
    setExpensePageIndex(0)
    setRowSelection({})
  }, [
    filterCategory,
    filterSubcategory,
    filterCategorizationMethod,
    filterMode,
    filterReview,
    filterDateFrom,
    filterDateTo,
    debouncedSearch,
    filterCard,
    expenseSorting,
  ])

  // ── Edit form state ──
  const [editForm, setEditForm] = useState<UpdateTransactionInput>({})

  const openEditSheet = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setEditForm({
      merchant: transaction.merchant,
      category: transaction.category,
      subcategory: transaction.subcategory ?? '',
      transactionType: transaction.transactionType as
        | 'debited'
        | 'credited'
        | undefined,
      transactionMode: transaction.transactionMode as
        | 'upi'
        | 'credit_card'
        | 'neft'
        | 'imps'
        | 'rtgs'
        | undefined,
      amount: transaction.amount,
      currency: transaction.currency,
      requiresReview: transaction.requiresReview,
    })
  }

  const closeEditSheet = () => {
    setEditingTransaction(null)
    setEditForm({})
  }

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: UpdateTransactionInput }) =>
      updateTransaction(params.id, params.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['expenses', 'transactions'],
      })
      closeEditSheet()
    },
  })

  const handleSaveEdit = () => {
    if (!editingTransaction) return
    updateMutation.mutate({
      id: editingTransaction.id,
      data: editForm,
    })
  }

  const expenseColumns = useMemo(
    () => buildExpenseColumns(openEditSheet),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const {
    data: emailData,
    isLoading: isEmailsLoading,
    isError: isEmailsError,
  } = useQuery({
    queryKey: [
      'expenses',
      'emails',
      emailPageIndex + 1,
      emailPageSize,
      activeEmailSort?.id,
      activeEmailSort?.desc,
    ],
    queryFn: () =>
      listExpenseEmails({
        page: emailPageIndex + 1,
        page_size: emailPageSize,
        ...(activeEmailSort && {
          sort_by: activeEmailSort.id,
          sort_order: activeEmailSort.desc ? 'desc' : 'asc',
        }),
      }),
    enabled: activeView === 'emails',
  })

  const {
    data: expensesData,
    isLoading: isExpensesLoading,
    isError: isExpensesError,
  } = useQuery({
    queryKey: [
      'expenses',
      'transactions',
      expensePageIndex + 1,
      expensePageSize,
      filterCategory,
      filterSubcategory,
      filterCategorizationMethod,
      filterMode,
      filterReview,
      filterDateFrom,
      filterDateTo,
      debouncedSearch,
      filterCard,
      activeExpenseSort?.id,
      activeExpenseSort?.desc,
    ],
    queryFn: () =>
      listExpenses({
        page: expensePageIndex + 1,
        page_size: expensePageSize,
        ...(filterCategory && { category: filterCategory }),
        ...(filterSubcategory && { subcategory: filterSubcategory }),
        ...(filterCategorizationMethod && {
          categorization_method: filterCategorizationMethod,
        }),
        ...(filterMode && { mode: filterMode }),
        ...(filterReview && { review: filterReview }),
        ...(filterDateFrom && { date_from: filterDateFrom }),
        ...(filterDateTo && { date_to: filterDateTo }),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filterCard && { card_last4: filterCard }),
        ...(activeExpenseSort && {
          sort_by: activeExpenseSort.id,
          sort_order: activeExpenseSort.desc ? 'desc' : 'asc',
        }),
      }),
    enabled: activeView === 'expense',
  })

  const { data: aiQueueData } = useQuery({
    queryKey: [
      'expenses',
      'transactions',
      'ai-queue',
      filterCategory,
      filterReview,
    ],
    queryFn: () =>
      listExpenses({
        page: 1,
        page_size: 100,
        ...(filterCategory === 'uncategorized' && {
          category: 'uncategorized',
        }),
        ...(filterReview === 'true' && { review: 'true' }),
      }),
    enabled: showAiCategorizePrompt && activeView === 'expense',
  })

  const emailTable = useReactTable({
    data: emailData?.data ?? [],
    columns: emailColumns,
    pageCount: emailData ? Math.ceil(emailData.total / emailData.page_size) : 0,
    state: {
      pagination: {
        pageIndex: emailPageIndex,
        pageSize: emailPageSize,
      },
      sorting: emailSorting,
    },
    onSortingChange: (updater) => {
      setEmailSorting((prev) =>
        typeof updater === 'function' ? updater(prev) : updater,
      )
    },
    onPaginationChange: (updater) => {
      const newState =
        typeof updater === 'function'
          ? updater({ pageIndex: emailPageIndex, pageSize: emailPageSize })
          : updater

      if (newState.pageIndex !== emailPageIndex) {
        setEmailPageIndex(newState.pageIndex)
      }

      if (newState.pageSize !== emailPageSize) {
        writeStoredPageSize(newState.pageSize)
        setEmailPageSize(newState.pageSize)
        setEmailPageIndex(0)
      }
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    enableMultiSort: false,
  })

  const expenseTable = useReactTable({
    data: expensesData?.data ?? [],
    columns: expenseColumns,
    pageCount: expensesData
      ? Math.ceil(expensesData.total / expensesData.page_size)
      : 0,
    state: {
      pagination: {
        pageIndex: expensePageIndex,
        pageSize: expensePageSize,
      },
      rowSelection,
      sorting: expenseSorting,
    },
    onSortingChange: (updater) => {
      setExpenseSorting((prev) =>
        typeof updater === 'function' ? updater(prev) : updater,
      )
      setRowSelection({})
    },
    onPaginationChange: (updater) => {
      const newState =
        typeof updater === 'function'
          ? updater({ pageIndex: expensePageIndex, pageSize: expensePageSize })
          : updater

      if (newState.pageIndex !== expensePageIndex) {
        setExpensePageIndex(newState.pageIndex)
      }

      if (newState.pageSize !== expensePageSize) {
        writeStoredPageSize(newState.pageSize)
        setExpensePageSize(newState.pageSize)
        setExpensePageIndex(0)
      }

      setRowSelection({})
    },
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    enableMultiSort: false,
  })

  // Reset to first page when email sort changes
  useEffect(() => {
    setEmailPageIndex(0)
  }, [emailSorting])

  const statusQuery = useQuery({
    queryKey: ['expenses', 'gmail-status'],
    queryFn: fetchGmailStatus,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const connectMutation = useMutation({
    mutationFn: connectGmail,
    onSuccess: (data) => {
      window.location.assign(data.url)
    },
  })

  const {
    startSync,
    startReprocess,
    job,
    isSyncing,
    error: syncError,
    reset: resetSyncState,
  } = useSyncJob()
  const [syncDateOpen, setSyncDateOpen] = useState(false)
  const [syncFromDate, setSyncFromDate] = useState<Date | undefined>()
  const requiresGmailReconnect =
    syncError?.message.includes('Reconnect Gmail') ?? false
  const displayedProcessedEmails =
    job?.totalEmails != null
      ? Math.min(job.processedEmails, job.totalEmails)
      : (job?.processedEmails ?? 0)
  const syncProgressWidth =
    job?.totalEmails && job.totalEmails > 0
      ? `${Math.min((displayedProcessedEmails / job.totalEmails) * 100, 100)}%`
      : '5%'

  const disconnectMutation = useMutation({
    mutationFn: disconnectGmail,
    onSuccess: () => {
      queryClient.setQueryData(['expenses', 'gmail-status'], {
        connected: false,
        email: null,
      })
      queryClient
        .invalidateQueries({ queryKey: ['expenses', 'gmail-status'] })
        .then(() => {
          void statusQuery.refetch()
        })
    },
  })

  const handleSyncFromDate = () => {
    if (!syncFromDate) {
      startSync()
      setSyncDateOpen(false)
      return
    }

    startSync({ fromDate: format(syncFromDate, 'yyyy-MM-dd') })
    setSyncDateOpen(false)
  }

  return (
    <MainLayout>
      <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col px-4 pb-8 sm:px-6 lg:px-10">
        <header className="pb-5">
          <div className="flex flex-col gap-4 pt-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-1.5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Expenses
              </p>
              <h1 className="font-serif text-3xl font-medium italic tracking-tight text-foreground sm:text-[2.375rem] sm:leading-tight">
                Expense inbox
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                View derived expense transactions and source emails.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:pb-1">
              <Button
                variant="default"
                size="sm"
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
              >
                <MailSearch />
                {statusQuery.data?.connected
                  ? 'Reconnect Gmail'
                  : 'Connect Gmail'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnectMutation.mutate()}
                disabled={
                  !statusQuery.data?.connected || disconnectMutation.isPending
                }
              >
                <Unplug />
                Disconnect
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startSync()}
                  disabled={!statusQuery.data?.connected || isSyncing}
                  className="relative overflow-hidden"
                >
                  <RefreshCcw />
                  {isSyncing && job?.query !== '__reprocess__' && (
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/20 transition-all duration-300"
                      style={{
                        width: syncProgressWidth,
                      }}
                    />
                  )}

                  <span className="relative z-10">
                    {job?.status === 'processing' &&
                    job?.query !== '__reprocess__' &&
                    job.totalEmails ? (
                      <>
                        Syncing (
                        <AnimatedNumber
                          value={displayedProcessedEmails}
                        /> / {job.totalEmails})
                      </>
                    ) : job?.status === 'completed' &&
                      job?.query !== '__reprocess__' ? (
                      'Synced'
                    ) : (
                      'Sync'
                    )}
                  </span>
                </Button>
                <Popover open={syncDateOpen} onOpenChange={setSyncDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9"
                      disabled={!statusQuery.data?.connected || isSyncing}
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Sync options</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-auto p-3 relative">
                    <div className="space-y-3">
                      <Calendar
                        mode="single"
                        selected={syncFromDate}
                        onSelect={setSyncFromDate}
                        disabled={(date) => date > new Date()}
                        autoFocus
                      />
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSyncFromDate(undefined)}
                          disabled={!syncFromDate}
                        >
                          Clear
                        </Button>
                        <Button size="sm" onClick={handleSyncFromDate}>
                          {syncFromDate
                            ? `Sync from ${format(syncFromDate, 'MMM d, yyyy')}`
                            : 'Run default sync'}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startReprocess(false)}
                  disabled={isSyncing}
                  className="relative overflow-hidden"
                >
                  <RotateCw />
                  {isSyncing && job?.query === '__reprocess__' && (
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/20 transition-all duration-300"
                      style={{
                        width: syncProgressWidth,
                      }}
                    />
                  )}
                  <span className="relative z-10">
                    {job?.query === '__reprocess__' &&
                    job?.status === 'processing' &&
                    job.totalEmails ? (
                      <>
                        Reprocessing (
                        <AnimatedNumber
                          value={displayedProcessedEmails}
                        /> / {job.totalEmails})
                      </>
                    ) : job?.query === '__reprocess__' &&
                      job?.status === 'completed' ? (
                      'Reprocessed'
                    ) : (
                      'Reprocess'
                    )}
                  </span>
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9"
                      disabled={isSyncing}
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Reprocess options</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 p-3">
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        className="h-auto w-full justify-start px-2 py-2 text-left whitespace-normal"
                        onClick={() => startReprocess(true)}
                        disabled={isSyncing}
                      >
                        <div className="space-y-1">
                          <p className="font-medium">Force refresh all</p>
                          <p className="text-xs text-muted-foreground">
                            Re-parses every stored email, including ones already
                            processed. Use after parser updates.
                          </p>
                        </div>
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {statusQuery.data?.connected ? (
                <Badge
                  className="flex gap-0 items-center p-1 pr-2"
                  variant="outline"
                >
                  <Dot className="text-positive size-6" />
                  <p className="-ml-2">
                    Connected
                    {statusQuery.data.email
                      ? ` · ${statusQuery.data.email}`
                      : ''}
                  </p>
                </Badge>
              ) : (
                <Badge variant="outline">Not connected</Badge>
              )}
            </div>
          </div>

          {syncError ? (
            <Alert variant="destructive" className="mt-4 max-w-2xl">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {requiresGmailReconnect ? 'Reconnect Gmail' : 'Sync failed'}
              </AlertTitle>
              <AlertDescription className="flex flex-wrap items-center gap-2">
                <span>{syncError.message}</span>
                {requiresGmailReconnect ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      resetSyncState()
                      connectMutation.mutate()
                    }}
                    disabled={connectMutation.isPending}
                  >
                    Reconnect Gmail
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={resetSyncState}>
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
        </header>

        <Tabs
          value={activeView}
          onValueChange={(value) => setActiveView(value as ExpenseView)}
          className="gap-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
            <TabsList className="h-auto w-fit max-w-full justify-start gap-0.5 overflow-x-auto rounded-[11px] border border-border bg-muted p-1">
              <TabsTrigger
                value="expense"
                className="gap-1.5 rounded-lg px-3.5 py-2 text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                <IndianRupee className="size-4" />
                Expense
              </TabsTrigger>
              <TabsTrigger
                value="emails"
                className="gap-1.5 rounded-lg px-3.5 py-2 text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                <Send className="size-4" />
                Emails
              </TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap items-center gap-2">
              {activeView === 'expense' ? <MerchantCategorizeDialog /> : null}
              <Badge variant="outline" className="font-mono tabular-nums">
                {activeView === 'expense'
                  ? (expensesData?.total ?? 0)
                  : (emailData?.total ?? 0)}{' '}
                total
              </Badge>
              <Badge variant="secondary" className="font-mono tabular-nums">
                Page{' '}
                {activeView === 'expense'
                  ? expensePageIndex + 1
                  : emailPageIndex + 1}{' '}
                of{' '}
                {activeView === 'expense'
                  ? expenseTable.getPageCount() || 1
                  : emailTable.getPageCount() || 1}
              </Badge>
            </div>
          </div>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-base font-semibold tracking-tight">
                {activeView === 'expense' ? 'All expenses' : 'Recent emails'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* ── Filter bar (expense tab only) ── */}
              {activeView === 'expense' && (
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[14px] border border-border bg-muted/40 px-3 py-2.5">
                  {returnTo ? (
                    <Button variant="outline" size="sm" className="h-9" asChild>
                      <Link to={returnTo}>
                        <ArrowLeft className="mr-1.5 size-3.5" />
                        Back to analytics
                      </Link>
                    </Button>
                  ) : null}
                  <SearchFilter
                    value={searchInput}
                    onChange={setSearchInput}
                    placeholder="Search merchant…"
                  />
                  <CreditCardFilter
                    cards={creditCards}
                    selectedLast4={filterCard || undefined}
                    onSelect={handleCardSelect}
                  />
                  <SelectFilter
                    label="Categories"
                    value={filterCategory}
                    options={CATEGORY_FILTER_OPTIONS}
                    onChange={(value) => {
                      setFilterCategory(value)
                      if (
                        filterSubcategory &&
                        value &&
                        !SUBCATEGORY_OPTIONS.some(
                          (option) =>
                            option.value === filterSubcategory &&
                            option.parent === value,
                        )
                      ) {
                        setFilterSubcategory('')
                      }
                    }}
                  />
                  <SelectFilter
                    label="Subcategories"
                    value={filterSubcategory}
                    options={subcategoryFilterOptions}
                    onChange={setFilterSubcategory}
                  />
                  <SelectFilter
                    label="Modes"
                    value={filterMode}
                    options={MODE_FILTER_OPTIONS}
                    onChange={setFilterMode}
                  />
                  <SelectFilter
                    label="Method"
                    value={filterCategorizationMethod}
                    options={CATEGORIZATION_METHOD_FILTER_OPTIONS}
                    onChange={setFilterCategorizationMethod}
                    className="w-35 h-9 text-xs"
                  />
                  <SelectFilter
                    label="Review"
                    value={filterReview}
                    options={REVIEW_FILTER_OPTIONS}
                    onChange={setFilterReview}
                    className="w-35 h-9 text-xs"
                  />
                  <DateRangeFilter
                    dateFrom={filterDateFrom}
                    dateTo={filterDateTo}
                    onChange={({ from, to }) => {
                      setFilterDateFrom(from)
                      setFilterDateTo(to)
                    }}
                  />
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 text-xs text-muted-foreground"
                      onClick={() => {
                        setFilterCategory('')
                        setFilterSubcategory('')
                        setFilterCategorizationMethod('')
                        setFilterMode('')
                        setFilterReview('')
                        setFilterDateFrom(undefined)
                        setFilterDateTo(undefined)
                        setSearchInput('')
                        handleCardSelect(undefined)
                      }}
                    >
                      Clear all
                    </Button>
                  )}
                </div>
              )}

              {activeView === 'expense' && showAiCategorizePrompt ? (
                <Alert className="mb-4 border-primary/30 bg-primary/5">
                  <Sparkles className="size-4" />
                  <AlertTitle>Categorize with AI</AlertTitle>
                  <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                    <span>
                      {expensesData?.total ?? 0} transaction
                      {(expensesData?.total ?? 0) === 1 ? '' : 's'} match this
                      filter. AI suggestions are opt-in — review before
                      applying.
                    </span>
                    <Button size="sm" onClick={() => setQueueLlmOpen(true)}>
                      <Sparkles className="mr-2 size-4" />
                      Categorize up to{' '}
                      {Math.min(aiQueueData?.data.length ?? 0, 100)}
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}

              <Separator className="mb-4" />

              <TabsContent value="expense" className="mt-0">
                {isExpensesLoading ? (
                  <div className="space-y-3 pt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : null}
                {isExpensesError ? (
                  <p className="text-sm text-destructive">
                    We couldn’t load expenses. Please try again in a moment.
                  </p>
                ) : null}
                {!isExpensesLoading &&
                !isExpensesError &&
                expenseTable.getRowModel().rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No expenses found yet.
                  </p>
                ) : null}
                {!isExpensesLoading &&
                !isExpensesError &&
                expenseTable.getRowModel().rows.length > 0 ? (
                  <div className="space-y-4">
                    <DataTable table={expenseTable} />

                    <DataTablePagination
                      table={expenseTable}
                      totalItems={expensesData?.total ?? 0}
                      itemLabel="expenses"
                      onPageSizeChange={writeStoredPageSize}
                    />
                    <BulkActionsToolbar
                      selectedIds={Object.keys(rowSelection)}
                      selectedTransactions={(expensesData?.data ?? []).filter(
                        (t) => rowSelection[t.id as keyof typeof rowSelection],
                      )}
                      onClearSelection={() => setRowSelection({})}
                    />
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="emails" className="mt-0">
                {isEmailsLoading ? (
                  <div className="space-y-3 pt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : null}
                {isEmailsError ? (
                  <p className="text-sm text-destructive">
                    We couldn’t load emails. Please try again in a moment.
                  </p>
                ) : null}
                {!isEmailsLoading &&
                !isEmailsError &&
                emailTable.getRowModel().rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No expense emails found yet.
                  </p>
                ) : null}
                {!isEmailsLoading &&
                !isEmailsError &&
                emailTable.getRowModel().rows.length > 0 ? (
                  <div className="space-y-4">
                    <DataTable
                      table={emailTable}
                      onRowClick={(row) => {
                        navigate(
                          appPaths.auth.expensesEmailDetails.getHref(
                            row.original.id,
                          ),
                        )
                      }}
                    />

                    <DataTablePagination
                      table={emailTable}
                      totalItems={emailData?.total ?? 0}
                      itemLabel="emails"
                      onPageSizeChange={writeStoredPageSize}
                    />
                  </div>
                ) : null}
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </div>

      {/* ── Edit Transaction Sheet ── */}
      <Sheet
        open={!!editingTransaction}
        onOpenChange={(open) => !open && closeEditSheet()}
      >
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit Transaction</SheetTitle>
            <SheetDescription>
              Correct transaction details. Changes are saved as manual
              categorisation.
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-5 px-4 py-6">
            {/* Merchant */}
            <div className="grid gap-2">
              <Label htmlFor="edit-merchant">Merchant</Label>
              <Input
                id="edit-merchant"
                value={editForm.merchant ?? ''}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, merchant: e.target.value }))
                }
              />
            </div>

            {/* Amount + Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-amount">Amount</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editForm.amount ?? ''}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      amount: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-currency">Currency</Label>
                <Input
                  id="edit-currency"
                  value={editForm.currency ?? ''}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      currency: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>
            </div>

            {/* Transaction Type */}
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={editForm.transactionType ?? ''}
                onValueChange={(value) =>
                  setEditForm((f) => ({
                    ...f,
                    transactionType: value as 'debited' | 'credited',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Mode */}
            <div className="grid gap-2">
              <Label>Mode</Label>
              <Select
                value={editForm.transactionMode ?? ''}
                onValueChange={(value) =>
                  setEditForm((f) => ({
                    ...f,
                    transactionMode: value as
                      | 'upi'
                      | 'credit_card'
                      | 'neft'
                      | 'imps'
                      | 'rtgs',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_MODES.map((m) => (
                    <SelectItem key={m} value={m} className="capitalize">
                      {m.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={editForm.category ?? ''}
                onValueChange={(value) =>
                  setEditForm((f) => ({ ...f, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <CategorySelectOption category={cat.value} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcategory */}
            <div className="grid gap-2">
              <Label htmlFor="edit-subcategory">Subcategory</Label>
              <Input
                id="edit-subcategory"
                value={editForm.subcategory ?? ''}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, subcategory: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>

            {/* Requires Review */}
            <div className="flex items-center gap-3">
              <input
                id="edit-requires-review"
                type="checkbox"
                className="size-4 rounded border-border"
                checked={editForm.requiresReview ?? false}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    requiresReview: e.target.checked,
                  }))
                }
              />
              <Label htmlFor="edit-requires-review">Requires review</Label>
            </div>
          </div>

          <SheetFooter className="px-4">
            <Button variant="outline" onClick={closeEditSheet}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <LlmCategorizeDialog
        open={queueLlmOpen}
        onOpenChange={setQueueLlmOpen}
        transactions={aiQueueData?.data ?? []}
        onComplete={() => {
          void queryClient.invalidateQueries({
            queryKey: ['expenses', 'transactions'],
          })
        }}
      />
    </MainLayout>
  )
}

export default ExpenseEmailsPage
