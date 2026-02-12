import { z } from "zod";

import { apiRequest } from "@/lib/api-client";

// ── Types ──

export const MerchantCategoryInfoSchema = z.object({
  merchant: z.string(),
  category: z.string(),
  subcategory: z.string(),
  transactionCount: z.number(),
});

export type MerchantCategoryInfo = z.infer<typeof MerchantCategoryInfoSchema>;

export const BulkCategorizeResponseSchema = z.object({
  merchant: z.string(),
  category: z.string(),
  subcategory: z.string(),
  updatedCount: z.number(),
});

export type BulkCategorizeResponse = z.infer<
  typeof BulkCategorizeResponseSchema
>;

export interface BulkCategorizeRequest {
  merchant: string;
  category: string;
  subcategory: string;
  categoryMetadata?: {
    icon: string;
    color: string;
    parent: string | null;
  };
}

// ── Fetchers ──

export async function fetchDistinctMerchants(): Promise<
  MerchantCategoryInfo[]
> {
  const json = await apiRequest<{ data: unknown[] }>({
    method: "GET",
    url: "/api/expenses/merchants",
  });
  return z.array(MerchantCategoryInfoSchema).parse(json.data);
}

export async function bulkCategorizeByMerchant(
  data: BulkCategorizeRequest,
): Promise<BulkCategorizeResponse> {
  const json = await apiRequest<{ data: unknown }>({
    method: "PATCH",
    url: "/api/expenses/transactions/bulk-categorize",
    data,
    toastSuccess: true,
    successMessage: "Transactions updated",
  });
  return BulkCategorizeResponseSchema.parse(json.data);
}
