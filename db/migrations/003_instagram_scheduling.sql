-- Scheduled Instagram posts.
-- Run on each Neon branch (development first, then main) before deploying.
-- Safe to re-run.

BEGIN;

-- When a post was claimed for publishing. Lets the scheduler spot posts stuck
-- in 'publishing' (e.g. the function was cut off mid-publish).
ALTER TABLE instagram_posts ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

COMMIT;
