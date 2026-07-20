import { ASSET_CATEGORY_LABELS } from '@workspace/domain'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/ui/table'

import { fmtCurrency, fmtPercentFromBps } from '@/features/investment-plans/lib/format'

import type { InvestmentPlanInput, InvestmentPlanSnapshot } from '@workspace/domain'

interface PlanPortfolioSectionProps {
  plan: InvestmentPlanInput
  finalSnapshot: InvestmentPlanSnapshot
}

export function PlanPortfolioSection({ plan, finalSnapshot }: PlanPortfolioSectionProps) {
  const currentTotal = plan.assets.reduce((sum, asset) => sum + asset.currentValue, 0)
  const projectedTotal = finalSnapshot.totalValue

  const rows = plan.assets
    .map((asset) => {
      const projected = finalSnapshot.assetValues[asset.id] ?? 0
      const allocatedCurrent = plan.goalAllocations
        .filter((allocation) => allocation.assetId === asset.id)
        .reduce((sum, allocation) => sum + allocation.currentValueAllocationBps, 0)
      return {
        asset,
        projected,
        unallocatedBps: Math.max(0, 10_000 - allocatedCurrent),
        currentShare: currentTotal > 0 ? asset.currentValue / currentTotal : 0,
        projectedShare: projectedTotal > 0 ? projected / projectedTotal : 0,
      }
    })
    .filter((row) => row.asset.currentValue > 0 || row.asset.monthlyContribution > 0 || row.projected > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-lg font-semibold tracking-tight">
          Portfolio
        </CardTitle>
        <CardDescription>
          Present versus projected mix. Unallocated remains explicitly outside goal buckets.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Now</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Monthly</TableHead>
              <TableHead className="text-right">Projected</TableHead>
              <TableHead className="text-right hidden md:table-cell">Return</TableHead>
              <TableHead className="text-right">Unallocated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No funded assets yet. Open Assets to set balances and contributions.
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ asset, projected, unallocatedBps }) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <div className="font-medium">{asset.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {ASSET_CATEGORY_LABELS[asset.category]}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtCurrency(asset.currentValue)}</TableCell>
                  <TableCell className="text-right tabular-nums hidden sm:table-cell">
                    {fmtCurrency(asset.monthlyContribution)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtCurrency(projected)}</TableCell>
                  <TableCell className="text-right tabular-nums hidden md:table-cell">
                    {fmtPercentFromBps(asset.expectedAnnualReturnBps)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtPercentFromBps(unallocatedBps, 0)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
