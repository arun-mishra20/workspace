import type { SyncJob } from '@workspace/domain'
import { MoreVertical, RotateCw } from 'lucide-react'

import { Button } from '@workspace/ui/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/ui/popover'

interface AnalyticsPageHeaderProps {
  isSyncing: boolean
  job?: SyncJob | null
  onReprocess: (force: boolean) => void
}

export function AnalyticsPageHeader({
  isSyncing,
  job,
  onReprocess,
}: AnalyticsPageHeaderProps) {
  const reprocessLabel = (() => {
    if (isSyncing && job?.totalEmails) {
      return `Reprocessing (${job.processedEmails}/${job.totalEmails})`
    }
    if (job?.status === 'completed') {
      return 'Reprocessed'
    }
    return 'Reprocess emails'
  })()

  return (
    <header className="pb-5">
      <div className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Expenses
          </p>
          <h1 className="font-serif text-3xl font-medium italic tracking-tight text-foreground sm:text-[2.375rem] sm:leading-tight">
            Spending ledger
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Spending patterns, category breakdowns and trends.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:pb-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReprocess(false)}
            disabled={isSyncing}
            className="hidden sm:inline-flex"
          >
            <RotateCw className={isSyncing ? 'animate-spin' : ''} />
            {reprocessLabel}
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
                <span className="sr-only">More options</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-3">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="h-auto w-full justify-start px-2 py-2 text-left whitespace-normal sm:hidden"
                  onClick={() => onReprocess(false)}
                  disabled={isSyncing}
                >
                  <div className="flex items-center gap-2">
                    <RotateCw
                      className={isSyncing ? 'size-4 animate-spin' : 'size-4'}
                    />
                    <span className="font-medium">{reprocessLabel}</span>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  className="h-auto w-full justify-start px-2 py-2 text-left whitespace-normal"
                  onClick={() => onReprocess(true)}
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
      </div>
    </header>
  )
}
