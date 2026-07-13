import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError, apiClient } from '@/lib/api-client'

import type { InvestmentPlanInput } from '@workspace/domain'

export type PersistedInvestmentPlan = InvestmentPlanInput & {
  revision: number
  updatedAt: string
}

export type InvestmentPlanSummary = {
  id: string
  name: string
  revision: number
  updatedAt: string
}

export type InvestmentPlanRefreshResult = {
  proposal: { assets: { category: string; currentValue: number }[] }
  diff: {
    added: { category: string; currentValue: number }[]
    changed: { category: string; from: number; to: number }[]
    removed: { category: string; currentValue: number }[]
  }
}

export class RevisionConflictError extends Error {
  constructor(message = 'This plan was changed on another device.') {
    super(message)
    this.name = 'RevisionConflictError'
  }
}

export const investmentPlanKeys = {
  all: ['investment-plans'] as const,
  list: () => [...investmentPlanKeys.all, 'list'] as const,
  detail: (id: string) => [...investmentPlanKeys.all, 'detail', id] as const,
}

export function useInvestmentPlans() {
  return useQuery({
    queryKey: investmentPlanKeys.list(),
    queryFn: async () => {
      const response = await apiClient.get<InvestmentPlanSummary[]>('/api/investment-plans')
      return response.data
    },
  })
}

export function useInvestmentPlan(id: string | null) {
  return useQuery({
    queryKey: investmentPlanKeys.detail(id ?? 'none'),
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await apiClient.get<PersistedInvestmentPlan>(`/api/investment-plans/${id}`)
      return response.data
    },
  })
}

export function useCreateInvestmentPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (plan: InvestmentPlanInput) => {
      const response = await apiClient.post<PersistedInvestmentPlan>('/api/investment-plans', plan)
      return response.data
    },
    onSuccess: (plan) => {
      void queryClient.invalidateQueries({ queryKey: investmentPlanKeys.all })
      queryClient.setQueryData(investmentPlanKeys.detail(plan.id), plan)
    },
  })
}

export function useReplaceInvestmentPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      revision,
      plan,
    }: {
      id: string
      revision: number
      plan: InvestmentPlanInput
    }) => {
      try {
        const response = await apiClient.put<PersistedInvestmentPlan>(`/api/investment-plans/${id}`, {
          revision,
          plan,
        })
        return response.data
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          throw new RevisionConflictError(error.detail ?? error.message)
        }
        throw error
      }
    },
    onSuccess: (plan) => {
      queryClient.setQueryData(investmentPlanKeys.detail(plan.id), plan)
      void queryClient.invalidateQueries({ queryKey: investmentPlanKeys.list() })
    },
  })
}

export function useDeleteInvestmentPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/investment-plans/${id}`)
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: investmentPlanKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: investmentPlanKeys.list() })
    },
  })
}

export function useRefreshInvestmentPlanSource() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<InvestmentPlanRefreshResult>(
        `/api/investment-plans/${id}/refresh-source`,
      )
      return response.data
    },
  })
}
