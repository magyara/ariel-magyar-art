import { createHash } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

const TOKEN_KEY = 'ig_access_token';
/** Fingerprint of the IG_ACCESS_TOKEN the stored token was seeded from. */
const SEED_KEY = 'ig_token_seed';
const REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export async function getSetting(key: string): Promise<{ value: string; updatedAt: Date } | null> {
    const rows = await sql`SELECT value, updated_at FROM app_settings WHERE key = ${key}`;
    const row: any = rows[0];
    return row ? { value: row.value, updatedAt: new Date(row.updated_at) } : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
    await sql`
        INSERT INTO app_settings (key, value, updated_at) VALUES (${key}, ${value}, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
}

const fingerprint = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Long-lived Instagram tokens expire after 60 days unless refreshed, and an
 * env var can't be rewritten at runtime, so the live token is kept in
 * app_settings and refreshed weekly. IG_ACCESS_TOKEN only seeds it — but if
 * that env var is changed (e.g. a new token with publish permission), the new
 * value replaces the stored one.
 *
 * Returns null when no token is configured. Falls back to the env var if the
 * settings table isn't there yet (migration not run).
 */
export async function getIgToken(): Promise<string | null> {
    const envToken = process.env.IG_ACCESS_TOKEN || null;

    try {
        const [stored, seed] = await Promise.all([getSetting(TOKEN_KEY), getSetting(SEED_KEY)]);

        if (envToken && seed?.value !== fingerprint(envToken)) {
            await setSetting(TOKEN_KEY, envToken);
            await setSetting(SEED_KEY, fingerprint(envToken));
            return envToken;
        }

        if (!stored) return envToken;

        if (Date.now() - stored.updatedAt.getTime() > REFRESH_AFTER_MS) {
            const refreshed = await refresh(stored.value);
            if (refreshed) {
                await setSetting(TOKEN_KEY, refreshed);
                return refreshed;
            }
        }
        return stored.value;
    } catch (err) {
        console.error('ig token lookup failed, using IG_ACCESS_TOKEN', err);
        return envToken;
    }
}

async function refresh(token: string): Promise<string | null> {
    try {
        const url = new URL('https://graph.instagram.com/refresh_access_token');
        url.searchParams.set('grant_type', 'ig_refresh_token');
        url.searchParams.set('access_token', token);

        const r = await fetch(url);
        if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);

        const data = (await r.json()) as { access_token?: string };
        return data.access_token ?? null;
    } catch (err) {
        // Keep using the current token; it stays valid until its own expiry.
        console.error('ig token refresh failed', err);
        return null;
    }
}
