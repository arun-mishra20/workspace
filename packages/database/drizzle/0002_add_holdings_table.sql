ALTER TABLE "accounts" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "raw_emails" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "statements" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "sync_jobs" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "category" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "raw_emails" ADD COLUMN "snippet" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "dedupe_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "merchant_raw" text NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "vpa" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "transaction_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "transaction_mode" text NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "card_last4" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "card_name" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "subcategory" text NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "confidence" numeric(5, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "categorization_method" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "requires_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "category_metadata" jsonb DEFAULT '{"icon":"question-circle","color":"#BDC3C7","parent":null}'::jsonb NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_user_dedupe_hash_idx" ON "transactions" USING btree ("user_id","dedupe_hash");