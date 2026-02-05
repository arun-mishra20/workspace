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
}): Promise<ListExpenseEmailsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.page) {
    searchParams.set("page", params.page.toString());
  }

  if (params?.page_size) {
    searchParams.set("page_size", params.page_size.toString());
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
