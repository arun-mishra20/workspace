import { useCallback, useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

import {
  buildExpensesDrillDownUrl,
  type ExpensesDrillDownParams,
} from '@/features/expenses/lib/build-expenses-drill-down-url'

export function useAnalyticsDrillDown() {
  const [searchParams] = useSearchParams()
  const { pathname } = useLocation()

  const returnTo = useMemo(() => {
    const query = searchParams.toString()
    return query ? `${pathname}?${query}` : pathname
  }, [pathname, searchParams])

  return useCallback(
    (params: Omit<ExpensesDrillDownParams, 'returnTo'>) =>
      buildExpensesDrillDownUrl({ ...params, returnTo }),
    [returnTo],
  )
}
