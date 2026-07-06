-- Query benchmark checklist for staging/prod-like data.
--
-- Usage:
--   psql "$DATABASE_URL" \
--     -v user_id='00000000-0000-0000-0000-000000000000' \
--     -v start_at='2026-01-01T00:00:00Z' \
--     -v end_at='2026-02-01T00:00:00Z' \
--     -f packages/database/scripts/query-benchmark.sql
--
-- Record planning time, execution time, rows, buffers, and chosen indexes
-- before and after query/index changes.

\if :{?user_id}
\else
\echo 'Missing required psql variable: -v user_id=...'
\quit 1
\endif

\if :{?start_at}
\else
\set start_at '2026-01-01T00:00:00Z'
\endif

\if :{?end_at}
\else
\set end_at '2026-02-01T00:00:00Z'
\endif

\echo 'transaction list: default sort'
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM transactions
WHERE user_id = :'user_id'::uuid
ORDER BY transaction_date DESC, id DESC
LIMIT 50;

\echo 'transaction list: debited card range'
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM transactions
WHERE user_id = :'user_id'::uuid
  AND transaction_type = 'debited'
  AND transaction_mode = 'credit_card'
  AND transaction_date >= :'start_at'::timestamptz
  AND transaction_date < :'end_at'::timestamptz
ORDER BY transaction_date DESC, id DESC
LIMIT 50;

\echo 'transaction count: review pending range'
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*)::int
FROM transactions
WHERE user_id = :'user_id'::uuid
  AND requires_review = true
  AND transaction_date >= :'start_at'::timestamptz
  AND transaction_date < :'end_at'::timestamptz;

\echo 'expenses summary'
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  coalesce(sum(CASE WHEN transaction_type = 'debited' THEN amount::numeric ELSE 0 END), 0) AS total_spent,
  coalesce(sum(CASE WHEN transaction_type = 'credited' THEN amount::numeric ELSE 0 END), 0) AS total_received,
  count(*)::int AS transaction_count,
  count(*) FILTER (WHERE requires_review = true)::int AS review_pending
FROM transactions
WHERE user_id = :'user_id'::uuid
  AND transaction_date >= :'start_at'::timestamptz
  AND transaction_date < :'end_at'::timestamptz;

\echo 'expenses by category'
EXPLAIN (ANALYZE, BUFFERS)
SELECT category, sum(amount::numeric), count(*)::int
FROM transactions
WHERE user_id = :'user_id'::uuid
  AND transaction_type = 'debited'
  AND transaction_date >= :'start_at'::timestamptz
  AND transaction_date < :'end_at'::timestamptz
GROUP BY category
ORDER BY sum(amount::numeric) DESC;

\echo 'expenses daily'
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  to_char(transaction_date, 'YYYY-MM-DD') AS date,
  coalesce(sum(CASE WHEN transaction_type = 'debited' THEN amount::numeric ELSE 0 END), 0) AS debited,
  coalesce(sum(CASE WHEN transaction_type = 'credited' THEN amount::numeric ELSE 0 END), 0) AS credited
FROM transactions
WHERE user_id = :'user_id'::uuid
  AND transaction_date >= :'start_at'::timestamptz
  AND transaction_date < :'end_at'::timestamptz
GROUP BY to_char(transaction_date, 'YYYY-MM-DD')
ORDER BY to_char(transaction_date, 'YYYY-MM-DD') ASC;

\echo 'expenses top merchants'
EXPLAIN (ANALYZE, BUFFERS)
SELECT merchant, sum(amount::numeric), count(*)::int
FROM transactions
WHERE user_id = :'user_id'::uuid
  AND transaction_type = 'debited'
  AND transaction_date >= :'start_at'::timestamptz
  AND transaction_date < :'end_at'::timestamptz
GROUP BY merchant
ORDER BY sum(amount::numeric) DESC
LIMIT 10;

\echo 'spend anomalies: new merchants anti-join'
EXPLAIN (ANALYZE, BUFFERS)
SELECT current_txn.merchant, coalesce(sum(current_txn.amount::numeric), 0)
FROM transactions current_txn
WHERE current_txn.user_id = :'user_id'::uuid
  AND current_txn.transaction_type = 'debited'
  AND current_txn.transaction_date >= :'start_at'::timestamptz
  AND current_txn.transaction_date < :'end_at'::timestamptz
  AND NOT EXISTS (
    SELECT 1
    FROM transactions previous_txn
    WHERE previous_txn.user_id = current_txn.user_id
      AND previous_txn.merchant = current_txn.merchant
      AND previous_txn.transaction_date >= (:'start_at'::timestamptz - (:'end_at'::timestamptz - :'start_at'::timestamptz))
      AND previous_txn.transaction_date < :'start_at'::timestamptz
  )
GROUP BY current_txn.merchant
ORDER BY sum(current_txn.amount::numeric) DESC
LIMIT 5;

\echo 'bus analytics summary'
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  coalesce(sum(amount::numeric), 0) AS total_spent,
  count(*)::int AS total_trips,
  count(DISTINCT merchant)::int AS unique_buses
FROM transactions
WHERE user_id = :'user_id'::uuid
  AND transaction_type = 'debited'
  AND transaction_date >= :'start_at'::timestamptz
  AND transaction_date < :'end_at'::timestamptz
  AND merchant ~* '^(BMTC BUS )?[A-Z]{2}\d{2}[A-Z]{1,2}\d{3,5}$';

\echo 'investment analytics summary'
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  coalesce(sum(amount::numeric), 0) AS total_invested,
  count(*)::int AS transaction_count,
  count(DISTINCT merchant)::int AS active_platforms
FROM transactions
WHERE user_id = :'user_id'::uuid
  AND transaction_type = 'debited'
  AND transaction_date >= :'start_at'::timestamptz
  AND transaction_date < :'end_at'::timestamptz
  AND (category = 'investments' OR merchant ~* '^(groww invest tech|zerodha broking|mutual funds iccl|mmtc pamp india)');

\echo 'raw email list'
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, user_id, provider, provider_message_id, "from", subject, snippet, received_at, category
FROM raw_emails
WHERE user_id = :'user_id'::uuid
  AND category = 'expenses'
ORDER BY received_at DESC, id DESC
LIMIT 50;

\echo 'raw unprocessed expenses'
EXPLAIN (ANALYZE, BUFFERS)
SELECT raw_emails.id
FROM raw_emails
LEFT JOIN transactions ON raw_emails.id = transactions.source_email_id
WHERE raw_emails.user_id = :'user_id'::uuid
  AND raw_emails.category = 'expenses'
  AND transactions.id IS NULL
ORDER BY raw_emails.received_at DESC
LIMIT 50;

\echo 'flight review candidates'
EXPLAIN (ANALYZE, BUFFERS)
SELECT raw_emails.id
FROM raw_emails
LEFT JOIN flight_email_processing ON raw_emails.id = flight_email_processing.source_email_id
LEFT JOIN flight_activities ON raw_emails.id = flight_activities.source_email_id
WHERE raw_emails.user_id = :'user_id'::uuid
  AND raw_emails.category = 'flights'
  AND raw_emails.received_at >= :'start_at'::timestamptz
  AND flight_activities.id IS NULL
  AND coalesce(flight_email_processing.llm_attempts, 0) = 0
  AND (
    flight_email_processing.id IS NULL
    OR flight_email_processing.status IN ('no_match', 'failed')
  )
ORDER BY raw_emails.received_at DESC
LIMIT 50;

\echo 'flight cursor page'
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM flight_activities
WHERE user_id = :'user_id'::uuid
ORDER BY departure_date DESC, segment_index DESC, id DESC
LIMIT 51;

\echo 'hotel list unarchived'
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM hotel_stays
WHERE user_id = :'user_id'::uuid
  AND archived_at IS NULL
ORDER BY check_in_date DESC, created_at DESC
LIMIT 50;

\echo 'dividends dashboard year totals'
EXPLAIN (ANALYZE, BUFFERS)
SELECT coalesce(sum(amount::numeric), 0), count(*)
FROM dividends
WHERE user_id = :'user_id'::uuid
  AND ex_date BETWEEN :'start_at'::date AND :'end_at'::date;

\echo 'ai conversations list'
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM ai_conversations
WHERE user_id = :'user_id'::uuid
ORDER BY pinned_at ASC, updated_at DESC
LIMIT 25;

\echo 'ai messages by conversation'
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM ai_messages
WHERE conversation_id = (
  SELECT id
  FROM ai_conversations
  WHERE user_id = :'user_id'::uuid
  ORDER BY updated_at DESC
  LIMIT 1
)
ORDER BY created_at ASC;
