import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'
import { usersTable } from './auth/users.schema.js'

export const holdingsTable = pgTable(
  'holdings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    symbol: varchar('symbol', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    assetType: varchar('asset_type', { length: 50 }).notNull(), // 'stock', 'mutual_fund', 'gold', 'etf'
    platform: varchar('platform', { length: 100 }), // 'Groww', 'Zerodha', etc.
    quantity: numeric('quantity', { precision: 18, scale: 8 }).notNull(),
    avgBuyPrice: numeric('avg_buy_price', {
      precision: 18,
      scale: 2,
    }).notNull(),
    currentPrice: numeric('current_price', { precision: 18, scale: 2 }),
    investedValue: numeric('invested_value', {
      precision: 18,
      scale: 2,
    }).notNull(),
    currentValue: numeric('current_value', { precision: 18, scale: 2 }),
    totalReturns: numeric('total_returns', { precision: 18, scale: 2 }),
    returnsPercentage: numeric('returns_percentage', {
      precision: 10,
      scale: 4,
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('holdings_user_id_idx').on(table.userId),
    symbolUserIdx: index('holdings_symbol_user_idx').on(
      table.symbol,
      table.userId,
    ),
  }),
)

export type Holding = typeof holdingsTable.$inferSelect
export type NewHolding = typeof holdingsTable.$inferInsert
