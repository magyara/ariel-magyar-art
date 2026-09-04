import type { VercelRequest, VercelResponse } from '@vercel/node';
import  { neon } from '@neondatabase/serverless';
import { loadArtworkRow } from '../_lib/artwork';

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

        const id = parseInt(req.query.id as string);

        const artworksResult = await sql`
            SELECT 
                id, title, place, medium, width, height, year, price_dollars, price_cents, featured, availability, display_id, story 
            FROM 
                artworks 
            WHERE
                artworks.id = ${id}
        `;

        const artworkRow = artworksResult[0];

        if (!artworkRow) return res.status(404).json({error: 'Artwork not found'});

        const artwork = await loadArtworkRow(artworkRow);

        return res.status(200).json({ artwork });
    
    } catch (error) {
        console.error('Error fetching artwork:', error);

        return res.status(500).json({
            error: 'Failed to fetch artwork',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}