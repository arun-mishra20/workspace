import { useMemo } from 'react'
import type { InvestmentPlanAssetCategory } from '@workspace/domain'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'

import { fmtCurrency } from '@/features/investment-plans/lib/format'

import type {
  InvestmentPlanInput,
  InvestmentPlanSnapshot,
} from '@workspace/domain'

interface PlanPortfolioSectionProps {
  plan: InvestmentPlanInput
  finalSnapshot: InvestmentPlanSnapshot
}

type MixBucket = 'equity' | 'debt' | 'gold' | 'cash'

const BUCKET_META: Record<
  MixBucket,
  { label: string; color: string }
> = {
  equity: { label: 'Equity', color: 'var(--color-chart-1)' },
  debt: { label: 'Debt', color: 'var(--color-chart-2)' },
  gold: { label: 'Gold', color: 'var(--color-chart-4)' },
  cash: { label: 'Cash', color: 'var(--color-muted-foreground)' },
}

function toBucket(category: InvestmentPlanAssetCategory): MixBucket {
  switch (category) {
    case 'indian_equity':
    case 'us_equity':
    case 'mutual_fund':
    case 'etf':
    case 'crypto':
      return 'equity'
    case 'debt':
    case 'fixed_deposit':
      return 'debt'
    case 'gold':
      return 'gold'
    case 'cash':
    case 'other':
    default:
      return 'cash'
  }
}

const BUCKET_ORDER: MixBucket[] = ['equity', 'debt', 'gold', 'cash']

function sharePct(value: number, total: number) {
  if (total <= 0) return 0
  return Math.round((value / total) * 100)
}

export function PlanPortfolioSection({
  plan,
  finalSnapshot,
}: PlanPortfolioSectionProps) {
  const mix = useMemo(() => {
    const present: Record<MixBucket, number> = {
      equity: 0,
      debt: 0,
      gold: 0,
      cash: 0,
    }
    const projected: Record<MixBucket, number> = {
      equity: 0,
      debt: 0,
      gold: 0,
      cash: 0,
    }

    for (const asset of plan.assets) {
      const bucket = toBucket(asset.category)
      present[bucket] += asset.currentValue
      projected[bucket] += finalSnapshot.assetValues[asset.id] ?? 0
    }

    const presentTotal = BUCKET_ORDER.reduce(
      (sum, key) => sum + present[key],
      0,
    )
    const projectedTotal = BUCKET_ORDER.reduce(
      (sum, key) => sum + projected[key],
      0,
    )

    return {
      present,
      projected,
      presentTotal,
      projectedTotal,
      rows: BUCKET_ORDER.map((key) => ({
        key,
        ...BUCKET_META[key],
        presentPct: sharePct(present[key], presentTotal),
        projectedPct: sharePct(projected[key], projectedTotal),
      })).filter((row) => row.presentPct > 0 || row.projectedPct > 0),
    }
  }, [finalSnapshot.assetValues, plan.assets])

  return (
    <Card className="rounded-[10px]">
      <CardHeader className="px-6 pt-6">
        <CardTitle className="font-serif text-[19px] font-semibold tracking-tight">
          Portfolio
        </CardTitle>
        <CardDescription className="text-[13.5px]">
          Present versus projected mix.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-6 pb-6">
        {mix.presentTotal === 0 && mix.projectedTotal === 0 ? (
          <p className="text-sm text-muted-foreground">
            No funded assets yet. Open Assets to set balances and
            contributions.
          </p>
        ) : (
          <>
            <div className="space-y-5">
              <StackBar
                label="Present"
                amount={fmtCurrency(mix.presentTotal)}
                segments={BUCKET_ORDER.map((key) => ({
                  key,
                  color: BUCKET_META[key].color,
                  pct: sharePct(mix.present[key], mix.presentTotal),
                }))}
              />
              <StackBar
                label="Projected"
                amount={fmtCurrency(mix.projectedTotal)}
                segments={BUCKET_ORDER.map((key) => ({
                  key,
                  color: BUCKET_META[key].color,
                  pct: sharePct(mix.projected[key], mix.projectedTotal),
                }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {mix.rows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center gap-2 text-[12.5px] text-foreground"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: row.color }}
                    aria-hidden
                  />
                  <span>
                    {row.label} — {row.presentPct}% / {row.projectedPct}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function StackBar({
  label,
  amount,
  segments,
}: {
  label: string
  amount: string
  segments: Array<{ key: string; color: string; pct: number }>
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12.5px] font-semibold text-foreground">
          {label}
        </span>
        <span className="font-mono text-[11.5px] text-muted-foreground tabular-nums">
          {amount}
        </span>
      </div>
      <div className="flex h-3.5 overflow-hidden rounded-md bg-muted">
        {segments.map((segment) =>
          segment.pct > 0 ? (
            <div
              key={segment.key}
              className="h-full"
              style={{
                width: `${segment.pct}%`,
                backgroundColor: segment.color,
              }}
              title={`${segment.key} ${segment.pct}%`}
            />
          ) : null,
        )}
      </div>
    </div>
  )
}
