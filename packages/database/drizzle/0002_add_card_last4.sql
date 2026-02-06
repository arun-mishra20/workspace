ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "card_last4" text;
--> statement-breakpoint
ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "card_name" text;
