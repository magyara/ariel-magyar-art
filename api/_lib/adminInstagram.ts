import { neon } from '@neondatabase/serverless';
import { z } from 'zod';
import { IG_ASPECTS, IG_CAPTION_MAX, IG_HASHTAG_MAX, IG_SLIDES_MAX } from '../../src/types.js';
import type { IgPost, IgPostChange, IgPostInput, IgSlide, IgStatus } from '../../src/types.js';
import { deleteBlobs, isBlobUrl } from './adminArtworks.js';
import { imageUrl } from './adminSchema.js';
import { getIgToken, getSetting, setSetting } from './igToken.js';
import { getIgAccount, isLive, publishToInstagram } from './instagramPublish.js';

const sql = neon(process.env.DATABASE_URL!);

const HASHTAGS_KEY = 'ig_default_hashtags';
const DRY_RUN_PREFIX = 'dry-run-';
/** A post still 'publishing' after this long was cut off mid-way. */
const STUCK_AFTER = '10 minutes';
/** Leave headroom under the function's 60s limit; later posts wait for the next run. */
const SCHEDULER_BUDGET_MS = 30_000;

// A minute of slack so "schedule for now" from a slow form still counts.
const futureTime = z
    .string()
    .datetime({ offset: true })
    .refine((v) => new Date(v).getTime() > Date.now() - 60_000, 'Pick a time in the future');

const countHashtags = (caption: string) => (caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;

const caption = z
    .string()
    .max(IG_CAPTION_MAX, `Caption is over ${IG_CAPTION_MAX} characters`)
    .refine((c) => countHashtags(c) <= IG_HASHTAG_MAX, `Instagram allows at most ${IG_HASHTAG_MAX} hashtags`);

const slide = z.object({
    sourceUrl: imageUrl,
    // Instagram fetches this URL itself, so it must be one of our public uploads.
    igUrl: z.string().url().refine(isBlobUrl, 'Instagram image must be an uploaded file'),
    fit: z.enum(['pad', 'crop']),
    offsetX: z.number().min(0).max(1),
    offsetY: z.number().min(0).max(1),
});

const postInputSchema = z.object({
    artworkId: z.number().int().positive().nullable(),
    caption,
    aspect: z.enum(IG_ASPECTS),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Background must be a hex color'),
    slides: z.array(slide).min(1, 'Pick at least one image').max(IG_SLIDES_MAX),
    action: z.enum(['draft', 'publish', 'schedule']),
    scheduledAt: futureTime.nullable().optional(),
}).refine((p) => p.action !== 'schedule' || p.scheduledAt, { message: 'Pick a date and time', path: ['scheduledAt'] });

const postChangeSchema = z
    .object({
        caption: caption.optional(),
        action: z.enum(['publish', 'schedule', 'unschedule']).optional(),
        scheduledAt: futureTime.optional(),
    })
    .refine((c) => c.action !== 'schedule' || c.scheduledAt, { message: 'Pick a date and time', path: ['scheduledAt'] });

const firstIssue = (error: z.ZodError) => {
    const issue = error.issues[0];
    return `${issue.path.join('.') || 'input'}: ${issue.message}`;
};

export function parsePostInput(body: unknown): { data: IgPostInput } | { error: string } {
    const parsed = postInputSchema.safeParse(body);
    return parsed.success ? { data: parsed.data } : { error: firstIssue(parsed.error) };
}

export function parsePostChange(body: unknown): { data: IgPostChange } | { error: string } {
    const parsed = postChangeSchema.safeParse(body);
    return parsed.success ? { data: parsed.data } : { error: firstIssue(parsed.error) };
}

function toPost(r: any): IgPost {
    return {
        id: r.id,
        artworkId: r.artwork_id,
        artworkTitle: r.artwork_title ?? null,
        caption: r.caption,
        aspect: r.aspect,
        background: r.background,
        slides: r.slides as IgSlide[],
        status: r.status,
        scheduledAt: r.scheduled_at ? new Date(r.scheduled_at).toISOString() : null,
        permalink: r.permalink,
        error: r.error,
        dryRun: typeof r.ig_media_id === 'string' && r.ig_media_id.startsWith(DRY_RUN_PREFIX),
        createdAt: new Date(r.created_at).toISOString(),
        publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
    };
}

export async function listPosts(): Promise<IgPost[]> {
    const rows = await sql`
        SELECT
            p.*, a.title AS artwork_title
        FROM
            instagram_posts p
        LEFT JOIN
            artworks a ON a.id = p.artwork_id
        ORDER BY
            -- Upcoming posts first, soonest at the top; then everything else, newest first.
            (p.status = 'scheduled') DESC, p.scheduled_at, p.created_at DESC
        LIMIT 100
    `;
    return rows.map(toPost);
}

async function getPost(id: number): Promise<IgPost | null> {
    const rows = await sql`
        SELECT p.*, a.title AS artwork_title
        FROM instagram_posts p
        LEFT JOIN artworks a ON a.id = p.artwork_id
        WHERE p.id = ${id}
    `;
    return rows[0] ? toPost(rows[0]) : null;
}

export async function createPost(input: IgPostInput): Promise<IgPost> {
    const scheduled = input.action === 'schedule';
    const rows = await sql`
        INSERT INTO instagram_posts (artwork_id, caption, aspect, background, slides, status, scheduled_at)
        VALUES (
            ${input.artworkId}, ${input.caption}, ${input.aspect}, ${input.background},
            ${JSON.stringify(input.slides)}::jsonb,
            ${scheduled ? 'scheduled' : 'draft'}, ${scheduled ? input.scheduledAt : null}
        )
        RETURNING id
    `;
    const id: number = (rows[0] as any).id;
    if (input.action === 'publish') return (await publishPost(id))!;
    return (await getPost(id))!;
}

/**
 * Publishes a draft or retries a failed post. Returns null if there's no such
 * post. A failure is recorded on the post (status `failed` + error) rather
 * than thrown, so the caller always gets the post's current state back.
 */
export async function publishPost(id: number): Promise<IgPost | null> {
    // Claiming the row in one statement means two clicks (or a click racing the
    // scheduler) can't both publish it.
    const claimed = await sql`
        UPDATE instagram_posts
        SET status = 'publishing', attempts = attempts + 1, error = NULL, claimed_at = now()
        WHERE id = ${id} AND status IN ('draft', 'scheduled', 'failed')
        RETURNING caption, slides
    `;
    const row: any = claimed[0];
    if (!row) return getPost(id);

    try {
        const urls = (row.slides as IgSlide[]).map((s) => s.igUrl);
        const result = await publishToInstagram(urls, row.caption);
        await sql`
            UPDATE instagram_posts
            SET status = 'published', ig_media_id = ${result.mediaId}, permalink = ${result.permalink}, published_at = now()
            WHERE id = ${id}
        `;
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Publishing failed';
        console.error('instagram publish failed', id, err);
        await sql`UPDATE instagram_posts SET status = 'failed', error = ${message} WHERE id = ${id}`;
    }
    return getPost(id);
}

/**
 * Applies caption edits and schedule changes, then publishes if asked.
 * Captions can't be changed through the API once a post is on Instagram, so
 * edits only apply to posts that haven't gone out.
 */
export async function changePost(id: number, change: IgPostChange): Promise<IgPost | null> {
    if (change.caption !== undefined) {
        await sql`
            UPDATE instagram_posts SET caption = ${change.caption}
            WHERE id = ${id} AND status IN ('draft', 'scheduled', 'failed')
        `;
    }
    if (change.action === 'schedule') {
        await sql`
            UPDATE instagram_posts SET status = 'scheduled', scheduled_at = ${change.scheduledAt!}, error = NULL
            WHERE id = ${id} AND status IN ('draft', 'scheduled', 'failed')
        `;
    }
    if (change.action === 'unschedule') {
        await sql`
            UPDATE instagram_posts SET status = 'draft', scheduled_at = NULL
            WHERE id = ${id} AND status = 'scheduled'
        `;
    }
    if (change.action === 'publish') return publishPost(id);
    return getPost(id);
}

export interface SchedulerResult {
    published: number[];
    failed: Array<{ id: number; error: string | null }>;
    /** Posts found stuck mid-publish and marked failed. */
    interrupted: number[];
    /** Due posts left for the next run because the time budget ran out. */
    remaining: number;
}

/**
 * Called by the scheduler (api/cron.ts) every ~15 minutes: publishes posts
 * whose time has come, oldest first. Failed posts are not retried
 * automatically — a repeated failure could spam the account; they wait for a
 * manual Retry in /admin/instagram.
 */
export async function publishDuePosts(): Promise<SchedulerResult> {
    const started = Date.now();

    // We can't tell whether Instagram received a cut-off publish, so these are
    // flagged for a human rather than retried.
    const stuck = await sql`
        UPDATE instagram_posts
        SET status = 'failed',
            error = 'Publishing was interrupted. Check Instagram before retrying — it may already be posted.'
        WHERE status = 'publishing' AND claimed_at < now() - ${STUCK_AFTER}::interval
        RETURNING id
    `;

    const due = await sql`
        SELECT id FROM instagram_posts
        WHERE status = 'scheduled' AND scheduled_at <= now()
        ORDER BY scheduled_at
    `;

    const result: SchedulerResult = {
        published: [],
        failed: [],
        interrupted: stuck.map((r: any) => r.id),
        remaining: 0,
    };

    for (const [i, row] of (due as any[]).entries()) {
        if (Date.now() - started > SCHEDULER_BUDGET_MS) {
            result.remaining = due.length - i;
            break;
        }
        const post = await publishPost(row.id);
        if (post?.status === 'published') result.published.push(row.id);
        else if (post?.status === 'failed') result.failed.push({ id: row.id, error: post.error });
    }
    return result;
}

/**
 * Removes our record (and the uploaded Instagram copies). This never deletes
 * anything from Instagram itself.
 */
export async function deletePost(id: number): Promise<boolean> {
    const rows = await sql`DELETE FROM instagram_posts WHERE id = ${id} RETURNING slides`;
    const row: any = rows[0];
    if (!row) return false;
    await deleteBlobs((row.slides as IgSlide[]).map((s) => s.igUrl));
    return true;
}

export async function getStatus(): Promise<IgStatus> {
    const hashtags = await getSetting(HASHTAGS_KEY).catch(() => null);
    const base = { live: isLive(), defaultHashtags: hashtags?.value ?? '' };

    const token = await getIgToken();
    if (!token) return { ...base, configured: false, username: null, error: null };

    try {
        const account = await getIgAccount();
        return { ...base, configured: true, username: account?.username ?? null, error: null };
    } catch (err) {
        return { ...base, configured: true, username: null, error: err instanceof Error ? err.message : 'Instagram check failed' };
    }
}

export async function setDefaultHashtags(value: string): Promise<void> {
    await setSetting(HASHTAGS_KEY, value.trim().slice(0, 1000));
}
