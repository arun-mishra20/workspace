import {
  TrendingUp,
  AlertTriangle,
  Target,
  PieChart,
  History,
  Sparkles,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import type { ProjectionInsight } from '@workspace/domain'

const ICON_MAP = {
  milestone: Target,
  inflation: AlertTriangle,
  stepup: TrendingUp,
  allocation: PieChart,
  growth: Sparkles,
  history: History,
} as const

interface InsightsPanelProps {
  insights: ProjectionInsight[]
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insights</CardTitle>
        <CardDescription>Personalized projections based on your inputs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => {
          const Icon = ICON_MAP[insight.type] ?? Sparkles
          return (
            <div
              key={insight.id}
              className="flex gap-3 rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
            >
              <Icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p className="text-sm leading-relaxed">{insight.message}</p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
