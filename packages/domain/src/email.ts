import { z } from "zod";

export const RawEmailSchema = z.object({
  id: z.string(),
  userId: z.string(),
  provider: z.enum(["gmail", "outlook"]),
  providerMessageId: z.string(),
  from: z.string(),
  subject: z.string(),
  receivedAt: z.string(),
  bodyText: z.string(),
  bodyHtml: z.string().optional(),
  rawHeaders: z.record(z.string(), z.string()),
});

export type RawEmail = z.infer<typeof RawEmailSchema>;

export const GmailConnectUrlSchema = z.object({
  url: z.string().url(),
});

export const GmailStatusSchema = z.object({
  connected: z.boolean(),
  email: z.string().nullable().optional(),
});
