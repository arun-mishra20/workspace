-- Fix: Change dedup unique constraint from (user_id, dedupe_hash) to (user_id, source_email_id)
--
-- Root cause: The dedupe_hash algorithm changed (merchantRaw was removed from hash inputs),
-- causing old hashes and new hashes to differ for the same transaction. On reprocess,
-- the new hash wouldn't match the old hash → no conflict detected → duplicate row inserted.
--
-- Fix: Since each email produces at most 1 transaction, (user_id, source_email_id) is the
-- natural stable dedup key that never changes regardless of parser algorithm changes.

-- Step 1: Delete duplicate fallback rows (keep rows with real merchant names)
DELETE FROM transactions 
WHERE id IN (
  SELECT t2.id
  FROM transactions t1
  JOIN transactions t2 
    ON t1.source_email_id = t2.source_email_id 
    AND t1.id != t2.id
  WHERE t2.merchant LIKE 'Card %Transaction'
    AND t1.merchant NOT LIKE 'Card %Transaction'
);

-- Step 2: Drop the old hash-based unique index
DROP INDEX IF EXISTS transactions_user_dedupe_hash_idx;

-- Step 3: Create new unique index on (user_id, source_email_id)
CREATE UNIQUE INDEX transactions_user_source_email_idx 
  ON transactions (user_id, source_email_id);

-- Step 4: Keep a non-unique index on dedupe_hash for reference queries
CREATE INDEX transactions_dedupe_hash_idx ON transactions (dedupe_hash);
