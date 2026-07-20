export interface SpendExclusionPreferences {
  excludeCreditCardBills: boolean
  excludeSelfTransfers: boolean
  excludePaidForSomeone: boolean
}

export const DEFAULT_SPEND_EXCLUSION_PREFERENCES: SpendExclusionPreferences = {
  excludeCreditCardBills: true,
  excludeSelfTransfers: true,
  excludePaidForSomeone: true,
}

export const ANALYTICS_SPEND_EXCLUSIONS_STORAGE_KEY = 'expenses-analytics-spend-exclusions'

function normalizeSpendExclusionPreferences(
  value: Partial<SpendExclusionPreferences>,
): SpendExclusionPreferences | null {
  if (
    typeof value.excludeCreditCardBills !== 'boolean'
    || typeof value.excludeSelfTransfers !== 'boolean'
  ) {
    return null
  }

  return {
    excludeCreditCardBills: value.excludeCreditCardBills,
    excludeSelfTransfers: value.excludeSelfTransfers,
    // Migrate older localStorage prefs that lack this key → default on
    excludePaidForSomeone:
      typeof value.excludePaidForSomeone === 'boolean'
        ? value.excludePaidForSomeone
        : DEFAULT_SPEND_EXCLUSION_PREFERENCES.excludePaidForSomeone,
  }
}

export function readSpendExclusionPreferences(): SpendExclusionPreferences {
  try {
    const raw = localStorage.getItem(ANALYTICS_SPEND_EXCLUSIONS_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_SPEND_EXCLUSION_PREFERENCES
    }

    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_SPEND_EXCLUSION_PREFERENCES
    }

    return (
      normalizeSpendExclusionPreferences(parsed as Partial<SpendExclusionPreferences>)
      ?? DEFAULT_SPEND_EXCLUSION_PREFERENCES
    )
  } catch {
    return DEFAULT_SPEND_EXCLUSION_PREFERENCES
  }
}

export function writeSpendExclusionPreferences(preferences: SpendExclusionPreferences) {
  try {
    localStorage.setItem(ANALYTICS_SPEND_EXCLUSIONS_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // ignore storage failures
  }
}

function parseBooleanParam(value: string | null): boolean | undefined {
  if (value === '1') return true
  if (value === '0') return false
  return undefined
}

export function resolveSpendExclusionPreferences(
  searchParams: URLSearchParams,
): SpendExclusionPreferences {
  const excludeCreditCardBills = parseBooleanParam(searchParams.get('excludeCcBills'))
  const excludeSelfTransfers = parseBooleanParam(searchParams.get('excludeSelfTransfers'))
  const excludePaidForSomeone = parseBooleanParam(searchParams.get('excludePaidForSomeone'))

  if (
    excludeCreditCardBills !== undefined
    || excludeSelfTransfers !== undefined
    || excludePaidForSomeone !== undefined
  ) {
    return {
      excludeCreditCardBills:
        excludeCreditCardBills ?? DEFAULT_SPEND_EXCLUSION_PREFERENCES.excludeCreditCardBills,
      excludeSelfTransfers:
        excludeSelfTransfers ?? DEFAULT_SPEND_EXCLUSION_PREFERENCES.excludeSelfTransfers,
      excludePaidForSomeone:
        excludePaidForSomeone ?? DEFAULT_SPEND_EXCLUSION_PREFERENCES.excludePaidForSomeone,
    }
  }

  // Backward compatibility with the original single toggle
  const includeBillPayments = searchParams.get('includeBillPayments')
  if (includeBillPayments === '1') {
    return {
      excludeCreditCardBills: false,
      excludeSelfTransfers: false,
      excludePaidForSomeone: false,
    }
  }
  if (includeBillPayments === '0') {
    return DEFAULT_SPEND_EXCLUSION_PREFERENCES
  }

  return readSpendExclusionPreferences()
}

export function buildSpendExclusionSearchParams(
  preferences: SpendExclusionPreferences,
): Record<string, string> {
  return {
    excludeCcBills: preferences.excludeCreditCardBills ? '1' : '0',
    excludeSelfTransfers: preferences.excludeSelfTransfers ? '1' : '0',
    excludePaidForSomeone: preferences.excludePaidForSomeone ? '1' : '0',
  }
}

export function buildExcludeCategoriesParam(preferences: SpendExclusionPreferences): string | undefined {
  const tokens: string[] = []
  if (preferences.excludeCreditCardBills) {
    tokens.push('credit_card_bills')
  }
  if (preferences.excludeSelfTransfers) {
    tokens.push('personal_transfer:self_transfer')
  }
  if (preferences.excludePaidForSomeone) {
    tokens.push('paid_for_someone')
  }

  if (tokens.length === 0) {
    return ''
  }

  if (
    preferences.excludeCreditCardBills
    && preferences.excludeSelfTransfers
    && preferences.excludePaidForSomeone
  ) {
    return undefined
  }

  return tokens.join(',')
}

export function countActiveSpendExclusions(
  preferences: SpendExclusionPreferences,
): number {
  return (
    (preferences.excludeCreditCardBills ? 1 : 0)
    + (preferences.excludeSelfTransfers ? 1 : 0)
    + (preferences.excludePaidForSomeone ? 1 : 0)
  )
}

export function formatSpendExclusionSummary(preferences: SpendExclusionPreferences): string {
  if (
    !preferences.excludeCreditCardBills
    && !preferences.excludeSelfTransfers
    && !preferences.excludePaidForSomeone
  ) {
    return 'Cash-flow view'
  }

  const excluded: string[] = []
  if (preferences.excludeCreditCardBills) {
    excluded.push('CC bill payments')
  }
  if (preferences.excludeSelfTransfers) {
    excluded.push('self transfers')
  }
  if (preferences.excludePaidForSomeone) {
    excluded.push('paid for someone')
  }

  if (excluded.length === 1) {
    return `Excludes ${excluded[0]}`
  }

  if (excluded.length === 2) {
    return `Excludes ${excluded[0]} and ${excluded[1]}`
  }

  return `Excludes ${excluded.slice(0, -1).join(', ')}, and ${excluded[excluded.length - 1]}`
}

export function isDefaultSpendExclusionPreferences(preferences: SpendExclusionPreferences): boolean {
  return (
    preferences.excludeCreditCardBills === DEFAULT_SPEND_EXCLUSION_PREFERENCES.excludeCreditCardBills
    && preferences.excludeSelfTransfers === DEFAULT_SPEND_EXCLUSION_PREFERENCES.excludeSelfTransfers
    && preferences.excludePaidForSomeone === DEFAULT_SPEND_EXCLUSION_PREFERENCES.excludePaidForSomeone
  )
}
