import { apiRequest } from "@/lib/api-client";
import { GmailStatusSchema } from "@workspace/domain";

export async function disconnectGmail(): Promise<{
  connected: boolean;
  email?: string | null;
}> {
  const json = await apiRequest({
    method: "DELETE",
    url: "/api/expenses/gmail/disconnect",
    headers: {
      Accept: "application/json",
    },
    toastSuccess: true,
    successMessage: "Gmail disconnected",
  });

  return GmailStatusSchema.parse(json);
}
