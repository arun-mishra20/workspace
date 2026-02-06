import { z } from "zod";

import { apiRequest } from "@/lib/api-client";
import { TransactionSchema } from "@workspace/domain";

const listExpensesSchema = z.object({
  object: z.literal("list"),
  data: z.array(TransactionSchema),
  page: z.number(),
  page_size: z.number(),
  total: z.number(),
  has_more: z.boolean(),
});

export type ListExpensesResponse = z.infer<typeof listExpensesSchema>;

export async function listExpenses(params?: {
  page?: number;
  page_size?: number;
}): Promise<ListExpensesResponse> {
  const searchParams = new URLSearchParams();

  if (params?.page) {
    searchParams.set("page", params.page.toString());
  }

  if (params?.page_size) {
    searchParams.set("page_size", params.page_size.toString());
  }

  const url = `/api/expenses/transactions${searchParams.toString() ? `?${searchParams}` : ""}`;
  const json = await apiRequest({
    method: "GET",
    url,
    headers: {
      Accept: "application/json",
    },
  });
  return listExpensesSchema.parse(json);
}
