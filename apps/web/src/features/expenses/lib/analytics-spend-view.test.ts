import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

import {
  buildExcludeCategoriesParam,
  buildSpendExclusionSearchParams,
  countActiveSpendExclusions,
  DEFAULT_SPEND_EXCLUSION_PREFERENCES,
  formatSpendExclusionSummary,
  isDefaultSpendExclusionPreferences,
  readSpendExclusionPreferences,
  resolveSpendExclusionPreferences,
  writeSpendExclusionPreferences,
  ANALYTICS_SPEND_EXCLUSIONS_STORAGE_KEY,
} from '@/features/expenses/lib/analytics-spend-view'

describe('analytics-spend-view paid for someone', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults excludePaidForSomeone to true', () => {
    expect(DEFAULT_SPEND_EXCLUSION_PREFERENCES.excludePaidForSomeone).toBe(true)
    expect(isDefaultSpendExclusionPreferences(DEFAULT_SPEND_EXCLUSION_PREFERENCES)).toBe(true)
  })

  it('migrates older localStorage prefs without excludePaidForSomeone', () => {
    storage.set(
      ANALYTICS_SPEND_EXCLUSIONS_STORAGE_KEY,
      JSON.stringify({
        excludeCreditCardBills: true,
        excludeSelfTransfers: false,
      }),
    )

    expect(readSpendExclusionPreferences()).toEqual({
      excludeCreditCardBills: true,
      excludeSelfTransfers: false,
      excludePaidForSomeone: true,
    })
  })

  it('serializes all three exclusion tokens', () => {
    expect(
      buildExcludeCategoriesParam({
        excludeCreditCardBills: true,
        excludeSelfTransfers: true,
        excludePaidForSomeone: true,
      }),
    ).toBeUndefined()

    expect(
      buildExcludeCategoriesParam({
        excludeCreditCardBills: true,
        excludeSelfTransfers: true,
        excludePaidForSomeone: false,
      }),
    ).toBe('credit_card_bills,personal_transfer:self_transfer')

    expect(
      buildExcludeCategoriesParam({
        excludeCreditCardBills: false,
        excludeSelfTransfers: false,
        excludePaidForSomeone: true,
      }),
    ).toBe('paid_for_someone')

    expect(
      buildExcludeCategoriesParam({
        excludeCreditCardBills: false,
        excludeSelfTransfers: false,
        excludePaidForSomeone: false,
      }),
    ).toBe('')
  })

  it('reads and writes URL search params', () => {
    const params = new URLSearchParams(
      buildSpendExclusionSearchParams({
        excludeCreditCardBills: true,
        excludeSelfTransfers: false,
        excludePaidForSomeone: false,
      }),
    )

    expect(resolveSpendExclusionPreferences(params)).toEqual({
      excludeCreditCardBills: true,
      excludeSelfTransfers: false,
      excludePaidForSomeone: false,
    })
  })

  it('formats summary with three exclusions', () => {
    expect(formatSpendExclusionSummary(DEFAULT_SPEND_EXCLUSION_PREFERENCES)).toBe(
      'Excludes CC bill payments, self transfers, and paid for someone',
    )
    expect(countActiveSpendExclusions(DEFAULT_SPEND_EXCLUSION_PREFERENCES)).toBe(3)
  })

  it('persists preferences including excludePaidForSomeone', () => {
    writeSpendExclusionPreferences({
      excludeCreditCardBills: false,
      excludeSelfTransfers: true,
      excludePaidForSomeone: false,
    })

    expect(readSpendExclusionPreferences()).toEqual({
      excludeCreditCardBills: false,
      excludeSelfTransfers: true,
      excludePaidForSomeone: false,
    })
  })
})
