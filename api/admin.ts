import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { clearSessionCookie, getSession, setSessionCookie, verifyGoogleCredential } from './_lib/session.js';
import { parseArtworkInput } from './_lib/adminSchema.js';
import {
    createArtwork,
    deleteArtwork,
    getArtwork,
    getOptions,
    listArtworks,
    updateArtwork,
} from './_lib/adminArtworks.js';
import type { AdminSession } from '../src/types.js';

/**
 * Every /api/admin/* request lands here via the rewrite in vercel.json, which
 * passes the rest of the path as ?route=. One function instead of one per
 * endpoint keeps the deployment under Vercel Hobby's function limit.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Cache-Control', 'no-store');

    const route = String(req.query.route ?? '').replace(/^\/+|\/+$/g, '');
    const [resource, idPart] = route.split('/');
    const method = req.method ?? 'GET';

    try {
        if (resource === 'session' && method === 'GET') {
            const session = getSession(req);
            const body: AdminSession = {
                authenticated: Boolean(session),
                email: session?.email,
                googleClientId: process.env.GOOGLE_CLIENT_ID ?? null,
            };
            return res.status(200).json(body);
        }

        if (resource === 'login' && method === 'POST') {
            const credential = req.body?.credential;
            if (typeof credential !== 'string') {
                return res.status(400).json({ error: 'Missing Google credential' });
            }
            try {
                const email = await verifyGoogleCredential(credential);
                setSessionCookie(res, email);
                return res.status(200).json({ authenticated: true, email });
            } catch (err) {
                return res.status(401).json({ error: err instanceof Error ? err.message : 'Sign-in failed' });
            }
        }

        if (resource === 'logout' && method === 'POST') {
            clearSessionCookie(res);
            return res.status(200).json({ ok: true });
        }

        // Everything below requires a signed-in admin.
        if (!getSession(req)) {
            return res.status(401).json({ error: 'Not signed in' });
        }

        // Mutations must be JSON: combined with the SameSite=Strict cookie this
        // blocks cross-site form posts.
        if (method !== 'GET' && method !== 'DELETE' && !String(req.headers['content-type']).includes('application/json')) {
            return res.status(415).json({ error: 'Expected application/json' });
        }

        if (resource === 'options' && method === 'GET') {
            return res.status(200).json(await getOptions());
        }

        if (resource === 'upload' && method === 'POST') {
            const result = await handleUpload({
                request: req,
                body: req.body as HandleUploadBody,
                onBeforeGenerateToken: async () => ({
                    allowedContentTypes: ['image/jpeg'],
                    maximumSizeInBytes: 20 * 1024 * 1024,
                    // Unique names matter: images are cached for a year.
                    addRandomSuffix: true,
                }),
            });
            return res.status(200).json(result);
        }

        if (resource === 'artworks') {
            if (!idPart) {
                if (method === 'GET') return res.status(200).json({ artworks: await listArtworks() });
                if (method === 'POST') {
                    const parsed = parseArtworkInput(req.body);
                    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
                    const id = await createArtwork(parsed.data);
                    return res.status(201).json({ id });
                }
            } else {
                const id = Number(idPart);
                if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });

                if (method === 'GET') {
                    const artwork = await getArtwork(id);
                    return artwork ? res.status(200).json({ artwork }) : res.status(404).json({ error: 'Not found' });
                }
                if (method === 'PUT') {
                    const parsed = parseArtworkInput(req.body);
                    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
                    const ok = await updateArtwork(id, parsed.data);
                    return ok ? res.status(200).json({ id }) : res.status(404).json({ error: 'Not found' });
                }
                if (method === 'DELETE') {
                    const ok = await deleteArtwork(id);
                    return ok ? res.status(200).json({ ok: true }) : res.status(404).json({ error: 'Not found' });
                }
            }
        }

        return res.status(404).json({ error: `No admin route for ${method} /${route}` });
    } catch (err) {
        console.error('admin request failed', method, route, err);
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
}
