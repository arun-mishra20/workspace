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

export interface ListExpensesParams {
  page?: number;
  page_size?: number;
  category?: string;
  mode?: string;
  review?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export async function listExpenses(
  params?: ListExpensesParams,
): Promise<ListExpensesResponse> {
  const searchParams = new URLSearchParams();

  if (params?.page) {
    searchParams.set("page", params.page.toString());
  }

  if (params?.page_size) {
    searchParams.set("page_size", params.page_size.toString());
  }

  if (params?.category) {
    searchParams.set("category", params.category);
  }

  if (params?.mode) {
    searchParams.set("mode", params.mode);
  }

  if (params?.review) {
    searchParams.set("review", params.review);
  }

  if (params?.date_from) {
    searchParams.set("date_from", params.date_from);
  }

  if (params?.date_to) {
    searchParams.set("date_to", params.date_to);
  }

  if (params?.search) {
    searchParams.set("search", params.search);
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
