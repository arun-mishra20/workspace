import { apiRequest } from "@/lib/api-request";
import { GmailStatusSchema } from "@workspace/domain";

export async function disconnectGmail(): Promise<{
  connected: boolean;
  email?: string | null;
}> {
  const response = await apiRequest("/api/expenses/gmail/disconnect", {
    method: "DELETE",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to disconnect Gmail");
  }

  const json = await response.json();
  return GmailStatusSchema.parse(json);
}
