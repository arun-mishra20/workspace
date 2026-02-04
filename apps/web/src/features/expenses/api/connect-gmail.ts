import { GmailConnectUrlSchema } from "@workspace/domain";

import { apiRequest } from "@/lib/api-request";

export async function connectGmail(): Promise<{ url: string }> {
  const response = await apiRequest("/api/expenses/gmail/connect", {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to start Gmail connection");
  }

  const json = await response.json();
  return GmailConnectUrlSchema.parse(json);
}
