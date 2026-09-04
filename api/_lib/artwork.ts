import { neon } from '@neondatabase/serverless';
import type { Artwork, ArtworkImage } from '../../src/types';

const sql = neon(process.env.DATABASE_URL!);

export async function loadArtworkRow(row: any): Promise<Artwork> {
    
    const categoryResult = await sql`
        SELECT 
            c.name
        FROM 
            categories c
        INNER JOIN
            artwork_categories ac ON c.id = ac.category_id
        WHERE
            ac.artwork_id = ${row.id}
    `;

    const categoryNames = categoryResult.map((row: any) => row.name);

    const imageResult = await sql`
        SELECT 
            url, label, position
        FROM 
            images
        WHERE
            artwork_id = ${row.id}
    `;

    const images: ArtworkImage[] = imageResult.map((row: any) => ({
        img: row.url,
        label: row.label,
        pos: row.position
    }));

    const displayResult = await sql`
        SELECT 
            venue, city, start_date, end_date
        FROM 
            displays
        WHERE
            id = ${row.display_id}
    `;

    const display = displayResult[0] ? {
        venue: String(displayResult[0].venue),
        city: String(displayResult[0].city),
        dates: formatDate(displayResult[0].start_date, displayResult[0].end_date)
    } : undefined;

    const artwork: Artwork = {
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
    }

    return artwork;
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