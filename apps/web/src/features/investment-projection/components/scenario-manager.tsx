import {
  Copy,
  MoreHorizontal,
  RotateCcw,
  Save,
  Share2,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/ui/dropdown-menu'
import type { ProjectionScenario } from '@workspace/domain'
import { createPresetScenario } from '@workspace/domain'
import type { SavedScenario } from '../lib/scenario-serialization'
import { toast } from 'sonner'

interface ScenarioManagerProps {
  scenario: ProjectionScenario
  savedScenarios: SavedScenario[]
  compareIds: string[]
  compareScenarios: ProjectionScenario[]
  onLoad: (scenario: ProjectionScenario) => void
  onSave: () => void
  onDelete: (id: string) => void
  onShare: () => string
  onAddCompare: (scenario: ProjectionScenario) => void
  onRemoveCompare: (id: string) => void
  onReset: () => void
}

export function ScenarioManager({
  scenario,
  savedScenarios,
  compareIds,
  compareScenarios,
  onLoad,
  onSave,
  onDelete,
  onShare,
  onAddCompare,
  onRemoveCompare,
  onReset,
}: ScenarioManagerProps) {
  const loadPreset = (type: 'conservative' | 'expected' | 'optimistic') => {
    onLoad(createPresetScenario(type))
  }

  const handleShare = () => {
    const url = onShare()
    toast.success('Share link copied to clipboard', {
      description: url.slice(0, 60) + '…',
    })
  }

  const canDeleteCurrent = savedScenarios.some((s) => s.id === scenario.id)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-xl border bg-card/50 p-2 sm:p-3">
        <Select
          onValueChange={(v) =>
            loadPreset(v as 'conservative' | 'expected' | 'optimistic')
          }
        >
          <SelectTrigger className="w-[130px] sm:w-[160px] h-9">
            <SelectValue placeholder="Load preset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="conservative">Conservative</SelectItem>
            <SelectItem value="expected">Expected</SelectItem>
            <SelectItem value="optimistic">Optimistic</SelectItem>
          </SelectContent>
        </Select>

        {savedScenarios.length > 0 && (
          <Select
            onValueChange={(id) => {
              const saved = savedScenarios.find((s) => s.id === id)
              if (saved) onLoad(saved.scenario)
            }}
          >
            <SelectTrigger className="w-[120px] sm:w-[180px] h-9 hidden xs:flex sm:flex">
              <SelectValue placeholder="Saved" />
            </SelectTrigger>
            <SelectContent>
              {savedScenarios.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex-1" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={onSave}
        >
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4 mr-1" />
          Share
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => onAddCompare(scenario)}
          disabled={compareIds.length >= 3 || compareIds.includes(scenario.id)}
        >
          <Copy className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Compare ({compareIds.length}/3)</span>
          <span className="sm:hidden tabular-nums">{compareIds.length}/3</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More scenario actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="sm:hidden" onClick={onSave}>
              <Save className="h-4 w-4 mr-2" />
              Save scenario
            </DropdownMenuItem>
            <DropdownMenuItem className="sm:hidden" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share link
            </DropdownMenuItem>
            {savedScenarios.length > 0 && (
              <>
                <DropdownMenuSeparator className="sm:hidden" />
                {savedScenarios.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    className="sm:hidden"
                    onClick={() => onLoad(s.scenario)}
                  >
                    Load: {s.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to defaults
            </DropdownMenuItem>
            {canDeleteCurrent && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(scenario.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete saved scenario
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {compareScenarios.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {compareScenarios.map((cs) => (
            <button
              key={cs.id}
              type="button"
              onClick={() => onRemoveCompare(cs.id)}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-1 text-xs hover:bg-muted"
            >
              {cs.name}
              <X className="h-3 w-3" aria-hidden />
              <span className="sr-only">Remove {cs.name} from compare</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
