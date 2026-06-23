import { z } from "zod";

import { apiRequest } from "@/lib/api-client";
import { RawEmailSchema } from "@workspace/domain";

const listExpenseEmailsSchema = z.object({
  object: z.literal("list"),
  data: z.array(RawEmailSchema),
  page: z.number(),
  page_size: z.number(),
  total: z.number(),
  has_more: z.boolean(),
});

export type ListExpenseEmailsResponse = z.infer<typeof listExpenseEmailsSchema>;

export async function listExpenseEmails(params?: {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}): Promise<ListExpenseEmailsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.page) {
    searchParams.set("page", params.page.toString());
  }

  if (params?.page_size) {
    searchParams.set("page_size", params.page_size.toString());
  }

  if (params?.sort_by) {
    searchParams.set("sort_by", params.sort_by);
  }

  if (params?.sort_order) {
    searchParams.set("sort_order", params.sort_order);
  }

  const url = `/api/expenses/emails${searchParams.toString() ? `?${searchParams}` : ""}`;
  const json = await apiRequest({
    method: "GET",
    url,
    headers: {
      Accept: "application/json",
    },
  });
  return listExpenseEmailsSchema.parse(json);
}
