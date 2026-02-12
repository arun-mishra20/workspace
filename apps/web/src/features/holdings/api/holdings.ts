import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  Holding,
  PortfolioSummary,
  CreateHolding,
} from "@workspace/domain";

export const holdingsKeys = {
  all: ["holdings"] as const,
  list: () => [...holdingsKeys.all, "list"] as const,
  summary: () => [...holdingsKeys.all, "summary"] as const,
  detail: (id: string) => [...holdingsKeys.all, "detail", id] as const,
};

export function useHoldings() {
  return useQuery({
    queryKey: holdingsKeys.list(),
    queryFn: async () => {
      const response = await apiClient.get<Holding[]>("/api/holdings");
      return response.data;
    },
  });
}

export function usePortfolioSummary() {
  return useQuery({
    queryKey: holdingsKeys.summary(),
    queryFn: async () => {
      const response = await apiClient.get<PortfolioSummary>(
        "/api/holdings/summary",
      );
      return response.data;
    },
  });
}

export function useHolding(id: string) {
  return useQuery({
    queryKey: holdingsKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<Holding>(`/api/holdings/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateHolding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateHolding) => {
      const response = await apiClient.post<Holding>("/api/holdings", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holdingsKeys.all });
    },
  });
}

export function useUpdateHolding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateHolding>;
    }) => {
      const response = await apiClient.put<Holding>(
        `/api/holdings/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holdingsKeys.all });
    },
  });
}

export function useDeleteHolding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/holdings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holdingsKeys.all });
    },
  });
}

export function useImportFromGroww() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jsonString: string) => {
      const response = await apiClient.post<{
        imported: number;
        skipped: number;
        errors: string[];
      }>("/api/holdings/import/groww", {
        json: jsonString,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holdingsKeys.all });
    },
  });
}
