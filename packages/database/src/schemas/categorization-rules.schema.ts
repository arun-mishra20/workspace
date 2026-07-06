import {
  boolean,
  integer,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { usersTable } from './auth/users.schema.js'

export const categorizationRulesTable = pgTable(
  'categorization_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    priority: integer('priority').notNull().default(0),
    conditions: jsonb('conditions').$type<Record<string, unknown>>().notNull(),
    action: jsonb('action').$type<Record<string, unknown>>().notNull(),
    hitCount: integer('hit_count').notNull().default(0),
    lastMatchedAt: timestamp('last_matched_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('categorization_rules_user_enabled_priority_idx').on(
      table.userId,
      table.enabled,
      table.priority,
    ),
  ],
)

export type CategorizationRuleRecord =
  typeof categorizationRulesTable.$inferSelect
export type InsertCategorizationRule =
  typeof categorizationRulesTable.$inferInsert
