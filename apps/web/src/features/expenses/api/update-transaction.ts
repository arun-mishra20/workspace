import { z } from "zod";

import { apiRequest } from "@/lib/api-client";
import { TransactionSchema, UpdateTransactionSchema } from "@workspace/domain";

export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;

export async function updateTransaction(
  id: string,
  data: UpdateTransactionInput,
): Promise<z.infer<typeof TransactionSchema>> {
  const json = await apiRequest({
    method: "PATCH",
    url: `/api/expenses/transactions/${id}`,
    data,
    successMessage: "Transaction updated",
    toastSuccess: true,
  });
  return TransactionSchema.parse(json);
}
