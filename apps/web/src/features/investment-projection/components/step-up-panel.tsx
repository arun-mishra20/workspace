import { Label } from '@workspace/ui/components/ui/label'
import { Input } from '@workspace/ui/components/ui/input'
import { Slider } from '@workspace/ui/components/ui/slider'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@workspace/ui/components/ui/chart'
import type { ProjectionScenario } from '@workspace/domain'
import { fmtCompact, getChartTokenColor } from '../lib/format-utils'

interface StepUpPanelProps {
  scenario: ProjectionScenario
  onChange: (patch: Partial<ProjectionScenario>) => void
}

export function StepUpPanel({ scenario, onChange }: StepUpPanelProps) {
  const { stepUp, basicSIP } = scenario

  const contributionPreview = Array.from({ length: 5 }, (_, year) => {
    const multiplier = (1 + stepUp.annualIncrementPercent / 100) ** year
    return {
      year: `Y${year + 1}`,
      amount: basicSIP.amount * multiplier,
    }
  })

  return (
    <div className="space-y-4 rounded-xl border bg-card/50 p-4">
      <p className="text-sm font-medium">Increase SIP every year</p>

      <div className="space-y-2">
        <Label>Annual Increment ({stepUp.annualIncrementPercent}%)</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[stepUp.annualIncrementPercent]}
            onValueChange={([v]) =>
              onChange({
                stepUp: { ...stepUp, annualIncrementPercent: v ?? 10 },
              })
            }
            min={0}
            max={50}
            step={1}
            className="flex-1"
          />
          <Input
            type="number"
            min={0}
            max={100}
            value={stepUp.annualIncrementPercent}
            onChange={(e) =>
              onChange({
                stepUp: {
                  ...stepUp,
                  annualIncrementPercent: Number(e.target.value) || 0,
                },
              })
            }
            className="w-20 tabular-nums"
          />
        </div>
      </div>

      <ChartContainer
        config={{ amount: { label: 'Monthly SIP', color: getChartTokenColor(0) } }}
        className="h-[160px] w-full"
      >
        <BarChart data={contributionPreview}>
          <XAxis dataKey="year" tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v) => fmtCompact(v as number)} width={48} />
          <ChartTooltip
            content={
              <ChartTooltipContent formatter={(v) => fmtCompact(v as number)} />
            }
          />
          <Bar
            dataKey="amount"
            fill={getChartTokenColor(0)}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
