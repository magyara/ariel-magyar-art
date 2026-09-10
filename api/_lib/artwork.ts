import { neon } from '@neondatabase/serverless';
import type { Artwork, ArtworkImage } from '../../src/types.js';

const sql = neon(process.env.DATABASE_URL!);

function buildArtwork(row: any, categoryNames: string[], images: ArtworkImage[], displayRow: any): Artwork {
    const display = displayRow ? {
        venue: String(displayRow.venue),
        city: String(displayRow.city),
        dates: formatDate(displayRow.start_date, displayRow.end_date)
    } : undefined;

    return {
        id: String(row.id),
        title: row.title,
        cats: categoryNames,
        place: row.place,
        medium: row.medium,
        size: formatSize(row.width, row.height),
        year: String(row.year),
        avail: row.availability,
        price: formatPrice(row.price_dollars, row.price_cents),
        featured: row.featured,
        images: images,
        display: display,
        story: row.story,
    };
}

export async function loadArtworkRow(row: any): Promise<Artwork> {

    const [categoryResult, imageResult, displayResult] = await Promise.all([
        sql`
            SELECT
                c.name
            FROM
                categories c
            INNER JOIN
                artwork_categories ac ON c.id = ac.category_id
            WHERE
                ac.artwork_id = ${row.id}
        `,
        sql`
            SELECT
                url, label, position
            FROM
                images
            WHERE
                artwork_id = ${row.id}
            ORDER BY
                position
        `,
        row.display_id
            ? sql`
                SELECT
                    venue, city, start_date, end_date
                FROM
                    displays
                WHERE
                    id = ${row.display_id}
            `
            : Promise.resolve([]),
    ]);

    const categoryNames = categoryResult.map((row: any) => row.name);

    const images: ArtworkImage[] = imageResult.map((row: any) => ({
        img: row.url,
        label: row.label,
        pos: row.position
    }));

    return buildArtwork(row, categoryNames, images, displayResult[0]);
}

export async function loadArtworksBatch(rows: any[]): Promise<Artwork[]> {
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);
    const displayIds = [...new Set(rows.map((row) => row.display_id).filter((id) => id != null))];

    const [categoryRows, imageRows, displayRows] = await Promise.all([
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
        displayIds.length
            ? sql`
                SELECT
                    id, venue, city, start_date, end_date
                FROM
                    displays
                WHERE
                    id = ANY(${displayIds})
            `
            : Promise.resolve([]),
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

    const displayById = new Map<number, any>();
    for (const row of displayRows as any[]) {
        displayById.set(row.id, row);
    }

    return rows.map((row) => buildArtwork(
        row,
        categoriesByArtwork.get(row.id) ?? [],
        imagesByArtwork.get(row.id) ?? [],
        row.display_id ? displayById.get(row.display_id) : undefined,
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