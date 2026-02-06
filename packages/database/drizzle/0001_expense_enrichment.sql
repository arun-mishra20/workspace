ALTER TABLE "raw_emails"
ADD COLUMN IF NOT EXISTS "snippet" text DEFAULT '' NOT NULL;
--> statement-breakpoint

ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "dedupe_hash" text;
--> statement-breakpoint
ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "merchant_raw" text;
--> statement-breakpoint
ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "vpa" text;
--> statement-breakpoint
ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "transaction_type" text;
--> statement-breakpoint
ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "transaction_mode" text;
--> statement-breakpoint
ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "subcategory" text;
--> statement-breakpoint
ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "confidence" numeric(5, 4);
--> statement-breakpoint
ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "categorization_method" text;
--> statement-breakpoint
ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "requires_review" boolean;
--> statement-breakpoint
ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "category_metadata" jsonb;
--> statement-breakpoint

UPDATE "transactions"
SET "dedupe_hash" = COALESCE("dedupe_hash", "id"::text);
--> statement-breakpoint
UPDATE "transactions"
SET "merchant_raw" = COALESCE("merchant_raw", "merchant");
--> statement-breakpoint
UPDATE "transactions"
SET "transaction_type" = COALESCE("transaction_type", 'debited');
--> statement-breakpoint
UPDATE "transactions"
SET "transaction_mode" = COALESCE("transaction_mode", 'credit_card');
--> statement-breakpoint
UPDATE "transactions"
SET "category" = COALESCE("category", 'uncategorized');
--> statement-breakpoint
UPDATE "transactions"
SET "subcategory" = COALESCE("subcategory", "category");
--> statement-breakpoint
UPDATE "transactions"
SET "confidence" = COALESCE("confidence", 0);
--> statement-breakpoint
UPDATE "transactions"
SET "categorization_method" = COALESCE("categorization_method", 'default');
--> statement-breakpoint
UPDATE "transactions"
SET "requires_review" = COALESCE("requires_review", false);
--> statement-breakpoint
UPDATE "transactions"
SET "category_metadata" = COALESCE("category_metadata", '{"icon":"question-circle","color":"#BDC3C7","parent":null}'::jsonb);
--> statement-breakpoint

ALTER TABLE "transactions"
ALTER COLUMN "dedupe_hash" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "transactions"
ALTER COLUMN "merchant_raw" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "transactions"
ALTER COLUMN "transaction_type" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "transactions"
ALTER COLUMN "transaction_mode" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "transactions"
ALTER COLUMN "category" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "transactions"
ALTER COLUMN "subcategory" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "transactions"
ALTER COLUMN "confidence" SET DEFAULT '0';
--> statement-breakpoint
ALTER TABLE "transactions"
ALTER COLUMN "confidence" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "transactions"
ALTER COLUMN "categorization_method" SET DEFAULT 'default';
--> statement-breakpoint
ALTER TABLE "transactions"
ALTER COLUMN "categorization_method" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "transactions"
ALTER COLUMN "requires_review" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "transactions"
ALTER COLUMN "requires_review" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "transactions"
ALTER COLUMN "category_metadata" SET DEFAULT '{"icon":"question-circle","color":"#BDC3C7","parent":null}'::jsonb;
--> statement-breakpoint
ALTER TABLE "transactions"
ALTER COLUMN "category_metadata" SET NOT NULL;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "transactions_user_dedupe_hash_idx"
ON "transactions" USING btree ("user_id","dedupe_hash");
