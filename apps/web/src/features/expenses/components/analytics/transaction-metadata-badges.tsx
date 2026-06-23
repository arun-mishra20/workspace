import { Badge } from '@workspace/ui/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/ui/tooltip'

import type { Transaction } from '@workspace/domain'

function formatMethod(method: string) {
  return method.replace(/_/g, ' ')
}

function formatConfidence(confidence: number) {
  if (confidence >= 0.9) return { label: 'High', className: 'text-positive' }
  if (confidence >= 0.7) return { label: 'Medium', className: 'text-warning' }
  return { label: 'Low', className: 'text-negative' }
}

interface TransactionMetadataBadgesProps {
  transaction: Pick<
    Transaction,
    | 'confidence'
    | 'categorizationMethod'
    | 'requiresReview'
    | 'transactionAttributes'
  > & {
    vpa?: string | null
    merchantRaw?: string | null
    cardLast4?: string | null
  }
  compact?: boolean
}

export function TransactionMetadataBadges({
  transaction,
  compact = false,
}: TransactionMetadataBadgesProps) {
  const confidence = formatConfidence(transaction.confidence)
  const attrs = transaction.transactionAttributes

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1.5">
        {transaction.requiresReview ? (
          <Badge variant="destructive" className="text-xs">
            Review
          </Badge>
        ) : null}

        <Badge variant="outline" className="text-xs capitalize">
          {formatMethod(transaction.categorizationMethod)}
        </Badge>

        <Badge variant="secondary" className={`text-xs ${confidence.className}`}>
          {confidence.label} {Math.round(transaction.confidence * 100)}%
        </Badge>

        {attrs?.isRecurring ? (
          <Badge variant="outline" className="text-xs">
            Recurring
          </Badge>
        ) : null}

        {attrs?.incomeType ? (
          <Badge variant="outline" className="text-xs capitalize">
            {attrs.incomeType.replace(/_/g, ' ')}
          </Badge>
        ) : null}

        {attrs?.assetClass ? (
          <Badge variant="outline" className="text-xs capitalize">
            {attrs.assetClass.replace(/_/g, ' ')}
          </Badge>
        ) : null}

        {!compact && transaction.vpa ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="max-w-28 truncate text-xs">
                {transaction.vpa}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>VPA: {transaction.vpa}</TooltipContent>
          </Tooltip>
        ) : null}

        {!compact && transaction.merchantRaw ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="max-w-32 truncate text-xs">
                Raw payee
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{transaction.merchantRaw}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </TooltipProvider>
  )
}
