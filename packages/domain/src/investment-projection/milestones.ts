import type { MilestoneHit, ProjectionResult } from './projection.schema.js'
import { MILESTONE_TARGETS } from './defaults.js'
import { computeAllocationAtMonth } from './projection-engine.js'

export function detectMilestones(result: ProjectionResult): MilestoneHit[] {
  const { snapshots } = result
  const startDate = snapshots[0]?.date ?? new Date()

  return MILESTONE_TARGETS.map(({ label, targetINR }) => {
    const alreadyAchieved = (snapshots[0]?.totalValue ?? 0) >= targetINR

    if (alreadyAchieved) {
      const snapshot = snapshots[0]!
      return {
        label,
        targetINR,
        month: 0,
        yearsFromNow: 0,
        date: startDate,
        composition: computeAllocationAtMonth(result, 0),
        investedAtHit: snapshot.totalInvested,
        gainsAtHit: snapshot.totalGains,
        achieved: true,
      }
    }

    const hitIndex = snapshots.findIndex((s) => s.totalValue >= targetINR)

    if (hitIndex < 0) {
      return {
        label,
        targetINR,
        month: -1,
        yearsFromNow: -1,
        date: startDate,
        composition: [],
        investedAtHit: 0,
        gainsAtHit: 0,
        achieved: false,
      }
    }

    const snapshot = snapshots[hitIndex]!

    return {
      label,
      targetINR,
      month: hitIndex,
      yearsFromNow: Math.round((hitIndex / 12) * 10) / 10,
      date: snapshot.date,
      composition: computeAllocationAtMonth(result, hitIndex),
      investedAtHit: snapshot.totalInvested,
      gainsAtHit: snapshot.totalGains,
      achieved: true,
    }
  })
}

export { MILESTONE_TARGETS }
