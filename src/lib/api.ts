import type { InquiryPayload } from '../types';

export interface InquiryResult {
  ok: boolean;
  message: string;
}

export async function sendInquiry(payload: InquiryPayload): Promise<InquiryResult> {
  try {
    const res = await fetch('/api/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      return {
        ok: false,
        message:
          data.error ??
          'Something went wrong sending your message. Please email hello@arielmagyar.art directly.',
      };
    }

    return { ok: true, message: 'Thank you — your message has been sent. I’ll be in touch soon.' };
  } catch {
    return {
      ok: false,
      message: 'Could not reach the server. Please email hello@arielmagyar.art directly.',
    };
  }
}
