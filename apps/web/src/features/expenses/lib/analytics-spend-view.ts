export interface SpendExclusionPreferences {
  excludeCreditCardBills: boolean
  excludeSelfTransfers: boolean
}

export const DEFAULT_SPEND_EXCLUSION_PREFERENCES: SpendExclusionPreferences = {
  excludeCreditCardBills: true,
  excludeSelfTransfers: true,
}

export const ANALYTICS_SPEND_EXCLUSIONS_STORAGE_KEY = 'expenses-analytics-spend-exclusions'

function isSpendExclusionPreferences(value: unknown): value is SpendExclusionPreferences {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Partial<SpendExclusionPreferences>
  return (
    typeof record.excludeCreditCardBills === 'boolean'
    && typeof record.excludeSelfTransfers === 'boolean'
  )
}

export function readSpendExclusionPreferences(): SpendExclusionPreferences {
  try {
    const raw = localStorage.getItem(ANALYTICS_SPEND_EXCLUSIONS_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_SPEND_EXCLUSION_PREFERENCES
    }

    const parsed = JSON.parse(raw) as unknown
    return isSpendExclusionPreferences(parsed)
      ? parsed
      : DEFAULT_SPEND_EXCLUSION_PREFERENCES
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

  if (excludeCreditCardBills !== undefined || excludeSelfTransfers !== undefined) {
    return {
      excludeCreditCardBills: excludeCreditCardBills ?? DEFAULT_SPEND_EXCLUSION_PREFERENCES.excludeCreditCardBills,
      excludeSelfTransfers: excludeSelfTransfers ?? DEFAULT_SPEND_EXCLUSION_PREFERENCES.excludeSelfTransfers,
    }
  }

  // Backward compatibility with the original single toggle
  const includeBillPayments = searchParams.get('includeBillPayments')
  if (includeBillPayments === '1') {
    return { excludeCreditCardBills: false, excludeSelfTransfers: false }
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

  if (tokens.length === 0) {
    return ''
  }

  if (
    preferences.excludeCreditCardBills
    && preferences.excludeSelfTransfers
  ) {
    return undefined
  }

  return tokens.join(',')
}

export function formatSpendExclusionSummary(preferences: SpendExclusionPreferences): string {
  if (!preferences.excludeCreditCardBills && !preferences.excludeSelfTransfers) {
    return 'Cash-flow view'
  }

  const excluded: string[] = []
  if (preferences.excludeCreditCardBills) {
    excluded.push('CC bill payments')
  }
  if (preferences.excludeSelfTransfers) {
    excluded.push('self transfers')
  }

  return `Excludes ${excluded.join(' and ')}`
}

export function isDefaultSpendExclusionPreferences(preferences: SpendExclusionPreferences): boolean {
  return (
    preferences.excludeCreditCardBills === DEFAULT_SPEND_EXCLUSION_PREFERENCES.excludeCreditCardBills
    && preferences.excludeSelfTransfers === DEFAULT_SPEND_EXCLUSION_PREFERENCES.excludeSelfTransfers
  )
}
