import { format } from 'date-fns'
import { CheckCircle2, Circle } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import type { MilestoneHit } from '@workspace/domain'
import { fmtCurrency } from '../lib/format-utils'

interface MilestoneTimelineProps {
  milestones: MilestoneHit[]
}

export function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Milestone Timeline</CardTitle>
        <CardDescription>Estimated dates to reach wealth targets</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-0 border-l border-border ml-3">
          {milestones.map((m) => (
            <li key={m.label} className="relative pb-6 pl-6 last:pb-0">
              <span
                className={`absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full ${
                  m.achieved ? 'text-positive' : 'text-muted-foreground'
                }`}
              >
                {m.achieved ? (
                  <CheckCircle2 className="h-4 w-4" aria-label="Achieved" />
                ) : (
                  <Circle className="h-4 w-4" aria-label="Not yet achieved" />
                )}
              </span>
              <div className="space-y-1">
                <p className="font-medium">{m.label}</p>
                <p className="text-muted-foreground text-xs tabular-nums">
                  Target: {fmtCurrency(m.targetINR)}
                </p>
                {m.achieved && m.month >= 0 ? (
                  <>
                    <p className="text-sm">
                      {m.month === 0
                        ? 'Already achieved'
                        : `~${m.yearsFromNow} years (${format(m.date, 'MMM yyyy')})`}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Invested: {fmtCurrency(m.investedAtHit)} · Gains:{' '}
                      {fmtCurrency(m.gainsAtHit)}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">Beyond projection horizon</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
