import { useFormContext } from 'react-hook-form'
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

interface AssumptionsEditorSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssumptionsEditorSheet({ open, onOpenChange }: AssumptionsEditorSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Assumptions</SheetTitle>
          <SheetDescription>
            Plan inflation, horizon, and contribution timing. Asset returns are net of expected fees and taxes — not a jurisdiction-specific India tax engine.
          </SheetDescription>
        </SheetHeader>
        {open ? <AssumptionsEditorContent /> : null}
      </SheetContent>
    </Sheet>
  )
}

function AssumptionsEditorContent() {
  const { register, setValue, watch } = useFormContext<InvestmentPlanInput>()

  return (
    <div className="mt-4 grid gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Plan name</Label>
        <Input id="name" {...register('name')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="startDate">Start date</Label>
        <Input id="startDate" type="date" {...register('startDate')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="projectionHorizonMonths">Horizon (months)</Label>
        <Input
          id="projectionHorizonMonths"
          type="number"
          {...register('projectionHorizonMonths', { valueAsNumber: true })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="inflationRateBps">Inflation (bps)</Label>
        <Input
          id="inflationRateBps"
          type="number"
          {...register('inflationRateBps', { valueAsNumber: true })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Contribution timing</Label>
        <Select
          value={watch('contributionTiming')}
          onValueChange={(value) =>
            setValue('contributionTiming', value as 'beginning' | 'end', { shouldDirty: true })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginning">Beginning of month</SelectItem>
            <SelectItem value="end">End of month</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        Currency is INR in v1. Scenario deltas adjust market-return assets only; fixed-rate assets stay unchanged.
      </div>
    </div>
  )
}
