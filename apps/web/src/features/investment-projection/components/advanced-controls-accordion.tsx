import { Plus, Trash2 } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/ui/accordion'
import { Label } from '@workspace/ui/components/ui/label'
import { Input } from '@workspace/ui/components/ui/input'
import { Switch } from '@workspace/ui/components/ui/switch'
import { Button } from '@workspace/ui/components/ui/button'
import type { ProjectionScenario } from '@workspace/domain'

interface AdvancedControlsAccordionProps {
  scenario: ProjectionScenario
  onChange: (patch: Partial<ProjectionScenario>) => void
}

export function AdvancedControlsAccordion({
  scenario,
  onChange,
}: AdvancedControlsAccordionProps) {
  const { advanced } = scenario

  const updateAdvanced = (patch: Partial<typeof advanced>) => {
    onChange({ advanced: { ...advanced, ...patch } })
  }

  return (
    <Accordion type="single" collapsible className="rounded-xl border px-4">
      <AccordionItem value="advanced">
        <AccordionTrigger className="text-sm font-medium">
          Advanced Controls
        </AccordionTrigger>
        <AccordionContent className="space-y-6 pb-4">
          <div className="space-y-2">
            <Label>Annual Expense Ratio (%)</Label>
            <Input
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={advanced.expenseRatio}
              onChange={(e) =>
                updateAdvanced({ expenseRatio: Number(e.target.value) || 0 })
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Tax Assumptions</Label>
              <Switch
                checked={advanced.tax.enabled}
                onCheckedChange={(enabled) =>
                  updateAdvanced({ tax: { ...advanced.tax, enabled } })
                }
              />
            </div>
            {advanced.tax.enabled && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">LTCG Rate (%)</Label>
                  <Input
                    type="number"
                    value={advanced.tax.ltcgRate}
                    onChange={(e) =>
                      updateAdvanced({
                        tax: {
                          ...advanced.tax,
                          ltcgRate: Number(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">STCG Rate (%)</Label>
                  <Input
                    type="number"
                    value={advanced.tax.stcgRate}
                    onChange={(e) =>
                      updateAdvanced({
                        tax: {
                          ...advanced.tax,
                          stcgRate: Number(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label>Dividend Reinvestment</Label>
            <Switch
              checked={advanced.dividendReinvestment}
              onCheckedChange={(dividendReinvestment) =>
                updateAdvanced({ dividendReinvestment })
              }
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Retirement Target (₹)</Label>
              <Input
                type="number"
                min={0}
                value={advanced.retirementTarget ?? ''}
                onChange={(e) =>
                  updateAdvanced({
                    retirementTarget: Number(e.target.value) || undefined,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Safe Withdrawal Rate (%)</Label>
              <Input
                type="number"
                min={0}
                max={20}
                value={advanced.safeWithdrawalRate}
                onChange={(e) =>
                  updateAdvanced({
                    safeWithdrawalRate: Number(e.target.value) || 4,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>USD/INR Conversion</Label>
              <Switch
                checked={advanced.currencyConversion.enabled}
                onCheckedChange={(enabled) =>
                  updateAdvanced({
                    currencyConversion: {
                      ...advanced.currencyConversion,
                      enabled,
                    },
                  })
                }
              />
            </div>
            {advanced.currencyConversion.enabled && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  type="number"
                  placeholder="USD/INR rate"
                  value={advanced.currencyConversion.usdInrRate}
                  onChange={(e) =>
                    updateAdvanced({
                      currencyConversion: {
                        ...advanced.currencyConversion,
                        usdInrRate: Number(e.target.value) || 83,
                      },
                    })
                  }
                />
                <Input
                  type="number"
                  placeholder="USD return %"
                  value={advanced.currencyConversion.usdReturnAssumption}
                  onChange={(e) =>
                    updateAdvanced({
                      currencyConversion: {
                        ...advanced.currencyConversion,
                        usdReturnAssumption: Number(e.target.value) || 10,
                      },
                    })
                  }
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Custom Withdrawals</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  updateAdvanced({
                    withdrawalSchedule: [
                      ...advanced.withdrawalSchedule,
                      { month: 120, amount: 0 },
                    ],
                  })
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {advanced.withdrawalSchedule.map((w, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Month"
                  value={w.month}
                  onChange={(e) => {
                    const next = [...advanced.withdrawalSchedule]
                    next[i] = { ...w, month: Number(e.target.value) || 0 }
                    updateAdvanced({ withdrawalSchedule: next })
                  }}
                  className="w-24"
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  value={w.amount}
                  onChange={(e) => {
                    const next = [...advanced.withdrawalSchedule]
                    next[i] = { ...w, amount: Number(e.target.value) || 0 }
                    updateAdvanced({ withdrawalSchedule: next })
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    updateAdvanced({
                      withdrawalSchedule: advanced.withdrawalSchedule.filter(
                        (_, j) => j !== i,
                      ),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
