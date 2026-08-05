import type { VercelRequest, VercelResponse } from '@vercel/node';

interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
}

export interface InstagramPost {
  id: string;
  imageUrl: string;
  permalink: string;
  caption?: string;
}

const LIMIT = 5;
const CACHE_MS = 60 * 60 * 1000;

let cache: { posts: InstagramPost[]; fetchedAt: number } | null = null;

/**
 * Requires IG_ACCESS_TOKEN (a long-lived Instagram access token) in the Vercel
 * project's env vars. Without it, this returns an empty list so the homepage
 * falls back to its placeholder tiles instead of breaking.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');

  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) {
    return res.status(200).json({ posts: cache.posts });
  }

  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) {
    return res.status(200).json({ posts: [] });
  }

  try {
    const url = new URL('https://graph.instagram.com/me/media');
    url.searchParams.set('fields', 'id,caption,media_type,media_url,thumbnail_url,permalink');
    url.searchParams.set('access_token', token);
    url.searchParams.set('limit', String(LIMIT));

    const r = await fetch(url);
    if (!r.ok) throw new Error(`Instagram API responded ${r.status}: ${await r.text()}`);

    const data = (await r.json()) as { data: InstagramMedia[] };

    const posts: InstagramPost[] = data.data
      .filter((m) => m.media_type !== 'VIDEO' || m.thumbnail_url)
      .slice(0, LIMIT)
      .map((m) => ({
        id: m.id,
        imageUrl: m.media_type === 'VIDEO' ? m.thumbnail_url! : m.media_url,
        permalink: m.permalink,
        caption: m.caption,
      }));

    cache = { posts, fetchedAt: Date.now() };
    return res.status(200).json({ posts });
  } catch (err) {
    console.error('instagram feed failed', err);
    return res.status(200).json({ posts: cache?.posts ?? [] });
  }
}
