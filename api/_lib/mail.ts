import type { Inquiry } from './schema';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderInquiry(data: Inquiry) {
  const rows: Array<[string, string | undefined]> = [
    ['Type', data.kind === 'commission' ? 'Commission request' : 'General contact'],
    ['Name', data.name],
    ['Email', data.email],
    ['Artwork', data.artwork],
    ['Project type', data.projectType],
    ['Timeline', data.timeline],
  ];

  const subject =
    data.kind === 'commission'
      ? `Commission request — ${data.name}`
      : data.artwork
        ? `Inquiry: ${data.artwork} — ${data.name}`
        : `Website message — ${data.name}`;

  const text = [
    ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    '',
    data.message,
  ].join('\n');

  const html = `
    <div style="font-family:-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.6;color:#14231C">
      <table style="border-collapse:collapse;margin-bottom:18px">
        ${rows
          .filter(([, v]) => v)
          .map(
            ([k, v]) =>
              `<tr><td style="padding:4px 16px 4px 0;color:#6b7a72">${escapeHtml(k)}</td><td style="padding:4px 0"><strong>${escapeHtml(v!)}</strong></td></tr>`,
          )
          .join('')}
      </table>
      <div style="white-space:pre-wrap;border-left:3px solid #C8A263;padding-left:14px">${escapeHtml(data.message)}</div>
    </div>`;

  return { subject, text, html };
}

/**
 * Sends via Resend's HTTP API — no SDK, so the function stays dependency-light.
 * Set RESEND_API_KEY, MAIL_FROM, and MAIL_TO in the Vercel project settings.
 */
export async function sendMail(data: Inquiry): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  const to = process.env.MAIL_TO;

  if (!key || !from || !to) {
    throw new Error('Mail is not configured (RESEND_API_KEY, MAIL_FROM, MAIL_TO).');
  }

  const { subject, text, html } = renderInquiry(data);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], reply_to: data.email, subject, text, html }),
  });

  if (!res.ok) {
    throw new Error(`Mail provider rejected the message (${res.status}): ${await res.text()}`);
  }
}
