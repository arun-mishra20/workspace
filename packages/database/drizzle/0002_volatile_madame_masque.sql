-- Drop all foreign keys referencing users.id
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "raw_emails" DROP CONSTRAINT IF EXISTS "raw_emails_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "statements" DROP CONSTRAINT IF EXISTS "statements_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_user_id_users_id_fk";--> statement-breakpoint
-- Add temporary uuid columns
ALTER TABLE "users" ADD COLUMN "id_uuid" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "user_id_uuid" uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "user_id_uuid" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "user_id_uuid" uuid;--> statement-breakpoint
ALTER TABLE "raw_emails" ADD COLUMN IF NOT EXISTS "user_id_uuid" uuid;--> statement-breakpoint
ALTER TABLE "statements" ADD COLUMN IF NOT EXISTS "user_id_uuid" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "user_id_uuid" uuid;--> statement-breakpoint
-- Update uuid columns with generated values, creating a mapping from old text ids to new uuids
UPDATE "users" SET "id_uuid" = gen_random_uuid();--> statement-breakpoint
UPDATE "accounts" SET "user_id_uuid" = (SELECT "id_uuid" FROM "users" WHERE "users"."id" = "accounts"."user_id");--> statement-breakpoint
UPDATE "profiles" SET "user_id_uuid" = (SELECT "id_uuid" FROM "users" WHERE "users"."id" = "profiles"."user_id");--> statement-breakpoint
UPDATE "sessions" SET "user_id_uuid" = (SELECT "id_uuid" FROM "users" WHERE "users"."id" = "sessions"."user_id");--> statement-breakpoint
UPDATE "raw_emails" SET "user_id_uuid" = (SELECT "id_uuid" FROM "users" WHERE "users"."id" = "raw_emails"."user_id") WHERE EXISTS (SELECT 1 FROM "users" WHERE "users"."id" = "raw_emails"."user_id");--> statement-breakpoint
UPDATE "statements" SET "user_id_uuid" = (SELECT "id_uuid" FROM "users" WHERE "users"."id" = "statements"."user_id") WHERE EXISTS (SELECT 1 FROM "users" WHERE "users"."id" = "statements"."user_id");--> statement-breakpoint
UPDATE "transactions" SET "user_id_uuid" = (SELECT "id_uuid" FROM "users" WHERE "users"."id" = "transactions"."user_id") WHERE EXISTS (SELECT 1 FROM "users" WHERE "users"."id" = "transactions"."user_id");--> statement-breakpoint
-- Drop old text columns
ALTER TABLE "users" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "raw_emails" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "statements" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "user_id";--> statement-breakpoint
-- Rename uuid columns to original names
ALTER TABLE "users" RENAME COLUMN "id_uuid" TO "id";--> statement-breakpoint
ALTER TABLE "accounts" RENAME COLUMN "user_id_uuid" TO "user_id";--> statement-breakpoint
ALTER TABLE "profiles" RENAME COLUMN "user_id_uuid" TO "user_id";--> statement-breakpoint
ALTER TABLE "sessions" RENAME COLUMN "user_id_uuid" TO "user_id";--> statement-breakpoint
ALTER TABLE "raw_emails" RENAME COLUMN "user_id_uuid" TO "user_id";--> statement-breakpoint
ALTER TABLE "statements" RENAME COLUMN "user_id_uuid" TO "user_id";--> statement-breakpoint
ALTER TABLE "transactions" RENAME COLUMN "user_id_uuid" TO "user_id";--> statement-breakpoint
-- Add NOT NULL constraints
ALTER TABLE "users" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "raw_emails" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "statements" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
-- Set users.id as primary key
ALTER TABLE "users" ADD PRIMARY KEY ("id");--> statement-breakpoint
-- Re-add foreign key constraints
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_emails" ADD CONSTRAINT "raw_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;