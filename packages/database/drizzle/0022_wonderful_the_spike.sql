CREATE TABLE "investment_plan_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"category" varchar(30) NOT NULL,
	"name" varchar(100) NOT NULL,
	"current_value" numeric(18, 2) NOT NULL,
	"monthly_contribution" numeric(18, 2) NOT NULL,
	"contribution_end_date" date,
	"annual_escalation_bps" integer DEFAULT 0 NOT NULL,
	"expected_annual_return_bps" integer NOT NULL,
	"return_basis" varchar(10) DEFAULT 'nominal' NOT NULL,
	"growth_model" varchar(20) DEFAULT 'market_return' NOT NULL,
	"volatility_bps" integer,
	"notes" text,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_plan_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"effective_date" date NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"note" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "investment_plan_goal_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"current_value_allocation_bps" integer NOT NULL,
	"contribution_allocation_bps" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_plan_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(30) NOT NULL,
	"target_date" date NOT NULL,
	"target_value_today" numeric(18, 2),
	"inflation_rate_bps" integer,
	"annual_spending_today" numeric(18, 2),
	"safe_withdrawal_rate_bps" integer
);
--> statement-breakpoint
CREATE TABLE "investment_plan_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"kind" varchar(20) NOT NULL,
	"name" varchar(50) NOT NULL,
	"market_return_delta_bps" integer NOT NULL,
	"inflation_delta_bps" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"base_currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"start_date" date NOT NULL,
	"projection_horizon_months" integer NOT NULL,
	"inflation_rate_bps" integer NOT NULL,
	"contribution_timing" varchar(20) DEFAULT 'end' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"source_snapshot" jsonb,
	"source_refreshed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "investment_plan_assets" ADD CONSTRAINT "investment_plan_assets_plan_id_investment_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."investment_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_plan_events" ADD CONSTRAINT "investment_plan_events_asset_id_investment_plan_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."investment_plan_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_plan_goal_allocations" ADD CONSTRAINT "investment_plan_goal_allocations_asset_id_investment_plan_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."investment_plan_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_plan_goal_allocations" ADD CONSTRAINT "investment_plan_goal_allocations_goal_id_investment_plan_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."investment_plan_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_plan_goals" ADD CONSTRAINT "investment_plan_goals_plan_id_investment_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."investment_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_plan_scenarios" ADD CONSTRAINT "investment_plan_scenarios_plan_id_investment_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."investment_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_plans" ADD CONSTRAINT "investment_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "investment_plan_assets_plan_order_idx" ON "investment_plan_assets" USING btree ("plan_id","sort_order");--> statement-breakpoint
CREATE INDEX "investment_plan_events_asset_date_idx" ON "investment_plan_events" USING btree ("asset_id","effective_date");--> statement-breakpoint
CREATE INDEX "investment_plan_goal_allocations_asset_goal_idx" ON "investment_plan_goal_allocations" USING btree ("asset_id","goal_id");--> statement-breakpoint
CREATE INDEX "investment_plan_goals_plan_target_idx" ON "investment_plan_goals" USING btree ("plan_id","target_date");--> statement-breakpoint
CREATE INDEX "investment_plan_scenarios_plan_kind_idx" ON "investment_plan_scenarios" USING btree ("plan_id","kind");--> statement-breakpoint
CREATE INDEX "investment_plans_user_updated_idx" ON "investment_plans" USING btree ("user_id","updated_at");