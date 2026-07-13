import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { usersTable } from './auth/users.schema.js'

export const investmentPlansTable = pgTable('investment_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  baseCurrency: varchar('base_currency', { length: 3 }).notNull().default('INR'),
  startDate: date('start_date').notNull(),
  projectionHorizonMonths: integer('projection_horizon_months').notNull(),
  inflationRateBps: integer('inflation_rate_bps').notNull(),
  contributionTiming: varchar('contribution_timing', { length: 20 }).notNull().default('end'),
  revision: integer('revision').notNull().default(1),
  sourceSnapshot: jsonb('source_snapshot'),
  sourceRefreshedAt: timestamp('source_refreshed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({ userUpdatedIdx: index('investment_plans_user_updated_idx').on(table.userId, table.updatedAt) }))

export const investmentPlanAssetsTable = pgTable('investment_plan_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id').notNull().references(() => investmentPlansTable.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 30 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  currentValue: numeric('current_value', { precision: 18, scale: 2 }).notNull(),
  monthlyContribution: numeric('monthly_contribution', { precision: 18, scale: 2 }).notNull(),
  contributionEndDate: date('contribution_end_date'),
  annualEscalationBps: integer('annual_escalation_bps').notNull().default(0),
  expectedAnnualReturnBps: integer('expected_annual_return_bps').notNull(),
  returnBasis: varchar('return_basis', { length: 10 }).notNull().default('nominal'),
  growthModel: varchar('growth_model', { length: 20 }).notNull().default('market_return'),
  volatilityBps: integer('volatility_bps'),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull(),
}, (table) => ({ planOrderIdx: index('investment_plan_assets_plan_order_idx').on(table.planId, table.sortOrder) }))

export const investmentPlanEventsTable = pgTable('investment_plan_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  assetId: uuid('asset_id').notNull().references(() => investmentPlanAssetsTable.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(),
  effectiveDate: date('effective_date').notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  note: varchar('note', { length: 500 }),
}, (table) => ({ assetDateIdx: index('investment_plan_events_asset_date_idx').on(table.assetId, table.effectiveDate) }))

export const investmentPlanGoalsTable = pgTable('investment_plan_goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id').notNull().references(() => investmentPlansTable.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 30 }).notNull(),
  targetDate: date('target_date').notNull(),
  targetValueToday: numeric('target_value_today', { precision: 18, scale: 2 }),
  inflationRateBps: integer('inflation_rate_bps'),
  annualSpendingToday: numeric('annual_spending_today', { precision: 18, scale: 2 }),
  safeWithdrawalRateBps: integer('safe_withdrawal_rate_bps'),
}, (table) => ({ planTargetIdx: index('investment_plan_goals_plan_target_idx').on(table.planId, table.targetDate) }))

export const investmentPlanGoalAllocationsTable = pgTable('investment_plan_goal_allocations', {
  id: uuid('id').defaultRandom().primaryKey(),
  assetId: uuid('asset_id').notNull().references(() => investmentPlanAssetsTable.id, { onDelete: 'cascade' }),
  goalId: uuid('goal_id').notNull().references(() => investmentPlanGoalsTable.id, { onDelete: 'cascade' }),
  currentValueAllocationBps: integer('current_value_allocation_bps').notNull(),
  contributionAllocationBps: integer('contribution_allocation_bps').notNull(),
}, (table) => ({ assetGoalIdx: index('investment_plan_goal_allocations_asset_goal_idx').on(table.assetId, table.goalId) }))

export const investmentPlanScenariosTable = pgTable('investment_plan_scenarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id').notNull().references(() => investmentPlansTable.id, { onDelete: 'cascade' }),
  kind: varchar('kind', { length: 20 }).notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  marketReturnDeltaBps: integer('market_return_delta_bps').notNull(),
  inflationDeltaBps: integer('inflation_delta_bps').notNull(),
}, (table) => ({ planKindIdx: index('investment_plan_scenarios_plan_kind_idx').on(table.planId, table.kind) }))

export type InvestmentPlan = typeof investmentPlansTable.$inferSelect
export type InvestmentPlanAsset = typeof investmentPlanAssetsTable.$inferSelect
