import { Sparkles, X } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import { Button } from '@workspace/ui/components/ui/button'
import { Area, AreaChart } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@workspace/ui/components/ui/chart'
import type { IntelligentDefaultsSuggestion } from '../hooks/use-intelligent-defaults'
import { fmtCurrency, getChartTokenColor } from '../lib/format-utils'

interface PortfolioDataCardProps {
  suggestion: IntelligentDefaultsSuggestion
  onAccept: () => void
  onDismiss: () => void
}

export function PortfolioDataCard({
  suggestion,
  onAccept,
  onDismiss,
}: PortfolioDataCardProps) {
  const hasTrend =
    suggestion.hasData && suggestion.monthlyTrend.length > 0

  return (
    <Card className="border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-300">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            Use my portfolio data
          </CardTitle>
          <CardDescription>{suggestion.message}</CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {(suggestion.avgMonthly !== null ||
          suggestion.avgYearly !== null ||
          suggestion.avgIncrease !== null) && (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
            {suggestion.avgMonthly !== null && (
              <div>
                <p className="text-muted-foreground text-xs">Avg monthly</p>
                <p className="font-semibold tabular-nums text-sm sm:text-base">
                  {fmtCurrency(suggestion.avgMonthly)}
                </p>
              </div>
            )}
            {suggestion.avgYearly !== null && (
              <div>
                <p className="text-muted-foreground text-xs">Avg yearly</p>
                <p className="font-semibold tabular-nums text-sm sm:text-base">
                  {fmtCurrency(suggestion.avgYearly)}
                </p>
              </div>
            )}
            {suggestion.avgIncrease !== null && (
              <div>
                <p className="text-muted-foreground text-xs">Avg increase</p>
                <p className="font-semibold tabular-nums text-sm sm:text-base">
                  {suggestion.avgIncrease.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        )}

        {hasTrend && (
          <ChartContainer
            config={{
              value: { label: 'Investment', color: getChartTokenColor(0) },
            }}
            className="h-[100px] w-full"
          >
            <AreaChart data={suggestion.monthlyTrend}>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={getChartTokenColor(0)}
                fill={getChartTokenColor(0)}
                fillOpacity={0.2}
              />
            </AreaChart>
          </ChartContainer>
        )}

        <Button type="button" size="sm" onClick={onAccept} className="w-full sm:w-auto">
          Accept suggested values
        </Button>
      </CardContent>
    </Card>
  )
}
