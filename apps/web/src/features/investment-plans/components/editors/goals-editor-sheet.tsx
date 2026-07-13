import { format, startOfMonth } from 'date-fns'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { Button } from '@workspace/ui/components/ui/button'
import { Input } from '@workspace/ui/components/ui/input'
import { Label } from '@workspace/ui/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/ui/sheet'

import type { InvestmentPlanInput } from '@workspace/domain'

interface GoalsEditorSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GoalsEditorSheet({ open, onOpenChange }: GoalsEditorSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Goals & funding</SheetTitle>
          <SheetDescription>
            Allocate each asset’s current value and contributions across goals. Remainder stays unallocated.
          </SheetDescription>
        </SheetHeader>
        {open ? <GoalsEditorContent /> : null}
      </SheetContent>
    </Sheet>
  )
}

function GoalsEditorContent() {
  const { control, register, setValue, watch } = useFormContext<InvestmentPlanInput>()
  const goals = useFieldArray({ control, name: 'goals' })
  const allocations = useFieldArray({ control, name: 'goalAllocations' })
  const assets = watch('assets')

  return (
        <div className="mt-4 space-y-4">
          {goals.fields.map((field, index) => {
            const type = watch(`goals.${index}.type`)
            return (
              <div key={field.id} className="rounded-xl border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Goal {index + 1}</p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => goals.remove(index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input {...register(`goals.${index}.name`)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                      value={type}
                      onValueChange={(value) =>
                        setValue(`goals.${index}.type`, value as InvestmentPlanInput['goals'][number]['type'], {
                          shouldDirty: true,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom</SelectItem>
                        <SelectItem value="retirement">Retirement</SelectItem>
                        <SelectItem value="financial_independence">Financial independence</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Target date</Label>
                    <Input type="date" {...register(`goals.${index}.targetDate`)} />
                  </div>
                  {type === 'custom' ? (
                    <div className="space-y-1.5">
                      <Label>Target value (today ₹)</Label>
                      <Input type="number" {...register(`goals.${index}.targetValueToday`, { valueAsNumber: true })} />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label>Annual spending (today ₹)</Label>
                        <Input type="number" {...register(`goals.${index}.annualSpendingToday`, { valueAsNumber: true })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Safe withdrawal (bps)</Label>
                        <Input type="number" {...register(`goals.${index}.safeWithdrawalRateBps`, { valueAsNumber: true })} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              goals.append({
                id: globalThis.crypto.randomUUID(),
                name: 'New goal',
                type: 'custom',
                targetDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
                targetValueToday: 1_000_000,
              })
            }
          >
            Add goal
          </Button>

          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold">Goal allocations</h3>
            {allocations.fields.map((field, index) => (
              <div key={field.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Asset</Label>
                  <Select
                    value={watch(`goalAllocations.${index}.assetId`)}
                    onValueChange={(value) => setValue(`goalAllocations.${index}.assetId`, value, { shouldDirty: true })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Goal</Label>
                  <Select
                    value={watch(`goalAllocations.${index}.goalId`)}
                    onValueChange={(value) => setValue(`goalAllocations.${index}.goalId`, value, { shouldDirty: true })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {watch('goals').map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {goal.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Current value bps</Label>
                  <Input type="number" {...register(`goalAllocations.${index}.currentValueAllocationBps`, { valueAsNumber: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Contribution bps</Label>
                  <Input type="number" {...register(`goalAllocations.${index}.contributionAllocationBps`, { valueAsNumber: true })} />
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => allocations.remove(index)}>
                  Remove allocation
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={assets.length === 0 || watch('goals').length === 0}
              onClick={() =>
                allocations.append({
                  id: globalThis.crypto.randomUUID(),
                  assetId: assets[0]!.id,
                  goalId: watch('goals')[0]!.id,
                  currentValueAllocationBps: 0,
                  contributionAllocationBps: 0,
                })
              }
            >
              Add allocation
            </Button>
          </div>
        </div>
  )
}
