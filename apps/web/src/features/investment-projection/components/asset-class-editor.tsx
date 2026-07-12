import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { Input } from '@workspace/ui/components/ui/input'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/ui/table'
import type { AssetClass, ProjectionScenario } from '@workspace/domain'

interface AssetClassEditorProps {
  scenario: ProjectionScenario
  onChange: (patch: Partial<ProjectionScenario>) => void
}

function createNewAsset(order: number): AssetClass {
  return {
    id: `asset-${Date.now()}-${order}`,
    name: 'Custom Asset',
    order,
    currentValue: 0,
    monthlyInvestment: 0,
    expectedReturn: 10,
    volatility: 10,
  }
}

export function AssetClassEditor({ scenario, onChange }: AssetClassEditorProps) {
  const { assetClasses } = scenario.multiAsset

  const updateAssets = (next: AssetClass[]) => {
    onChange({
      multiAsset: {
        ...scenario.multiAsset,
        assetClasses: next.map((a, i) => ({ ...a, order: i })),
      },
    })
  }

  const updateAsset = (id: string, patch: Partial<AssetClass>) => {
    updateAssets(
      assetClasses.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    )
  }

  const moveAsset = (index: number, direction: 'up' | 'down') => {
    const next = [...assetClasses]
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    updateAssets(next)
  }

  const addAsset = () => {
    updateAssets([...assetClasses, createNewAsset(assetClasses.length)])
  }

  const removeAsset = (id: string) => {
    updateAssets(assetClasses.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card/50 p-4 backdrop-blur-sm overflow-x-auto">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Asset Classes</p>
        <Button type="button" variant="outline" size="sm" onClick={addAsset}>
          <Plus className="h-4 w-4 mr-1" />
          Add Asset
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Asset</TableHead>
            <TableHead className="text-right">Current Value</TableHead>
            <TableHead className="text-right">Monthly</TableHead>
            <TableHead className="text-right">Return %</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {assetClasses.map((asset, index) => (
            <TableRow key={asset.id}>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveAsset(index, 'up')}
                    disabled={index === 0}
                    aria-label={`Move ${asset.name} up`}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveAsset(index, 'down')}
                    disabled={index === assetClasses.length - 1}
                    aria-label={`Move ${asset.name} down`}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <Input
                  value={asset.name}
                  onChange={(e) => updateAsset(asset.id, { name: e.target.value })}
                  className="min-w-[120px]"
                  aria-label={`Asset name ${asset.name}`}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  value={asset.currentValue}
                  onChange={(e) =>
                    updateAsset(asset.id, {
                      currentValue: Number(e.target.value) || 0,
                    })
                  }
                  className="tabular-nums text-right"
                  aria-label={`Current value for ${asset.name}`}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  value={asset.monthlyInvestment}
                  onChange={(e) =>
                    updateAsset(asset.id, {
                      monthlyInvestment: Number(e.target.value) || 0,
                    })
                  }
                  className="tabular-nums text-right"
                  aria-label={`Monthly investment for ${asset.name}`}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={asset.expectedReturn}
                  onChange={(e) =>
                    updateAsset(asset.id, {
                      expectedReturn: Number(e.target.value) || 0,
                    })
                  }
                  className="tabular-nums text-right w-20"
                  aria-label={`Expected return for ${asset.name}`}
                />
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAsset(asset.id)}
                  aria-label={`Remove ${asset.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
