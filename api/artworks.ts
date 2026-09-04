import type { VercelRequest, VercelResponse } from '@vercel/node';
import  { neon } from '@neondatabase/serverless';
import { loadArtworkRow } from './_lib/artwork';
import type { Artwork } from '../src/types';

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

        const artworksResult = await sql`
            SELECT 
                id, title, place, medium, width, height, year, price_dollars, price_cents, featured, availability, display_id, story 
            FROM 
                artworks 
            ORDER BY 
                id
        `;
        
        const artworks: Artwork[] = [];


        for (const row of artworksResult){

            const artwork: Artwork = await loadArtworkRow(row);

            artworks.push(artwork);
        }
        
        return res.status(200).json({ artworks });
    
    } catch (error) {
        console.error('Error fetching artworks:', error);

        return res.status(500).json({
            error: 'Failed to fetch artworks',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}