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
  if (confidence >= 0.9) return { label: 'High', className: 'text-emerald-600' }
  if (confidence >= 0.7) return { label: 'Medium', className: 'text-amber-600' }
  return { label: 'Low', className: 'text-red-500' }
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
          <Badge variant="destructive" className="text-[10px]">
            Review
          </Badge>
        ) : null}

        <Badge variant="outline" className="text-[10px] capitalize">
          {formatMethod(transaction.categorizationMethod)}
        </Badge>

        <Badge variant="secondary" className={`text-[10px] ${confidence.className}`}>
          {confidence.label} {Math.round(transaction.confidence * 100)}%
        </Badge>

        {attrs?.isRecurring ? (
          <Badge variant="outline" className="text-[10px]">
            Recurring
          </Badge>
        ) : null}

        {attrs?.incomeType ? (
          <Badge variant="outline" className="text-[10px] capitalize">
            {attrs.incomeType.replace(/_/g, ' ')}
          </Badge>
        ) : null}

        {attrs?.assetClass ? (
          <Badge variant="outline" className="text-[10px] capitalize">
            {attrs.assetClass.replace(/_/g, ' ')}
          </Badge>
        ) : null}

        {!compact && transaction.vpa ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="max-w-28 truncate text-[10px]">
                {transaction.vpa}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>VPA: {transaction.vpa}</TooltipContent>
          </Tooltip>
        ) : null}

        {!compact && transaction.merchantRaw ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="max-w-32 truncate text-[10px]">
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
