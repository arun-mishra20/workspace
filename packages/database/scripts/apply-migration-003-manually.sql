-- Manual application of migration 0003 (sync_jobs and unique index only)
-- This skips the type conversion since there's a schema drift issue

-- Create sync_jobs table
CREATE TABLE IF NOT EXISTS "sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,  -- Using uuid since DB has users.id as uuid
	"status" text DEFAULT 'pending' NOT NULL,
	"query" text,
	"total_emails" numeric(10, 0),
	"processed_emails" numeric(10, 0) DEFAULT '0',
	"new_emails" numeric(10, 0) DEFAULT '0',
	"transactions" numeric(10, 0) DEFAULT '0',
	"statements" numeric(10, 0) DEFAULT '0',
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraint for sync_jobs
ALTER TABLE "sync_jobs" ADD CONSTRAINT IF NOT EXISTS "sync_jobs_user_id_users_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Add unique index on raw_emails (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "raw_emails_user_provider_message_idx" 
  ON "raw_emails" USING btree ("user_id","provider","provider_message_id");
