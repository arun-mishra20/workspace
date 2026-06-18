import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/ui/alert'
import { Button } from '@workspace/ui/components/ui/button'

interface AnalyticsQueryBoundaryProps {
  isError: boolean
  errorMessage?: string
  onRetry?: () => void
  children: ReactNode
}

export function AnalyticsQueryBoundary({
  isError,
  errorMessage,
  onRetry,
  children,
}: AnalyticsQueryBoundaryProps) {
  if (!isError) {
    return children
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertTitle>Could not load analytics</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <span>{errorMessage ?? 'Something went wrong while fetching data.'}</span>
        {onRetry && (
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
