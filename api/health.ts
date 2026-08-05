import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    mailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM && process.env.MAIL_TO),
    time: new Date().toISOString(),
  });
}
