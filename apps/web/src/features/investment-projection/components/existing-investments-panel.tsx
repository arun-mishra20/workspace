import { Plus, Trash2 } from 'lucide-react'
import { Label } from '@workspace/ui/components/ui/label'
import { Input } from '@workspace/ui/components/ui/input'
import { Button } from '@workspace/ui/components/ui/button'
import type { ProjectionScenario } from '@workspace/domain'

interface ExistingInvestmentsPanelProps {
  scenario: ProjectionScenario
  onChange: (patch: Partial<ProjectionScenario>) => void
}

export function ExistingInvestmentsPanel({
  scenario,
  onChange,
}: ExistingInvestmentsPanelProps) {
  const { existingInvestments } = scenario

  const update = (patch: Partial<typeof existingInvestments>) => {
    onChange({ existingInvestments: { ...existingInvestments, ...patch } })
  }

  const addFutureLumpSum = () => {
    update({
      futureLumpSums: [
        ...existingInvestments.futureLumpSums,
        { month: 12, amount: 0 },
      ],
    })
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card/50 p-4">
      <p className="text-sm font-medium">Existing investments</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="current-portfolio">Current Portfolio Value (₹)</Label>
          <Input
            id="current-portfolio"
            type="number"
            min={0}
            value={existingInvestments.currentPortfolio}
            onChange={(e) =>
              update({ currentPortfolio: Number(e.target.value) || 0 })
            }
            className="tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="existing-monthly">Existing Monthly Investments (₹)</Label>
          <Input
            id="existing-monthly"
            type="number"
            min={0}
            value={existingInvestments.existingMonthly}
            onChange={(e) =>
              update({ existingMonthly: Number(e.target.value) || 0 })
            }
            className="tabular-nums"
          />
        </div>

        <div className="sm:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label>Future Lump Sums</Label>
            <Button type="button" variant="outline" size="sm" onClick={addFutureLumpSum}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          {existingInvestments.futureLumpSums.map((lump, i) => (
            <div key={i} className="flex gap-2">
              <Input
                type="number"
                placeholder="Month"
                value={lump.month}
                onChange={(e) => {
                  const next = [...existingInvestments.futureLumpSums]
                  next[i] = { ...lump, month: Number(e.target.value) || 0 }
                  update({ futureLumpSums: next })
                }}
                className="w-24 tabular-nums"
                aria-label={`Lump sum month ${i + 1}`}
              />
              <Input
                type="number"
                placeholder="Amount (₹)"
                value={lump.amount}
                onChange={(e) => {
                  const next = [...existingInvestments.futureLumpSums]
                  next[i] = { ...lump, amount: Number(e.target.value) || 0 }
                  update({ futureLumpSums: next })
                }}
                className="flex-1 tabular-nums"
                aria-label={`Lump sum amount ${i + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  update({
                    futureLumpSums: existingInvestments.futureLumpSums.filter(
                      (_, j) => j !== i,
                    ),
                  })
                }
                aria-label={`Remove lump sum ${i + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
