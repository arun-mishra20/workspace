import { CircleCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Skeleton } from '@workspace/ui/components/ui/skeleton'

interface ReviewQueueBannerProps {
  reviewPending?: number
  topCategory?: string
  href: string
  loading?: boolean
}

export function ReviewQueueBanner({
  reviewPending = 0,
  topCategory,
  href,
  loading = false,
}: ReviewQueueBannerProps) {
  const categoryLabel = topCategory
    ? topCategory.split('_').join(' ')
    : 'uncategorized'

  if (loading) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-[14px] border border-border bg-accent/60 px-5 py-4">
        <div className="flex items-center gap-3.5">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3.5 w-64" />
          </div>
        </div>
        <Skeleton className="h-9 w-36 rounded-[9px]" />
      </div>
    )
  }

  if (reviewPending <= 0) {
    return (
      <div className="flex items-center gap-3.5 rounded-[14px] border border-border bg-muted/40 px-5 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-positive">
          <CircleCheck className="size-5" aria-hidden />
        </div>
        <div>
          <p className="text-[14.5px] font-bold text-foreground">
            Review queue is clear
          </p>
          <p className="text-[12.5px] text-muted-foreground">
            All transactions in this period have confirmed categories.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-[14px] border border-border bg-accent/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3.5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary">
          <CircleCheck className="size-5" aria-hidden />
        </div>
        <div>
          <p className="text-[14.5px] font-bold text-foreground">
            {reviewPending} transaction{reviewPending === 1 ? '' : 's'} need
            review
          </p>
          <p className="text-[12.5px] text-muted-foreground">
            Mostly filed under{' '}
            <span className="font-mono font-semibold text-primary">
              {categoryLabel}
            </span>{' '}
            — confirm categories to keep reports accurate.
          </p>
        </div>
      </div>
      <Link
        to={href}
        className="inline-flex shrink-0 items-center justify-center rounded-[9px] bg-foreground px-4 py-2.5 text-[12.5px] font-bold text-background transition-opacity hover:opacity-90"
      >
        Open review queue →
      </Link>
    </div>
  )
}
