import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AssetClass, ProjectionScenario } from '@workspace/domain'
import { createDefaultAssetClasses, createDefaultScenario } from '@workspace/domain'
import { usePrincipalAnalytics } from '@/features/principal/api/principal'
import { usePortfolioSummary } from '@/features/holdings/api/holdings'
import { fetchInvestmentAnalytics } from '@/features/expenses/api/investment-analytics'
import { fmtCurrency } from '../lib/format-utils'

const LAKHS = 100_000

function mapAssetTypeToName(assetType: string): string {
  const map: Record<string, string> = {
    stock: 'Indian Equity',
    mutual_fund: 'Mutual Funds',
    gold: 'Gold',
    etf: 'US Equity',
    pf: 'PPF',
  }
  return map[assetType] ?? assetType
}

export interface IntelligentDefaultsSuggestion {
  hasData: boolean
  message: string
  scenarioPatch: Partial<ProjectionScenario>
  avgMonthly: number | null
  avgYearly: number | null
  avgIncrease: number | null
  monthlyTrend: { label: string; value: number }[]
}

export function useIntelligentDefaults() {
  const { data: principal, isLoading: principalLoading } = usePrincipalAnalytics()
  const { data: holdings, isLoading: holdingsLoading } = usePortfolioSummary()
  const { data: patterns, isLoading: patternsLoading } = useQuery({
    queryKey: ['investment-patterns', 'year'],
    queryFn: () => fetchInvestmentAnalytics('year'),
    staleTime: 5 * 60 * 1000,
  })

  const suggestion = useMemo((): IntelligentDefaultsSuggestion | null => {
    const hasPrincipal = !!principal?.contributionMetrics.totalINR
    const hasHoldings = !!holdings?.totalCurrentValue
    const hasPatterns = !!patterns?.avgInvestment

    if (!hasPrincipal && !hasHoldings && !hasPatterns) return null

    let avgMonthly: number | null = null
    if (principal?.contributionMetrics.averageMonthlyLakhs) {
      avgMonthly = principal.contributionMetrics.averageMonthlyLakhs * LAKHS
    } else if (patterns?.detectedSips?.[0]?.avgAmount) {
      avgMonthly = patterns.detectedSips[0].avgAmount
    } else if (patterns?.avgInvestment) {
      avgMonthly = patterns.avgInvestment
    }

    let portfolioValue = 0
    if (principal?.distributionMetrics.totalPortfolioValue) {
      portfolioValue = principal.distributionMetrics.totalPortfolioValue
    } else if (holdings?.totalCurrentValue) {
      portfolioValue = holdings.totalCurrentValue
    }

    const assetClasses: AssetClass[] = createDefaultAssetClasses()

    if (principal?.distributionMetrics.allocations.length) {
      for (const alloc of principal.distributionMetrics.allocations) {
        const match = assetClasses.find(
          (a) => a.name.toLowerCase() === alloc.name.toLowerCase(),
        )
        if (match) {
          match.currentValue = alloc.value
        }
      }
    } else if (holdings?.assetTypeBreakdown.length) {
      for (const breakdown of holdings.assetTypeBreakdown) {
        const name = mapAssetTypeToName(breakdown.assetType)
        const match = assetClasses.find((a) => a.name === name)
        if (match) {
          match.currentValue = breakdown.currentValue
          match.expectedReturn = breakdown.returnsPercentage || match.expectedReturn
        }
      }
    }

    if (avgMonthly) {
      const totalMonthly = assetClasses.reduce((s, a) => s + a.monthlyInvestment, 0)
      if (totalMonthly === 0) {
        const activeAssets = assetClasses.filter((a) => a.currentValue > 0)
        const perAsset = activeAssets.length > 0 ? avgMonthly / activeAssets.length : avgMonthly
        for (const asset of assetClasses) {
          if (asset.currentValue > 0 || activeAssets.length === 0) {
            asset.monthlyInvestment = perAsset
          }
        }
      }
    }

    const avgIncrease = principal?.contributionMetrics.trendIncreasing
      ? principal.contributionMetrics.momChanges.reduce((s, c) => s + c.change, 0) /
        Math.max(1, principal.contributionMetrics.momChanges.length)
      : null

    const monthlyTrend =
      patterns?.monthlyTrend.map((m) => ({
        label: m.month,
        value: m.totalInvested,
      })) ??
      principal?.contributionMetrics.cumulativeSeries.map((c) => ({
        label: c.label,
        value: c.cumulative * LAKHS,
      })) ??
      []

    const message = avgMonthly
      ? `Based on your history, your average monthly investment is approximately ${fmtCurrency(avgMonthly)}.`
      : portfolioValue > 0
        ? `We found a portfolio value of ${fmtCurrency(portfolioValue)} from your data.`
        : 'We found investment data that can prefill your calculator.'

    return {
      hasData: true,
      message,
      avgMonthly,
      avgYearly: avgMonthly ? avgMonthly * 12 : null,
      avgIncrease,
      monthlyTrend,
      scenarioPatch: {
        basicSIP: {
          frequency: 'monthly' as const,
          amount: avgMonthly ?? 10_000,
          durationValue: 10,
          durationUnit: 'years' as const,
          annualReturn: holdings?.totalReturnsPercentage ?? 12,
        },
        existingInvestments: {
          enabled: portfolioValue > 0,
          currentPortfolio: portfolioValue,
          lumpSums: [],
          futureLumpSums: [],
          existingMonthly: 0,
        },
        multiAsset: {
          enabled: assetClasses.some((a) => a.currentValue > 0),
          assetClasses,
        },
        stepUp: avgIncrease && avgIncrease > 0
          ? { enabled: false, annualIncrementPercent: Math.round(avgIncrease) }
          : undefined,
      },
    }
  }, [principal, holdings, patterns])

  const applyDefaults = (): ProjectionScenario => {
    if (!suggestion) return createDefaultScenario()
    return createDefaultScenario(suggestion.scenarioPatch)
  }

  return {
    suggestion,
    applyDefaults,
    isLoading: principalLoading || holdingsLoading || patternsLoading,
  }
}
