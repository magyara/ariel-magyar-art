import type { VercelRequest, VercelResponse } from '@vercel/node';
import { inquirySchema } from './_lib/schema';
import { sendMail } from './_lib/mail';
import { rateLimited } from './_lib/rateLimit';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? 'unknown';

  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Too many messages just now — please try again shortly.' });
  }

  const parsed = inquirySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Please check the form.' });
  }

  // Honeypot filled → pretend success so bots do not retry.
  if (parsed.data.company) return res.status(200).json({ ok: true });

  try {
    await sendMail(parsed.data);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('inquiry failed', err);
    return res.status(502).json({
      error: 'Your message could not be sent. Please email hello@arielmagyar.art directly.',
    });
  }
}
