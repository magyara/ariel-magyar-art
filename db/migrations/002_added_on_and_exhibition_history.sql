-- Date added + exhibition history.
-- Run on each Neon branch (development first, then main) BEFORE deploying the
-- code that uses it — the public artwork list orders by added_on.
-- Safe to re-run.

BEGIN;

-- 1. Date added, used to list pieces newest-first.
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS added_on date;

-- Existing pieces were entered newest-first, so a lower id means more recently
-- added: give them consecutive past dates in that order. Adjust any of them
-- afterwards with the "Date added" field in /admin.
UPDATE artworks a
SET added_on = CURRENT_DATE - r.n::int
FROM (SELECT id, row_number() OVER (ORDER BY id) AS n FROM artworks) r
WHERE a.id = r.id AND a.added_on IS NULL;

ALTER TABLE artworks
    ALTER COLUMN added_on SET DEFAULT CURRENT_DATE,
    ALTER COLUMN added_on SET NOT NULL;

-- 2. Every show a piece has been in, kept after the show ends.
CREATE TABLE IF NOT EXISTS artwork_displays (
    artwork_id integer NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
    display_id integer NOT NULL REFERENCES displays(id) ON DELETE CASCADE,
    PRIMARY KEY (artwork_id, display_id)
);

INSERT INTO artwork_displays (artwork_id, display_id)
SELECT id, display_id FROM artworks WHERE display_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. "On view" is now worked out from show dates, so it's no longer stored.
-- artworks.display_id is left in place (unused) so code deployed before this
-- migration keeps working; it can be dropped later.
UPDATE artworks SET availability = 'Available' WHERE availability = 'On Display';

COMMIT;
