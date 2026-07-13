import { memo, useCallback } from 'react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { ASSET_CATEGORY_LABELS } from '@workspace/domain'
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

import type { InvestmentPlanAssetCategory, InvestmentPlanInput } from '@workspace/domain'

const categories = Object.keys(ASSET_CATEGORY_LABELS) as InvestmentPlanAssetCategory[]

interface AssetsEditorSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const AssetRow = memo(function AssetRow({
  index,
  fieldId,
  canRemove,
  onRemove,
}: {
  index: number
  fieldId: string
  canRemove: boolean
  onRemove: (index: number) => void
}) {
  const { register, control, setValue } = useFormContext<InvestmentPlanInput>()
  const category = useWatch({ control, name: `assets.${index}.category` })
  const growthModel = useWatch({ control, name: `assets.${index}.growthModel` })

  return (
    <div className="rounded-xl border p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Asset {index + 1}</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)} disabled={!canRemove}>
          Remove
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`asset-${fieldId}-name`}>Name</Label>
          <Input id={`asset-${fieldId}-name`} {...register(`assets.${index}.name`)} />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            value={category}
            onValueChange={(value) =>
              setValue(`assets.${index}.category`, value as InvestmentPlanAssetCategory, { shouldDirty: true })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((item) => (
                <SelectItem key={item} value={item}>
                  {ASSET_CATEGORY_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`asset-${fieldId}-current`}>Current value</Label>
          <Input
            id={`asset-${fieldId}-current`}
            type="number"
            step="0.01"
            {...register(`assets.${index}.currentValue`, { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`asset-${fieldId}-monthly`}>Monthly contribution</Label>
          <Input
            id={`asset-${fieldId}-monthly`}
            type="number"
            step="0.01"
            {...register(`assets.${index}.monthlyContribution`, { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`asset-${fieldId}-return`}>Expected return (bps)</Label>
          <Input
            id={`asset-${fieldId}-return`}
            type="number"
            {...register(`assets.${index}.expectedAnnualReturnBps`, { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`asset-${fieldId}-escalation`}>Annual escalation (bps)</Label>
          <Input
            id={`asset-${fieldId}-escalation`}
            type="number"
            {...register(`assets.${index}.annualEscalationBps`, { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`asset-${fieldId}-end`}>Contribution end</Label>
          <Input
            id={`asset-${fieldId}-end`}
            type="date"
            {...register(`assets.${index}.contributionEndDate`, {
              setValueAs: (value) => (value === '' || value == null ? undefined : value),
            })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Growth model</Label>
          <Select
            value={growthModel}
            onValueChange={(value) =>
              setValue(`assets.${index}.growthModel`, value as 'market_return' | 'fixed_rate', { shouldDirty: true })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market_return">Market return</SelectItem>
              <SelectItem value="fixed_rate">Fixed rate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
})

function AssetsEditorContent() {
  const { control } = useFormContext<InvestmentPlanInput>()
  const { fields, append, remove } = useFieldArray({ control, name: 'assets' })
  const onRemove = useCallback((index: number) => {
    remove(index)
  }, [remove])

  return (
    <div className="mt-4 space-y-4">
      {fields.map((field, index) => (
        <AssetRow
          key={field.id}
          fieldId={field.id}
          index={index}
          canRemove={fields.length > 1}
          onRemove={onRemove}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          append({
            id: globalThis.crypto.randomUUID(),
            category: 'other',
            name: 'New asset',
            currentValue: 0,
            monthlyContribution: 0,
            annualEscalationBps: 0,
            expectedAnnualReturnBps: 800,
            returnBasis: 'nominal',
            growthModel: 'market_return',
            order: fields.length,
          })
        }
      >
        Add asset
      </Button>
    </div>
  )
}

export function AssetsEditorSheet({ open, onOpenChange }: AssetsEditorSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Assets</SheetTitle>
          <SheetDescription>
            Category, balances, contributions, and net expected returns. Returns are net of fees and expected tax.
          </SheetDescription>
        </SheetHeader>
        {open ? <AssetsEditorContent /> : null}
      </SheetContent>
    </Sheet>
  )
}
