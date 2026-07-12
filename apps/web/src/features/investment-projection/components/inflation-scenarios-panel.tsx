import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Switch } from '@workspace/ui/components/ui/switch'
import { Label } from '@workspace/ui/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@workspace/ui/components/ui/chart'
import type { InflationScenarioPoint, ProjectionScenario } from '@workspace/domain'
import { fmtCompact, fmtCurrency, getChartTokenColor } from '../lib/format-utils'

interface InflationScenariosPanelProps {
  scenario: ProjectionScenario
  data: InflationScenarioPoint[]
  onChange: (patch: Partial<ProjectionScenario>) => void
}

export function InflationScenariosPanel({
  scenario,
  data,
  onChange,
}: InflationScenariosPanelProps) {
  const { inflationScenarios } = scenario

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Inflation Scenarios</CardTitle>
        <div className="flex items-center gap-2">
          <Label htmlFor="inflation-scenarios-toggle" className="text-sm">
            Compare rates
          </Label>
          <Switch
            id="inflation-scenarios-toggle"
            checked={inflationScenarios.enabled}
            onCheckedChange={(enabled) =>
              onChange({ inflationScenarios: { ...inflationScenarios, enabled } })
            }
          />
        </div>
      </CardHeader>
      {inflationScenarios.enabled && data.length > 0 && (
        <CardContent>
          <ChartContainer
            config={Object.fromEntries(
              inflationScenarios.rates.map((r, i) => [
                `rate_${r}`,
                { label: `${r}% inflation`, color: getChartTokenColor(i) },
              ]),
            )}
            className="h-[280px] w-full"
          >
            <LineChart data={data.filter((_, i) => i % 6 === 0)}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="label" tickLine={false} interval="preserveStartEnd" />
              <YAxis tickFormatter={(v) => fmtCompact(v as number)} width={56} />
              <ChartTooltip
                content={
                  <ChartTooltipContent formatter={(v) => fmtCurrency(v as number)} />
                }
              />
              {inflationScenarios.rates.map((rate, i) => (
                <Line
                  key={rate}
                  type="monotone"
                  dataKey={`rate_${rate}`}
                  name={`${rate}%`}
                  stroke={getChartTokenColor(i)}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </CardContent>
      )}
    </Card>
  )
}
