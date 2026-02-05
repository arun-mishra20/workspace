import { z } from "zod";

import { apiRequest } from "@/lib/api-request";
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
  const response = await apiRequest(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load expense emails");
  }

  const json = await response.json();
  return listExpenseEmailsSchema.parse(json);
}
