import { neon } from '@neondatabase/serverless';
import type { Artwork, ArtworkImage, Availability, ExhibitionRecord } from '../../src/types.js';

const sql = neon(process.env.DATABASE_URL!);

function buildArtwork(row: any, categoryNames: string[], images: ArtworkImage[], currentShow: any): Artwork {
    const display = currentShow ? {
        venue: String(currentShow.venue),
        city: String(currentShow.city),
        dates: formatDate(currentShow.start_date, currentShow.end_date)
    } : undefined;

    // "On view" comes from show dates rather than a stored status, so it ends by
    // itself the day after a show closes. Unavailable (sold/gifted) always wins.
    const avail: Availability =
        row.availability === 'Unavailable' ? 'Unavailable' : currentShow ? 'On Display' : 'Available';

    return {
        id: String(row.id),
        title: row.title,
        cats: categoryNames,
        place: row.place,
        medium: row.medium,
        size: formatSize(row.width, row.height),
        year: String(row.year),
        avail,
        price: formatPrice(row.price_dollars, row.price_cents),
        featured: row.featured,
        images: images,
        display: display,
        story: row.story,
    };
}

/** Single artwork, plus its full exhibition history for the detail page. */
export async function loadArtworkRow(row: any): Promise<Artwork> {
    const [[artwork], history] = await Promise.all([
        loadArtworksBatch([row]),
        sql`
            WITH today AS (SELECT (now() AT TIME ZONE 'America/New_York')::date AS d)
            SELECT
                d.venue, d.city, d.start_date, d.end_date,
                CASE
                    WHEN d.end_date < today.d THEN 'past'
                    WHEN d.start_date > today.d THEN 'upcoming'
                    ELSE 'current'
                END AS timing
            FROM
                artwork_displays ad
            INNER JOIN
                displays d ON d.id = ad.display_id
            CROSS JOIN
                today
            WHERE
                ad.artwork_id = ${row.id}
            ORDER BY
                d.start_date DESC
        `,
    ]);

    const exhibitions: ExhibitionRecord[] = history.map((h: any) => ({
        venue: String(h.venue),
        city: String(h.city),
        dates: formatDate(h.start_date, h.end_date),
        timing: h.timing,
    }));

    return { ...artwork, exhibitions };
}

export async function loadArtworksBatch(rows: any[]): Promise<Artwork[]> {
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);

    const [categoryRows, imageRows, showRows] = await Promise.all([
        sql`
            SELECT
                ac.artwork_id, c.name
            FROM
                categories c
            INNER JOIN
                artwork_categories ac ON c.id = ac.category_id
            WHERE
                ac.artwork_id = ANY(${ids})
        `,
        sql`
            SELECT
                artwork_id, url, label, position
            FROM
                images
            WHERE
                artwork_id = ANY(${ids})
            ORDER BY
                artwork_id, position
        `,
        // Only shows running today (Eastern time, so a piece stays on view through
        // the whole last day); past ones stay in artwork_displays as history.
        sql`
            SELECT DISTINCT ON (ad.artwork_id)
                ad.artwork_id, d.venue, d.city, d.start_date, d.end_date
            FROM
                artwork_displays ad
            INNER JOIN
                displays d ON d.id = ad.display_id
            WHERE
                ad.artwork_id = ANY(${ids})
                AND (now() AT TIME ZONE 'America/New_York')::date BETWEEN d.start_date AND d.end_date
            ORDER BY
                ad.artwork_id, d.end_date
        `,
    ]);

    const categoriesByArtwork = new Map<number, string[]>();
    for (const row of categoryRows as any[]) {
        const list = categoriesByArtwork.get(row.artwork_id) ?? [];
        list.push(row.name);
        categoriesByArtwork.set(row.artwork_id, list);
    }

    const imagesByArtwork = new Map<number, ArtworkImage[]>();
    for (const row of imageRows as any[]) {
        const list = imagesByArtwork.get(row.artwork_id) ?? [];
        list.push({ img: row.url, label: row.label, pos: row.position });
        imagesByArtwork.set(row.artwork_id, list);
    }

    const showByArtwork = new Map<number, any>();
    for (const row of showRows as any[]) {
        showByArtwork.set(row.artwork_id, row);
    }

    return rows.map((row) => buildArtwork(
        row,
        categoriesByArtwork.get(row.id) ?? [],
        imagesByArtwork.get(row.id) ?? [],
        showByArtwork.get(row.id),
    ));
}

function formatSize(width: number | null, height: number | null): string {
    return width && height ? `${width} × ${height} in` : '';
}

function formatPrice(dollars: number | null, cents: number | null): string {
    let price = '';

    if (dollars != null) {
        price = `$${dollars}`;
        if (cents && cents > 0) {
            price += `.${String(cents).padStart(2, '0')}`;
        } 
    }

    return price;
}

function formatDate(start_date: Date | null, end_date: Date | null): string {
    let dates = '';

    if (start_date && end_date) {
        return `${start_date.toLocaleDateString()} - ${end_date.toLocaleDateString()}`;
    }

    return dates;
}