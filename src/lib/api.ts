import type { InstagramPost } from '../types';

export async function fetchInstagramFeed(): Promise<InstagramPost[]> {
  try {
    const res = await fetch('/api/instagram');
    if (!res.ok) return [];
    const data = (await res.json()) as { posts?: InstagramPost[] };
    return data.posts ?? [];
  } catch {
    return [];
  }
}
