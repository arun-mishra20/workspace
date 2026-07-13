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

interface EventsEditorSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EventsEditorSheet({ open, onOpenChange }: EventsEditorSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Cash events</SheetTitle>
          <SheetDescription>
            One-time investments or withdrawals applied to a single asset on the effective month.
          </SheetDescription>
        </SheetHeader>
        {open ? <EventsEditorContent /> : null}
      </SheetContent>
    </Sheet>
  )
}

function EventsEditorContent() {
  const { control, register, setValue, watch } = useFormContext<InvestmentPlanInput>()
  const { fields, append, remove } = useFieldArray({ control, name: 'events' })
  const assets = watch('assets')

  return (
    <div className="mt-4 space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="rounded-xl border p-3 space-y-3">
          <div className="flex justify-between">
            <p className="text-sm font-medium">Event {index + 1}</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
              Remove
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Asset</Label>
              <Select
                value={watch(`events.${index}.assetId`)}
                onValueChange={(value) => setValue(`events.${index}.assetId`, value, { shouldDirty: true })}
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
              <Label>Type</Label>
              <Select
                value={watch(`events.${index}.type`)}
                onValueChange={(value) =>
                  setValue(`events.${index}.type`, value as 'investment' | 'withdrawal', { shouldDirty: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" {...register(`events.${index}.effectiveDate`)} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" {...register(`events.${index}.amount`, { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Note</Label>
              <Input {...register(`events.${index}.note`)} />
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={assets.length === 0}
        onClick={() =>
          append({
            id: globalThis.crypto.randomUUID(),
            assetId: assets[0]!.id,
            type: 'investment',
            effectiveDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
            amount: 10_000,
          })
        }
      >
        Add event
      </Button>
    </div>
  )
}
