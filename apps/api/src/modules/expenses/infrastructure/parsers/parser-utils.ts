import { createHash } from "node:crypto";

export interface TransactionHashInput {
  userId: string;
  sourceEmailId: string;
  merchantRaw: string;
  amount: number;
  currency: string;
  transactionDate: string;
  transactionType: string;
  transactionMode: string;
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeMerchant(value: string): string {
  return normalizeWhitespace(value).replace(/[.,;:]+$/g, "");
}

export function buildTransactionHash(input: TransactionHashInput): string {
  const payload = JSON.stringify({
    userId: input.userId,
    sourceEmailId: input.sourceEmailId,
    merchantRaw: normalizeMerchant(input.merchantRaw).toLowerCase(),
    amount: Number(input.amount.toFixed(2)),
    currency: input.currency.toUpperCase(),
    transactionDate: input.transactionDate,
    transactionType: input.transactionType,
    transactionMode: input.transactionMode,
  });

  return createHash("sha256").update(payload).digest("hex");
}

export function deterministicUuidFromHash(hash: string): string {
  const base = hash.toLowerCase().replace(/[^a-f0-9]/g, "").padEnd(32, "0").slice(0, 32);

  const part1 = base.slice(0, 8);
  const part2 = base.slice(8, 12);
  const part3 = `5${base.slice(13, 16)}`;
  const variantNibble = ((parseInt(base.slice(16, 17), 16) & 0x3) | 0x8).toString(16);
  const part4 = `${variantNibble}${base.slice(17, 20)}`;
  const part5 = base.slice(20, 32);

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}
