import { upload } from '@vercel/blob/client';
import type {
  AdminArtwork,
  AdminArtworkInput,
  AdminArtworkSummary,
  AdminOptions,
  AdminSession,
  IgPost,
  IgPostInput,
  IgStatus,
} from '../types';

/** Fired when the session cookie is missing or expired, so the shell can show sign-in again. */
export const UNAUTHORIZED_EVENT = 'admin:unauthorized';

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/admin/${path}`, {
    method: init.method ?? 'GET',
    headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  const data = (await res.json().catch(() => ({}))) as T & { error?: string };

  if (res.status === 401 && path !== 'login') {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

export const getSession = () => request<AdminSession>('session');

export const login = (credential: string) =>
  request<{ email: string }>('login', { method: 'POST', body: { credential } });

export const logout = () => request<{ ok: true }>('logout', { method: 'POST', body: {} });

export const getOptions = () => request<AdminOptions>('options');

export const listArtworks = () =>
  request<{ artworks: AdminArtworkSummary[] }>('artworks').then((d) => d.artworks);

export const getArtwork = (id: number) =>
  request<{ artwork: AdminArtwork }>(`artworks/${id}`).then((d) => d.artwork);

export const createArtwork = (input: AdminArtworkInput) =>
  request<{ id: number }>('artworks', { method: 'POST', body: input }).then((d) => d.id);

export const updateArtwork = (id: number, input: AdminArtworkInput) =>
  request<{ id: number }>(`artworks/${id}`, { method: 'PUT', body: input });

export const deleteArtwork = (id: number) => request<{ ok: true }>(`artworks/${id}`, { method: 'DELETE' });

export const getIgStatus = () => request<IgStatus>('ig-status');

export const saveDefaultHashtags = (hashtags: string) =>
  request<{ ok: true }>('ig-hashtags', { method: 'PUT', body: { hashtags } });

export const listIgPosts = () => request<{ posts: IgPost[] }>('ig-posts').then((d) => d.posts);

export const createIgPost = (input: IgPostInput) =>
  request<{ post: IgPost }>('ig-posts', { method: 'POST', body: input }).then((d) => d.post);

export const updateIgPost = (id: number, changes: { caption?: string; action?: 'publish' }) =>
  request<{ post: IgPost }>(`ig-posts/${id}`, { method: 'PATCH', body: changes }).then((d) => d.post);

export const deleteIgPost = (id: number) => request<{ ok: true }>(`ig-posts/${id}`, { method: 'DELETE' });

/**
 * Uploads straight from the browser to Vercel Blob; the server only signs the
 * request. `folder` separates site photos from the Instagram-shaped copies.
 */
export async function uploadImage(file: Blob, name: string, folder: 'artworks' | 'instagram' = 'artworks'): Promise<string> {
  try {
    const blob = await upload(`${folder}/${name}.jpg`, file, {
      access: 'public',
      handleUploadUrl: '/api/admin/upload',
      contentType: 'image/jpeg',
      // The client retries rejected uploads with backoff; without a cap a
      // misconfigured store looks like an endless "Uploading…".
      abortSignal: AbortSignal.timeout(90_000),
    });
    return blob.url;
  } catch (err) {
    const reason = err instanceof Error && err.name !== 'TimeoutError' ? err.message : 'it timed out';
    throw new Error(`Photo upload failed (${reason}). Check the Blob store is public and BLOB_READ_WRITE_TOKEN matches it.`);
  }
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'artwork'
  );
}
