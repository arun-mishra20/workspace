import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import { Switch } from '@workspace/ui/components/ui/switch'
import { Label } from '@workspace/ui/components/ui/label'
import { Input } from '@workspace/ui/components/ui/input'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@workspace/ui/components/ui/chart'
import type { MonteCarloResult, ProjectionScenario } from '@workspace/domain'
import {
  fmtCompact,
  fmtCurrency,
  fmtPercent,
  getChartTokenColor,
} from '../lib/format-utils'

interface MonteCarloPanelProps {
  scenario: ProjectionScenario
  result: MonteCarloResult | null
  onChange: (patch: Partial<ProjectionScenario>) => void
}

export function MonteCarloPanel({
  scenario,
  result,
  onChange,
}: MonteCarloPanelProps) {
  const { monteCarlo } = scenario
  const showReal =
    scenario.inflation.enabled &&
    monteCarlo.trackInflation &&
    result?.realPercentile50

  const fanData =
    result?.percentile50.map((_, i) => ({
      month: i,
      p10: showReal ? result.realPercentile10?.[i] : result.percentile10[i],
      p25: result.percentile25[i],
      p50: showReal ? result.realPercentile50?.[i] : result.percentile50[i],
      p75: result.percentile75[i],
      p90: showReal ? result.realPercentile90?.[i] : result.percentile90[i],
      p95: result.percentile95[i],
      nominal: result.percentile50[i],
    })) ?? []

  const updateMonteCarlo = (patch: Partial<typeof monteCarlo>) => {
    onChange({ monteCarlo: { ...monteCarlo, ...patch } })
  }

  if (!monteCarlo.enabled) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Monte Carlo Simulation</CardTitle>
          <CardDescription>
            GBM with correlated assets, volatility drag, and percentile bands
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => updateMonteCarlo({ enabled: false })}
        >
          Disable
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Simulations</Label>
              <Input
                type="number"
                min={100}
                max={20_000}
                value={monteCarlo.simulations}
                onChange={(e) =>
                  updateMonteCarlo({
                    simulations: Number(e.target.value) || 5000,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Target Corpus (₹)</Label>
              <Input
                type="number"
                min={0}
                value={monteCarlo.targetCorpus ?? 50_000_000}
                onChange={(e) =>
                  updateMonteCarlo({
                    targetCorpus: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Contribution Timing</Label>
              <Select
                value={monteCarlo.contributionTiming}
                onValueChange={(v) =>
                  updateMonteCarlo({
                    contributionTiming: v as 'beginning' | 'end',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="end">End of month</SelectItem>
                  <SelectItem value="beginning">Beginning of month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Switch
                id="mc-correlation"
                checked={monteCarlo.correlation.enabled}
                onCheckedChange={(enabled) =>
                  updateMonteCarlo({
                    correlation: { ...monteCarlo.correlation, enabled },
                  })
                }
              />
              <Label htmlFor="mc-correlation" className="text-sm">
                Asset correlation
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="mc-rebalance"
                checked={monteCarlo.rebalancing.enabled}
                onCheckedChange={(enabled) =>
                  updateMonteCarlo({
                    rebalancing: { ...monteCarlo.rebalancing, enabled },
                  })
                }
              />
              <Label htmlFor="mc-rebalance" className="text-sm">
                Annual rebalancing
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="mc-fees"
                checked={monteCarlo.fees.enabled}
                onCheckedChange={(enabled) =>
                  updateMonteCarlo({
                    fees: { ...monteCarlo.fees, enabled },
                  })
                }
              />
              <Label htmlFor="mc-fees" className="text-sm">
                Fees & expenses
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="mc-inflation"
                checked={monteCarlo.trackInflation}
                onCheckedChange={(trackInflation) =>
                  updateMonteCarlo({ trackInflation })
                }
              />
              <Label htmlFor="mc-inflation" className="text-sm">
                Track inflation (real values)
              </Label>
            </div>
          </div>

          {monteCarlo.rebalancing.enabled && (
            <div className="space-y-2">
              <Label>Rebalance Frequency</Label>
              <Select
                value={monteCarlo.rebalancing.frequency}
                onValueChange={(v) =>
                  updateMonteCarlo({
                    rebalancing: {
                      ...monteCarlo.rebalancing,
                      frequency: v as 'yearly' | 'half-yearly' | 'quarterly',
                    },
                  })
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="half-yearly">Half-yearly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {monteCarlo.fees.enabled && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">Expense ratio (%)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={monteCarlo.fees.expenseRatio}
                  onChange={(e) =>
                    updateMonteCarlo({
                      fees: {
                        ...monteCarlo.fees,
                        expenseRatio: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Advisory fee (%)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={monteCarlo.fees.advisoryFee}
                  onChange={(e) =>
                    updateMonteCarlo({
                      fees: {
                        ...monteCarlo.fees,
                        advisoryFee: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Brokerage (%)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={monteCarlo.fees.brokerage}
                  onChange={(e) =>
                    updateMonteCarlo({
                      fees: {
                        ...monteCarlo.fees,
                        brokerage: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Annual maintenance (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={monteCarlo.fees.annualMaintenance}
                  onChange={(e) =>
                    updateMonteCarlo({
                      fees: {
                        ...monteCarlo.fees,
                        annualMaintenance: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}

          {result && (
            <>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">
                  Probability of target
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {fmtPercent(result.probabilityOfTarget * 100, 1)}
                </p>
              </div>

              <ChartContainer
                config={{
                  p50: { label: 'Median', color: getChartTokenColor(0) },
                  p25: { label: 'P25', color: getChartTokenColor(1) },
                  p75: { label: 'P75', color: getChartTokenColor(2) },
                  p10: { label: 'P10', color: getChartTokenColor(3) },
                  p90: { label: 'P90', color: getChartTokenColor(4) },
                }}
                className="h-[300px] w-full"
              >
                <AreaChart data={fanData.filter((_, i) => i % 3 === 0)}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border/50"
                  />
                  <XAxis dataKey="month" tickFormatter={(m) => `M${m}`} />
                  <YAxis
                    tickFormatter={(v) => fmtCompact(v as number)}
                    width={56}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(v) => fmtCurrency(v as number)}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="p90"
                    stroke={getChartTokenColor(4)}
                    fill={getChartTokenColor(4)}
                    fillOpacity={0.08}
                    strokeWidth={1}
                  />
                  <Area
                    type="monotone"
                    dataKey="p75"
                    stroke={getChartTokenColor(2)}
                    fill={getChartTokenColor(2)}
                    fillOpacity={0.1}
                    strokeWidth={1}
                  />
                  <Area
                    type="monotone"
                    dataKey="p50"
                    stroke={getChartTokenColor(0)}
                    fill={getChartTokenColor(0)}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="p25"
                    stroke={getChartTokenColor(1)}
                    fill={getChartTokenColor(1)}
                    fillOpacity={0.1}
                    strokeWidth={1}
                  />
                  <Area
                    type="monotone"
                    dataKey="p10"
                    stroke={getChartTokenColor(3)}
                    fill={getChartTokenColor(3)}
                    fillOpacity={0.08}
                    strokeWidth={1}
                  />
                </AreaChart>
              </ChartContainer>

              <ChartContainer
                config={{
                  count: { label: 'Frequency', color: getChartTokenColor(0) },
                }}
                className="h-[200px] w-full"
              >
                <BarChart data={result.finalDistribution}>
                  <XAxis dataKey="bucket" tick={{ fontSize: 9 }} interval={1} />
                  <YAxis />
                  <ChartTooltip />
                  <Bar
                    dataKey="count"
                    fill={getChartTokenColor(0)}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </>
          )}
      </CardContent>
    </Card>
  )
}
