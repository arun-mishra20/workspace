import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { usersTable } from './auth/users.schema.js'

export const ruleDashboardsTable = pgTable('rule_dashboards', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  ruleIds: jsonb('rule_ids').$type<string[]>().notNull().default([]),
  inlineRules: jsonb('inline_rules').$type<Array<{
    id: string
    name: string
    conditions: Record<string, unknown>
  }>>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type RuleDashboardRecord = typeof ruleDashboardsTable.$inferSelect
export type InsertRuleDashboard = typeof ruleDashboardsTable.$inferInsert
