CREATE TABLE "holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"asset_type" varchar(50) NOT NULL,
	"platform" varchar(100),
	"quantity" numeric(18, 8) NOT NULL,
	"avg_buy_price" numeric(18, 2) NOT NULL,
	"current_price" numeric(18, 2),
	"invested_value" numeric(18, 2) NOT NULL,
	"current_value" numeric(18, 2),
	"total_returns" numeric(18, 2),
	"returns_percentage" numeric(10, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_category_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"merchant" text NOT NULL,
	"category" text NOT NULL,
	"subcategory" text NOT NULL,
	"category_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "transactions_user_dedupe_hash_idx";--> statement-breakpoint
ALTER TABLE "raw_emails" ADD COLUMN "category" text DEFAULT 'expenses' NOT NULL;--> statement-breakpoint
ALTER TABLE "sync_jobs" ADD COLUMN "category" text DEFAULT 'expenses' NOT NULL;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_category_rules" ADD CONSTRAINT "merchant_category_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "holdings_user_id_idx" ON "holdings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "holdings_symbol_user_idx" ON "holdings" USING btree ("symbol","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_rules_user_merchant_idx" ON "merchant_category_rules" USING btree ("user_id","merchant");--> statement-breakpoint
CREATE INDEX "raw_emails_user_category_idx" ON "raw_emails" USING btree ("user_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_user_source_email_idx" ON "transactions" USING btree ("user_id","source_email_id");--> statement-breakpoint
CREATE INDEX "transactions_dedupe_hash_idx" ON "transactions" USING btree ("dedupe_hash");