import { GmailStatusSchema } from "@workspace/domain";

import { apiRequest } from "@/lib/api-client";

export async function fetchGmailStatus(): Promise<{ connected: boolean; email?: string | null }> {
  const json = await apiRequest({
    method: "GET",
    url: "/api/expenses/gmail/status",
    headers: {
      Accept: "application/json",
    },
  });

  return GmailStatusSchema.parse(json);
}
