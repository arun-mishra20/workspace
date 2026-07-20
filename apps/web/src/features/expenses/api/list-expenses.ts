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
  subcategory?: string;
  mode?: string;
  categorization_method?: string;
  review?: string;
  paid_for_someone?: "true" | "pending" | "settled";
  date_from?: string;
  date_to?: string;
  search?: string;
  card_last4?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
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

  if (params?.subcategory) {
    searchParams.set("subcategory", params.subcategory);
  }

  if (params?.mode) {
    searchParams.set("mode", params.mode);
  }

  if (params?.categorization_method) {
    searchParams.set("categorization_method", params.categorization_method);
  }

  if (params?.review) {
    searchParams.set("review", params.review);
  }

  if (params?.paid_for_someone) {
    searchParams.set("paid_for_someone", params.paid_for_someone);
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

  if (params?.card_last4) {
    searchParams.set("card_last4", params.card_last4);
  }

  if (params?.sort_by) {
    searchParams.set("sort_by", params.sort_by);
  }

  if (params?.sort_order) {
    searchParams.set("sort_order", params.sort_order);
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
