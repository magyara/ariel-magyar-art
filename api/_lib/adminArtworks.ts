import { neon, Pool, type PoolClient } from '@neondatabase/serverless';
import { del } from '@vercel/blob';
import { IMAGE_SLOTS } from '../../src/types.js';
import type {
    AdminArtwork,
    AdminArtworkInput,
    AdminArtworkSummary,
    AdminImageInput,
    AdminOptions,
    ImageSlot,
} from '../../src/types.js';

const sql = neon(process.env.DATABASE_URL!);

const SLOT_LABELS_LOWER = IMAGE_SLOTS.map((s) => s.toLowerCase());

function slotFor(label: string): ImageSlot | undefined {
    const i = SLOT_LABELS_LOWER.indexOf(String(label).trim().toLowerCase());
    return i === -1 ? undefined : IMAGE_SLOTS[i];
}

/** Only files we uploaded to Blob get deleted; images under public/images/ are left alone. */
function isBlobUrl(url: string): boolean {
    try {
        return new URL(url).hostname.endsWith('.blob.vercel-storage.com');
    } catch {
        return false;
    }
}

async function deleteBlobs(urls: string[]): Promise<void> {
    const blobs = urls.filter(isBlobUrl);
    if (blobs.length === 0) return;
    try {
        await del(blobs);
    } catch (err) {
        // The DB is already consistent; an orphaned file only costs storage.
        console.error('blob cleanup failed', err);
    }
}

/**
 * Interactive transactions need the WebSocket Pool rather than the HTTP `sql`
 * driver. A pool per call, closed at the end, is the pattern Neon recommends
 * for serverless functions.
 */
async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

export async function listArtworks(): Promise<AdminArtworkSummary[]> {
    const rows = await sql`
        SELECT
            a.id, a.title, a.year, a.availability, a.featured,
            (SELECT url FROM images i WHERE i.artwork_id = a.id ORDER BY i.position LIMIT 1) AS thumb_url
        FROM
            artworks a
        ORDER BY
            a.id DESC
    `;
    return rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        year: r.year,
        availability: r.availability,
        featured: Boolean(r.featured),
        thumbUrl: r.thumb_url ?? null,
    }));
}

export async function getOptions(): Promise<AdminOptions> {
    const [availability, categories, displays] = await Promise.all([
        sql`SELECT unnest(enum_range(NULL::availability_status)) AS value`,
        sql`SELECT name FROM categories ORDER BY name`,
        sql`
            SELECT
                id, venue, city,
                to_char(start_date, 'YYYY-MM-DD') AS start_date,
                to_char(end_date, 'YYYY-MM-DD') AS end_date
            FROM
                displays
            ORDER BY
                start_date DESC
        `,
    ]);
    return {
        availability: availability.map((r: any) => r.value),
        categories: categories.map((r: any) => r.name),
        displays: displays.map((r: any) => ({
            id: r.id,
            venue: r.venue,
            city: r.city,
            startDate: r.start_date,
            endDate: r.end_date,
        })),
    };
}

export async function getArtwork(id: number): Promise<AdminArtwork | null> {
    const [rows, categories, images] = await Promise.all([
        sql`
            SELECT
                id, title, place, medium, width, height, year, price_dollars, price_cents,
                featured, availability, display_id, story
            FROM
                artworks
            WHERE
                id = ${id}
        `,
        sql`
            SELECT c.name
            FROM categories c
            INNER JOIN artwork_categories ac ON c.id = ac.category_id
            WHERE ac.artwork_id = ${id}
            ORDER BY c.name
        `,
        sql`SELECT url, label FROM images WHERE artwork_id = ${id} ORDER BY position`,
    ]);

    const row: any = rows[0];
    if (!row) return null;

    const slotted: AdminImageInput[] = [];
    for (const img of images as any[]) {
        const slot = slotFor(img.label);
        if (slot && !slotted.some((s) => s.slot === slot)) slotted.push({ slot, url: img.url });
    }

    return {
        id: row.id,
        title: row.title,
        place: row.place,
        medium: row.medium,
        width: Number(row.width),
        height: Number(row.height),
        year: row.year,
        availability: row.availability,
        priceDollars: row.price_dollars,
        priceCents: row.price_cents,
        featured: Boolean(row.featured),
        story: row.story ?? '',
        categories: categories.map((c: any) => c.name),
        display: row.display_id ? { id: row.display_id } : null,
        images: slotted,
    };
}

async function resolveDisplayId(client: PoolClient, display: AdminArtworkInput['display']): Promise<number | null> {
    if (!display) return null;
    if ('id' in display) return display.id;

    const { rows } = await client.query(
        'INSERT INTO displays (venue, city, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING id',
        [display.venue, display.city, display.startDate, display.endDate],
    );
    return rows[0].id;
}

async function resolveCategoryIds(client: PoolClient, names: string[]): Promise<number[]> {
    const wanted = [...new Map(names.map((n) => [n.toLowerCase(), n])).values()];
    if (wanted.length === 0) return [];

    // Case-insensitive match so "Landscape" and "landscape" don't become two categories.
    const { rows: existing } = await client.query(
        'SELECT id, name FROM categories WHERE lower(name) = ANY($1::text[])',
        [wanted.map((n) => n.toLowerCase())],
    );
    const idByName = new Map<string, number>(existing.map((r: any) => [r.name.toLowerCase(), r.id]));

    for (const name of wanted) {
        if (!idByName.has(name.toLowerCase())) {
            const { rows } = await client.query('INSERT INTO categories (name) VALUES ($1) RETURNING id', [name]);
            idByName.set(name.toLowerCase(), rows[0].id);
        }
    }
    return wanted.map((n) => idByName.get(n.toLowerCase())!);
}

/**
 * Replaces the artwork's categories and slot images. Image rows whose label
 * isn't one of the four slots (older, hand-entered pieces) are left untouched.
 * Returns the image URLs that were replaced or removed.
 */
async function writeRelations(client: PoolClient, artworkId: number, input: AdminArtworkInput): Promise<string[]> {
    const categoryIds = await resolveCategoryIds(client, input.categories);
    await client.query('DELETE FROM artwork_categories WHERE artwork_id = $1', [artworkId]);
    if (categoryIds.length) {
        await client.query(
            'INSERT INTO artwork_categories (artwork_id, category_id) SELECT $1::int, unnest($2::int[])',
            [artworkId, categoryIds],
        );
    }

    const { rows: removed } = await client.query(
        'DELETE FROM images WHERE artwork_id = $1 AND lower(label) = ANY($2::text[]) RETURNING url',
        [artworkId, SLOT_LABELS_LOWER],
    );

    const ordered = IMAGE_SLOTS.flatMap((slot, i) => {
        const img = input.images.find((im) => im.slot === slot);
        return img ? [{ ...img, position: i + 1 }] : [];
    });
    if (ordered.length) {
        await client.query(
            `INSERT INTO images (artwork_id, url, label, position)
             SELECT $1::int, * FROM unnest($2::text[], $3::text[], $4::int[])`,
            [artworkId, ordered.map((i) => i.url), ordered.map((i) => i.slot), ordered.map((i) => i.position)],
        );
    }

    const kept = new Set(ordered.map((i) => i.url));
    return removed.map((r: any) => r.url).filter((url: string) => !kept.has(url));
}

function artworkColumns(input: AdminArtworkInput, displayId: number | null) {
    return [
        input.title,
        input.place,
        input.medium,
        input.width,
        input.height,
        input.year,
        input.priceDollars,
        input.priceDollars == null ? null : input.priceCents,
        input.featured,
        input.availability,
        displayId,
        input.story || null,
    ];
}

export async function createArtwork(input: AdminArtworkInput): Promise<number> {
    return withTransaction(async (client) => {
        const displayId = await resolveDisplayId(client, input.display);
        const { rows } = await client.query(
            `INSERT INTO artworks
                (title, place, medium, width, height, year, price_dollars, price_cents,
                 featured, availability, display_id, story)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING id`,
            artworkColumns(input, displayId),
        );
        const id: number = rows[0].id;
        await writeRelations(client, id, input);
        return id;
    });
}

/** Returns false when no artwork has that id. */
export async function updateArtwork(id: number, input: AdminArtworkInput): Promise<boolean> {
    const removedUrls = await withTransaction(async (client) => {
        const displayId = await resolveDisplayId(client, input.display);
        const { rowCount } = await client.query(
            `UPDATE artworks SET
                title = $1, place = $2, medium = $3, width = $4, height = $5, year = $6,
                price_dollars = $7, price_cents = $8, featured = $9, availability = $10,
                display_id = $11, story = $12
             WHERE id = $13`,
            [...artworkColumns(input, displayId), id],
        );
        if (!rowCount) return null;
        return writeRelations(client, id, input);
    });

    if (removedUrls === null) return false;
    await deleteBlobs(removedUrls);
    return true;
}

/** Returns false when no artwork has that id. Displays are shared, so they're kept. */
export async function deleteArtwork(id: number): Promise<boolean> {
    const urls = await withTransaction(async (client) => {
        await client.query('DELETE FROM artwork_categories WHERE artwork_id = $1', [id]);
        const { rows: images } = await client.query('DELETE FROM images WHERE artwork_id = $1 RETURNING url', [id]);
        const { rowCount } = await client.query('DELETE FROM artworks WHERE id = $1', [id]);
        if (!rowCount) return null;
        return images.map((r: any) => r.url as string);
    });

    if (urls === null) return false;
    await deleteBlobs(urls);
    return true;
}
