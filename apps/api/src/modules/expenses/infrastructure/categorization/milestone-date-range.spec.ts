import { describe, expect, it } from 'vitest'

import { computeMilestoneDateRange } from './milestone-date-range'

describe('computeMilestoneDateRange', () => {
  it('uses rolling membership year from MM-DD anniversary', () => {
    const now = new Date('2026-08-15T12:00:00')

    const range = computeMilestoneDateRange('yearly', {
      membershipStart: '06-30',
      now,
    })

    expect(range.start).toEqual(new Date('2026-06-30T00:00:00'))
    expect(range.end).toEqual(new Date('2027-06-30T00:00:00'))
    expect(range.label).toContain('30 Jun 2026')
    expect(range.label).toContain('29 Jun 2027')
  })

  it('rolls membership year back when before anniversary', () => {
    const now = new Date('2026-06-11T12:00:00')

    const range = computeMilestoneDateRange('yearly', {
      membershipStart: '06-30',
      now,
    })

    expect(range.start).toEqual(new Date('2025-06-30T00:00:00'))
    expect(range.end).toEqual(new Date('2026-06-30T00:00:00'))
  })

  it('starts first membership year on anniversary day', () => {
    const now = new Date('2026-06-11T12:00:00')

    const range = computeMilestoneDateRange('yearly', {
      membershipStart: '06-11',
      now,
    })

    expect(range.start).toEqual(new Date('2026-06-11T00:00:00'))
    expect(range.end).toEqual(new Date('2027-06-11T00:00:00'))
  })

  it('keeps calendar quarter for quarterly milestones', () => {
    const now = new Date('2026-08-15T12:00:00')

    const range = computeMilestoneDateRange('quarterly', {
      membershipStart: '06-11',
      now,
    })

    expect(range.start).toEqual(new Date('2026-07-01T00:00:00'))
    expect(range.end).toEqual(new Date('2026-10-01T00:00:00'))
    expect(range.label).toContain('Q3 2026')
  })
})
