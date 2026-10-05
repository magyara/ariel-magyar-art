-- Instagram posting + app settings.
-- Run once per Neon branch (development first, then main), e.g.:
--   psql "$DATABASE_URL_UNPOOLED" -f db/migrations/001_instagram.sql
-- Safe to re-run.

BEGIN;

-- Small key/value store: Instagram token (auto-refreshed), default hashtags.
CREATE TABLE IF NOT EXISTS app_settings (
    key        text PRIMARY KEY,
    value      text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS instagram_posts (
    id           serial PRIMARY KEY,
    -- Deleting an artwork keeps the record of what was posted.
    artwork_id   integer REFERENCES artworks(id) ON DELETE SET NULL,
    caption      text NOT NULL DEFAULT '',
    aspect       text NOT NULL CHECK (aspect IN ('4:5', '1:1', '1.91:1')),
    background   text NOT NULL DEFAULT '#ffffff',
    -- [{ sourceUrl, igUrl, fit: 'pad' | 'crop', offsetX, offsetY }]
    slides       jsonb NOT NULL,
    status       text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
    scheduled_at timestamptz,
    ig_media_id  text,
    permalink    text,
    error        text,
    attempts     integer NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz
);

CREATE INDEX IF NOT EXISTS instagram_posts_due_idx ON instagram_posts (status, scheduled_at);

COMMIT;
