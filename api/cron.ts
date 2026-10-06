import { timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { publishDuePosts } from './_lib/adminInstagram.js';
import { getIgToken } from './_lib/igToken.js';

function authorized(req: VercelRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    const expected = Buffer.from(`Bearer ${secret}`);
    const actual = Buffer.from(String(req.headers.authorization ?? ''));
    return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Hit every ~15 minutes by .github/workflows/scheduler.yml (Vercel Hobby's own
 * cron only runs daily). Publishes scheduled Instagram posts that are due and
 * keeps the Instagram token refreshed even when nobody visits the site.
 *
 * Responds 200 with a summary; the workflow fails the run (and GitHub emails)
 * when `failed` or `interrupted` is non-empty.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // Refreshes the stored token when it's more than a week old.
        const tokenOk = Boolean(await getIgToken());
        const result = await publishDuePosts();
        return res.status(200).json({ ...result, tokenOk, environment: process.env.VERCEL_ENV ?? 'local' });
    } catch (err) {
        console.error('scheduler run failed', err);
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
}
