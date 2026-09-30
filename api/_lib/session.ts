import { createHmac, timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const COOKIE = 'am_admin';
const MAX_AGE_S = 30 * 24 * 60 * 60;

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

interface Session {
    email: string;
    exp: number;
}

function secret(): string {
    const s = process.env.SESSION_SECRET;
    if (!s || s.length < 32) {
        throw new Error('SESSION_SECRET must be set (32+ characters).');
    }
    return s;
}

function sign(value: string): string {
    return createHmac('sha256', secret()).update(value).digest('base64url');
}

function adminEmails(): string[] {
    return (process.env.ADMIN_EMAILS ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
}

/**
 * Verifies a Google Identity Services ID token and returns the email if it
 * belongs to an allowed admin. Throws with a user-facing message otherwise.
 */
export async function verifyGoogleCredential(credential: string): Promise<string> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not configured.');

    const { payload } = await jwtVerify(credential, googleKeys, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: clientId,
    });

    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
    if (!email || payload.email_verified !== true) {
        throw new Error('Google account email is not verified.');
    }
    if (!adminEmails().includes(email)) {
        throw new Error(`${email} is not allowed to sign in.`);
    }
    return email;
}

export function setSessionCookie(res: VercelResponse, email: string): void {
    const body = Buffer.from(
        JSON.stringify({ email, exp: Math.floor(Date.now() / 1000) + MAX_AGE_S } satisfies Session),
    ).toString('base64url');

    res.setHeader(
        'Set-Cookie',
        `${COOKIE}=${body}.${sign(body)}; Path=/api/admin; Max-Age=${MAX_AGE_S}; HttpOnly; Secure; SameSite=Strict`,
    );
}

export function clearSessionCookie(res: VercelResponse): void {
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/api/admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);
}

export function getSession(req: VercelRequest): Session | null {
    const raw = req.cookies?.[COOKIE];
    if (!raw) return null;

    const [body, sig] = raw.split('.');
    if (!body || !sig) return null;

    const expected = Buffer.from(sign(body));
    const actual = Buffer.from(sig);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

    try {
        const session = JSON.parse(Buffer.from(body, 'base64url').toString()) as Session;
        if (session.exp < Date.now() / 1000) return null;
        // Removing someone from ADMIN_EMAILS revokes their existing cookie too.
        if (!adminEmails().includes(session.email)) return null;
        return session;
    } catch {
        return null;
    }
}
