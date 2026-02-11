import { z } from "zod";

import { apiRequest } from "@/lib/api-client";

// ── Types ──

export interface BulkUpdateRequest {
  ids: string[];
  data: {
    category?: string;
    subcategory?: string;
    transactionMode?: string;
    requiresReview?: boolean;
  };
}

const BulkUpdateResponseSchema = z.object({
  updatedCount: z.number(),
});

export type BulkUpdateResponse = z.infer<typeof BulkUpdateResponseSchema>;

// ── Fetcher ──

export async function bulkUpdateTransactions(
  request: BulkUpdateRequest,
): Promise<BulkUpdateResponse> {
  const json = await apiRequest<{ data: unknown }>({
    method: "PATCH",
    url: "/api/expenses/transactions/bulk-update",
    data: request,
    toastSuccess: true,
    successMessage: "Transactions updated",
  });
  return BulkUpdateResponseSchema.parse(json.data);
}
