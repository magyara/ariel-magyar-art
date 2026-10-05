import { getIgToken } from './igToken.js';

const GRAPH = 'https://graph.instagram.com/v23.0';
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 40_000;

/** Only the production deployment posts for real; local dev and Previews dry-run. */
export const isLive = () => process.env.VERCEL_ENV === 'production';

export interface PublishResult {
    mediaId: string;
    permalink: string | null;
    dryRun: boolean;
}

interface GraphError {
    error?: { message?: string; error_user_msg?: string };
}

async function graph<T>(token: string, path: string, method: 'GET' | 'POST', params: Record<string, string>): Promise<T> {
    const url = new URL(`${GRAPH}/${path}`);
    const body = new URLSearchParams({ ...params, access_token: token });

    const res =
        method === 'GET'
            ? await fetch(`${url}?${body}`)
            : await fetch(url, { method: 'POST', body });

    const data = (await res.json().catch(() => ({}))) as T & GraphError;
    if (!res.ok || data.error) {
        const message = data.error?.error_user_msg ?? data.error?.message ?? `HTTP ${res.status}`;
        throw new Error(`Instagram: ${message}`);
    }
    return data;
}

export async function getIgAccount(): Promise<{ userId: string; username: string } | null> {
    const token = await getIgToken();
    if (!token) return null;
    const me = await graph<{ user_id?: string; id: string; username: string }>(token, 'me', 'GET', {
        fields: 'user_id,username',
    });
    return { userId: me.user_id ?? me.id, username: me.username };
}

/** Instagram downloads and processes each image asynchronously; wait until it's ready. */
async function waitUntilReady(token: string, containerId: string): Promise<void> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    for (;;) {
        const { status_code } = await graph<{ status_code: string }>(token, containerId, 'GET', {
            fields: 'status_code',
        });
        if (status_code === 'FINISHED') return;
        if (status_code === 'ERROR' || status_code === 'EXPIRED') {
            throw new Error(`Instagram couldn't process the image (${status_code}).`);
        }
        if (Date.now() > deadline) throw new Error('Instagram took too long to process the image. Try again.');
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
}

/**
 * Publishes one image, or a carousel when there are several. `imageUrls` must
 * be public JPEGs already at an Instagram-accepted shape.
 */
export async function publishToInstagram(imageUrls: string[], caption: string): Promise<PublishResult> {
    if (imageUrls.length === 0) throw new Error('A post needs at least one image.');

    if (!isLive()) {
        return { mediaId: `dry-run-${Date.now()}`, permalink: null, dryRun: true };
    }

    const token = await getIgToken();
    if (!token) throw new Error('Instagram is not connected (no access token).');

    const account = await getIgAccount();
    const user = account!.userId;

    let containerId: string;
    if (imageUrls.length === 1) {
        const container = await graph<{ id: string }>(token, `${user}/media`, 'POST', {
            image_url: imageUrls[0],
            caption,
        });
        containerId = container.id;
    } else {
        const children: string[] = [];
        for (const image_url of imageUrls) {
            const child = await graph<{ id: string }>(token, `${user}/media`, 'POST', {
                image_url,
                is_carousel_item: 'true',
            });
            children.push(child.id);
        }
        await Promise.all(children.map((id) => waitUntilReady(token, id)));

        const container = await graph<{ id: string }>(token, `${user}/media`, 'POST', {
            media_type: 'CAROUSEL',
            children: children.join(','),
            caption,
        });
        containerId = container.id;
    }

    await waitUntilReady(token, containerId);

    const published = await graph<{ id: string }>(token, `${user}/media_publish`, 'POST', {
        creation_id: containerId,
    });

    // The post is live at this point; a permalink lookup failure shouldn't mark it failed.
    let permalink: string | null = null;
    try {
        const media = await graph<{ permalink?: string }>(token, published.id, 'GET', { fields: 'permalink' });
        permalink = media.permalink ?? null;
    } catch (err) {
        console.error('permalink lookup failed', err);
    }

    return { mediaId: published.id, permalink, dryRun: false };
}
