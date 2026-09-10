import type { VercelRequest, VercelResponse } from '@vercel/node';
import  { neon } from '@neondatabase/serverless';
import { loadArtworksBatch } from './_lib/artwork.js';

const dbUrl = process.env.DATABASE_URL

if (!dbUrl) {
    throw new Error('DATABASE_URL is not defined');
}

const sql = neon(dbUrl)

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    try {

        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

        const featuredOnly = req.query.featured === 'true';

        const artworksResult = featuredOnly
            ? await sql`
                SELECT
                    id, title, place, medium, width, height, year, price_dollars, price_cents, featured, availability, display_id, story
                FROM
                    artworks
                WHERE
                    featured = true
                ORDER BY
                    id
            `
            : await sql`
                SELECT
                    id, title, place, medium, width, height, year, price_dollars, price_cents, featured, availability, display_id, story
                FROM
                    artworks
                ORDER BY
                    id
            `;

        const artworks = await loadArtworksBatch(artworksResult);

        return res.status(200).json({ artworks });
    
    } catch (error) {
        console.error('Error fetching artworks:', error);

        return res.status(500).json({
            error: 'Failed to fetch artworks',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}