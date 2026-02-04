import { z } from "zod";

import { apiRequest } from "@/lib/api-request";
import { RawEmailSchema } from "@workspace/domain";

const listExpenseEmailsSchema = z.array(RawEmailSchema);

export type ListExpenseEmailsResponse = z.infer<typeof listExpenseEmailsSchema>;

export async function listExpenseEmails(params?: {
  limit?: number;
  offset?: number;
}): Promise<ListExpenseEmailsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.limit) {
    searchParams.set("limit", params.limit.toString());
  }

  if (params?.offset) {
    searchParams.set("offset", params.offset.toString());
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
