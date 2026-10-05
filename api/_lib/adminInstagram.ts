import { neon } from '@neondatabase/serverless';
import { z } from 'zod';
import { IG_ASPECTS, IG_CAPTION_MAX, IG_HASHTAG_MAX, IG_SLIDES_MAX } from '../../src/types.js';
import type { IgPost, IgPostInput, IgSlide, IgStatus } from '../../src/types.js';
import { deleteBlobs, isBlobUrl } from './adminArtworks.js';
import { imageUrl } from './adminSchema.js';
import { getIgToken, getSetting, setSetting } from './igToken.js';
import { getIgAccount, isLive, publishToInstagram } from './instagramPublish.js';

const sql = neon(process.env.DATABASE_URL!);

const HASHTAGS_KEY = 'ig_default_hashtags';
const DRY_RUN_PREFIX = 'dry-run-';

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
    action: z.enum(['draft', 'publish']),
});

const firstIssue = (error: z.ZodError) => {
    const issue = error.issues[0];
    return `${issue.path.join('.') || 'input'}: ${issue.message}`;
};

export function parsePostInput(body: unknown): { data: IgPostInput } | { error: string } {
    const parsed = postInputSchema.safeParse(body);
    return parsed.success ? { data: parsed.data } : { error: firstIssue(parsed.error) };
}

export function parseCaption(body: unknown): { data: string } | { error: string } {
    const parsed = z.object({ caption }).safeParse(body);
    return parsed.success ? { data: parsed.data.caption } : { error: firstIssue(parsed.error) };
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
            p.created_at DESC
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
    const rows = await sql`
        INSERT INTO instagram_posts (artwork_id, caption, aspect, background, slides)
        VALUES (${input.artworkId}, ${input.caption}, ${input.aspect}, ${input.background}, ${JSON.stringify(input.slides)}::jsonb)
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
        SET status = 'publishing', attempts = attempts + 1, error = NULL
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

/** Captions can't be changed through the API once a post is on Instagram. */
export async function updateCaption(id: number, newCaption: string): Promise<IgPost | null> {
    await sql`
        UPDATE instagram_posts SET caption = ${newCaption}
        WHERE id = ${id} AND status IN ('draft', 'scheduled', 'failed')
    `;
    return getPost(id);
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
