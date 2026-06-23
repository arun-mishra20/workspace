ALTER TABLE "rule_dashboards" ADD COLUMN "inline_rules" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "rule_dashboards" ALTER COLUMN "rule_ids" SET DEFAULT '[]'::jsonb;
