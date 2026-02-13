import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { usersTable } from "./auth/users.schema.js";

/**
 * Merchant category rules table definition
 *
 * Persists user-learned merchant → category mappings.
 * When a user bulk-categorises a merchant, the mapping is stored here
 * so future email syncs automatically apply the same category.
 */
export const merchantCategoryRulesTable = pgTable(
  "merchant_category_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    merchant: text("merchant").notNull(),
    category: text("category").notNull(),
    subcategory: text("subcategory").notNull(),
    categoryMetadata: jsonb("category_metadata").$type<{
      icon: string;
      color: string;
      parent: string | null;
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("merchant_rules_user_merchant_idx").on(
      table.userId,
      table.merchant,
    ),
  ],
);

export type MerchantCategoryRuleRecord =
  typeof merchantCategoryRulesTable.$inferSelect;
export type InsertMerchantCategoryRule =
  typeof merchantCategoryRulesTable.$inferInsert;
