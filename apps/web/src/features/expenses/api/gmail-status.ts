import { GmailStatusSchema } from "@workspace/domain";

import { apiRequest } from "@/lib/api-request";

export async function fetchGmailStatus(): Promise<{ connected: boolean; email?: string | null }> {
  const response = await apiRequest("/api/expenses/gmail/status", {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load Gmail status");
  }

  const json = await response.json();
  return GmailStatusSchema.parse(json);
}
