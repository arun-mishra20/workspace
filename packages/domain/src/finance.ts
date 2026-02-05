import { z, type ZodType } from "zod";

export const TransactionSchema: ZodType<Transaction> = z.object({
  id: z.string(),
  userId: z.string(),
  merchant: z.string(),
  amount: z.number(),
  currency: z.string(),
  transactionDate: z.string(),
  category: z.string().optional(),
  statementId: z.string().optional(),
  sourceEmailId: z.string(),
});

export const StatementSchema: ZodType<Statement> = z.object({
  id: z.string(),
  userId: z.string(),
  issuer: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  totalDue: z.number(),
  sourceEmailId: z.string(),
});

export interface Transaction {
  id: string;
  userId: string;
  merchant: string;
  amount: number;
  currency: string;
  transactionDate: string;
  category?: string;
  statementId?: string;
  sourceEmailId: string;
}

export interface Statement {
  id: string;
  userId: string;
  issuer: string;
  periodStart: string;
  periodEnd: string;
  totalDue: number;
  sourceEmailId: string;
}

export const SyncExpensesResultSchema: ZodType<SyncExpensesResult> = z.object({
  syncedEmails: z.number(),
  transactions: z.number(),
  statements: z.number(),
});

export interface SyncExpensesResult {
  syncedEmails: number;
  transactions: number;
  statements: number;
}

// Sync Job schemas for async processing
export const SyncJobStatusEnum: ZodType<SyncJobStatus> = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);

export type SyncJobStatus = "pending" | "processing" | "completed" | "failed";

export const SyncJobSchema: ZodType<SyncJob> = z.object({
  id: z.string(),
  userId: z.string(),
  status: SyncJobStatusEnum,
  query: z.string().nullable(),
  totalEmails: z.number().nullable(),
  processedEmails: z.number(),
  newEmails: z.number(),
  transactions: z.number(),
  statements: z.number(),
  errorMessage: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export interface SyncJob {
  id: string;
  userId: string;
  status: SyncJobStatus;
  query: string | null;
  totalEmails: number | null;
  processedEmails: number;
  newEmails: number;
  transactions: number;
  statements: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const StartSyncJobResponseSchema: ZodType<StartSyncJobResponse> =
  z.object({
    jobId: z.string(),
    message: z.string(),
  });

export interface StartSyncJobResponse {
  jobId: string;
  message: string;
}
