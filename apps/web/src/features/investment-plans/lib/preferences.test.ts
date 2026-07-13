import { afterEach, describe, expect, it } from 'vitest'

import {
  getChartViewMode,
  getLastOpenedPlanId,
  setChartViewMode,
  setLastOpenedPlanId,
} from './preferences'

describe('investment plan preferences', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('stores and reads the last opened plan id', () => {
    expect(getLastOpenedPlanId()).toBeNull()
    setLastOpenedPlanId('plan-123')
    expect(getLastOpenedPlanId()).toBe('plan-123')
  })

  it('defaults chart view to nominal and persists real mode', () => {
    expect(getChartViewMode()).toBe('nominal')
    setChartViewMode('real')
    expect(getChartViewMode()).toBe('real')
  })
})
