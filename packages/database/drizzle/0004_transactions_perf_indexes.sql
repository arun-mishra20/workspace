CREATE INDEX IF NOT EXISTS "transactions_user_transaction_date_idx" ON "transactions" ("user_id","transaction_date");
CREATE INDEX IF NOT EXISTS "transactions_user_category_idx" ON "transactions" ("user_id","category");
CREATE INDEX IF NOT EXISTS "transactions_transaction_date_idx" ON "transactions" ("transaction_date");
CREATE INDEX IF NOT EXISTS "transactions_card_last4_idx" ON "transactions" ("card_last4");
