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
  const reprocessLabel =
    isSyncing && job?.totalEmails
      ? `Reprocessing (${job.processedEmails}/${job.totalEmails})`
      : job?.status === 'completed'
        ? 'Reprocessed'
        : 'Reprocess Emails'

  return (
    <header className="-mx-4 sm:-mx-6 px-4 sm:px-6 pb-4">
      <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.12em] text-muted-foreground">
            Expenses
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Spending patterns, category breakdowns and trends.
          </p>
        </div>

        <div className="flex items-center gap-1 sm:pt-1">
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
                className="size-8"
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
                    <RotateCw className={isSyncing ? 'size-4 animate-spin' : 'size-4'} />
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
