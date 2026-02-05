import {
  date,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { usersTable } from "./auth/users.schema.js";

/**
 * Raw emails table definition
 *
 * Stores raw email payloads for reprocessing and auditability
 */
export const rawEmailsTable = pgTable(
  "raw_emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerMessageId: text("provider_message_id").notNull(),
    from: text("from").notNull(),
    subject: text("subject").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    bodyText: text("body_text").notNull(),
    bodyHtml: text("body_html"),
    rawHeaders: jsonb("raw_headers").notNull().$type<Record<string, string>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("raw_emails_user_provider_message_idx").on(
      table.userId,
      table.provider,
      table.providerMessageId,
      table.receivedAt,
    ),
  ],
);

/**
 * Statements table definition
 */
export const statementsTable = pgTable("statements", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  issuer: text("issuer").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  totalDue: numeric("total_due", { precision: 12, scale: 2 }).notNull(),
  sourceEmailId: uuid("source_email_id")
    .notNull()
    .references(() => rawEmailsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Transactions table definition
 */
export const transactionsTable = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  merchant: text("merchant").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  transactionDate: timestamp("transaction_date", {
    withTimezone: true,
  }).notNull(),
  category: text("category"),
  statementId: uuid("statement_id").references(() => statementsTable.id, {
    onDelete: "set null",
  }),
  sourceEmailId: uuid("source_email_id")
    .notNull()
    .references(() => rawEmailsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type RawEmailRecord = typeof rawEmailsTable.$inferSelect;
export type InsertRawEmail = typeof rawEmailsTable.$inferInsert;
export type StatementRecord = typeof statementsTable.$inferSelect;
export type InsertStatement = typeof statementsTable.$inferInsert;
export type TransactionRecord = typeof transactionsTable.$inferSelect;
export type InsertTransaction = typeof transactionsTable.$inferInsert;

/**
 * Sync job status enum
 */
export const SyncJobStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type SyncJobStatus = (typeof SyncJobStatus)[keyof typeof SyncJobStatus];

/**
 * Sync jobs table definition
 *
 * Tracks async email sync jobs
 */
export const syncJobsTable = pgTable("sync_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().$type<SyncJobStatus>().default("pending"),
  query: text("query"),
  totalEmails: numeric("total_emails", { precision: 10, scale: 0 }),
  processedEmails: numeric("processed_emails", {
    precision: 10,
    scale: 0,
  }).default("0"),
  newEmails: numeric("new_emails", { precision: 10, scale: 0 }).default("0"),
  transactions: numeric("transactions", { precision: 10, scale: 0 }).default(
    "0",
  ),
  statements: numeric("statements", { precision: 10, scale: 0 }).default("0"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type SyncJobRecord = typeof syncJobsTable.$inferSelect;
export type InsertSyncJob = typeof syncJobsTable.$inferInsert;
