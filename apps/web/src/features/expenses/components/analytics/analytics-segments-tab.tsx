import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookmarkPlus, ExternalLink, Trash2 } from 'lucide-react'

import { fmtCurrency } from '@/features/expenses/components/analytics/analytics-utils'
import { buildExpensesDrillDownUrl } from '@/features/expenses/lib/build-expenses-drill-down-url'
import type { AnalyticsPeriod } from '@workspace/domain'
import { Badge } from '@workspace/ui/components/ui/badge'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import { Input } from '@workspace/ui/components/ui/input'
import { Label } from '@workspace/ui/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/ui/select'

const SEGMENTS_STORAGE_KEY = 'expenses-analytics-segments'

export interface SavedSegment {
  id: string
  name: string
  period: AnalyticsPeriod
  filters: {
    category?: string
    recurringOnly?: boolean
    minAmount?: number
    assetClass?: string
  }
}

interface AnalyticsSegmentsTabProps {
  period: AnalyticsPeriod
  selectedCardLast4?: string
}

function loadSegments(): SavedSegment[] {
  try {
    const raw = localStorage.getItem(SEGMENTS_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SavedSegment[]
  } catch {
    return []
  }
}

function saveSegments(segments: SavedSegment[]) {
  localStorage.setItem(SEGMENTS_STORAGE_KEY, JSON.stringify(segments))
}

export function AnalyticsSegmentsTab({
  period,
  selectedCardLast4,
}: AnalyticsSegmentsTabProps) {
  const [segments, setSegments] = useState<SavedSegment[]>(() => loadSegments())
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [recurringOnly, setRecurringOnly] = useState(false)
  const [assetClass, setAssetClass] = useState('')

  const presetSegments = useMemo<SavedSegment[]>(
    () => [
      {
        id: 'preset-recurring',
        name: 'Recurring subscriptions',
        period,
        filters: { recurringOnly: true, minAmount: 100 },
      },
      {
        id: 'preset-investments',
        name: 'Investment debits',
        period,
        filters: { category: 'investments' },
      },
      {
        id: 'preset-uncategorized',
        name: 'Uncategorized spend',
        period,
        filters: { category: 'uncategorized' },
      },
    ],
    [period],
  )

  const addSegment = () => {
    if (!name.trim()) return
    const next: SavedSegment = {
      id: crypto.randomUUID(),
      name: name.trim(),
      period,
      filters: {
        category: category || undefined,
        recurringOnly,
        minAmount: minAmount ? Number(minAmount) : undefined,
        assetClass: assetClass || undefined,
      },
    }
    const updated = [next, ...segments]
    setSegments(updated)
    saveSegments(updated)
    setName('')
    setCategory('')
    setMinAmount('')
    setRecurringOnly(false)
    setAssetClass('')
  }

  const removeSegment = (id: string) => {
    const updated = segments.filter((segment) => segment.id !== id)
    setSegments(updated)
    saveSegments(updated)
  }

  const buildSegmentUrl = (segment: SavedSegment) => {
    const params = new URLSearchParams()
    if (segment.filters.category) params.set('category', segment.filters.category)
    if (segment.filters.minAmount) params.set('min_amount', String(segment.filters.minAmount))
    if (segment.filters.recurringOnly) params.set('recurring', 'true')
    if (segment.filters.assetClass) params.set('asset_class', segment.filters.assetClass)
    if (selectedCardLast4) params.set('card', selectedCardLast4)

    const drillDown = buildExpensesDrillDownUrl({
      period: segment.period,
      cardLast4: selectedCardLast4,
      category: segment.filters.category,
    })

    const extra = params.toString()
    return extra ? `${drillDown}&${extra}` : drillDown
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Save a segment</CardTitle>
          <CardDescription>
            Saved analytics views — opens filtered transactions for deeper crunching
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Segment name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category filter</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. investments"
              />
            </div>
            <div className="space-y-2">
              <Label>Min amount (₹)</Label>
              <Input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Asset class</Label>
              <Select
                value={assetClass || '__any__'}
                onValueChange={(v) => setAssetClass(v === '__any__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Any</SelectItem>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="mutual_funds">Mutual funds</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="sip">SIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={recurringOnly}
              onChange={(e) => setRecurringOnly(e.target.checked)}
            />
            Recurring transactions only
          </label>

          <Button onClick={addSegment}>
            <BookmarkPlus className="mr-1.5 size-4" />
            Save segment
          </Button>
        </CardContent>
      </Card>

      <SegmentList
        title="Your segments"
        description="Custom saved views"
        segments={segments}
        onRemove={removeSegment}
        buildUrl={buildSegmentUrl}
        emptyMessage="No saved segments yet."
      />

      <SegmentList
        title="Quick segments"
        description="Starter views based on transaction metadata"
        segments={presetSegments}
        buildUrl={buildSegmentUrl}
        emptyMessage=""
      />
    </div>
  )
}

function SegmentList({
  title,
  description,
  segments,
  onRemove,
  buildUrl,
  emptyMessage,
}: {
  title: string
  description: string
  segments: SavedSegment[]
  onRemove?: (id: string) => void
  buildUrl: (segment: SavedSegment) => string
  emptyMessage: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {segments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          segments.map((segment) => (
            <div
              key={segment.id}
              className="flex items-center justify-between gap-4 rounded-lg border p-4"
            >
              <div>
                <p className="text-sm font-medium">{segment.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {segment.filters.category ? (
                    <Badge variant="outline" className="text-[10px]">
                      {segment.filters.category}
                    </Badge>
                  ) : null}
                  {segment.filters.recurringOnly ? (
                    <Badge variant="outline" className="text-[10px]">
                      recurring
                    </Badge>
                  ) : null}
                  {segment.filters.minAmount ? (
                    <Badge variant="outline" className="text-[10px]">
                      ≥ {fmtCurrency(segment.filters.minAmount)}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={buildUrl(segment)}>
                    Open
                    <ExternalLink className="ml-1.5 size-3.5" />
                  </Link>
                </Button>
                {onRemove ? (
                  <Button variant="ghost" size="sm" onClick={() => onRemove(segment.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
