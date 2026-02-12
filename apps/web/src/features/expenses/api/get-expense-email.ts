import { RawEmailSchema, type RawEmail } from "@workspace/domain";

import { apiRequest } from "@/lib/api-client";

export async function getExpenseEmail(id: string): Promise<RawEmail> {
  const json = await apiRequest({
    method: "GET",
    url: `/api/expenses/emails/${id}`,
    headers: {
      Accept: "application/json",
    },
  });

  return RawEmailSchema.parse(json);
}

