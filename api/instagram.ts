import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getIgToken } from './_lib/igToken.js';

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
const CACHE_OK = 'public, max-age=3600, stale-while-revalidate=86400';
// Failures must not be cached for long: an empty feed from an expired token
// would otherwise keep being served by browsers and the CDN after it's fixed.
const CACHE_FAILED = 'public, max-age=60';

let cache: { posts: InstagramPost[]; fetchedAt: number } | null = null;

/**
 * Reads the feed with the long-lived Instagram token, which is seeded from
 * IG_ACCESS_TOKEN and kept fresh in the database (see _lib/igToken.ts). With no
 * token this returns an empty list and the homepage hides its Instagram section.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) {
    res.setHeader('Cache-Control', CACHE_OK);
    return res.status(200).json({ posts: cache.posts });
  }

  const token = await getIgToken();
  if (!token) {
    res.setHeader('Cache-Control', CACHE_FAILED);
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
    res.setHeader('Cache-Control', CACHE_OK);
    return res.status(200).json({ posts });
  } catch (err) {
    console.error('instagram feed failed', err);
    res.setHeader('Cache-Control', CACHE_FAILED);
    return res.status(200).json({ posts: cache?.posts ?? [] });
  }
}
