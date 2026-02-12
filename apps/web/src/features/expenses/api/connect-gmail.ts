import { GmailConnectUrlSchema } from "@workspace/domain";

import { apiRequest } from "@/lib/api-client";

export async function connectGmail(): Promise<{ url: string }> {
  const json = await apiRequest({
    method: "GET",
    url: "/api/expenses/gmail/connect",
    headers: {
      Accept: "application/json",
    },
  });

  return GmailConnectUrlSchema.parse(json);
}
