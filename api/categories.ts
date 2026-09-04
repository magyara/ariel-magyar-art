import type { VercelRequest, VercelResponse } from '@vercel/node';
import  { neon } from '@neondatabase/serverless';

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

        type CategoryRow = {
            name: string;
        }

        const categoriesResult = (await sql`
            SELECT 
                name
            FROM
                categories 
            ORDER BY 
                name
        `) as CategoryRow[];
        
        const categoryNames = categoriesResult.map((row) => row.name);

        return res.status(200).json({ categories: categoryNames });
    
    } catch (error) {
        console.error('Error fetching categories:', error);

        return res.status(500).json({
            error: 'Failed to fetch categories',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}