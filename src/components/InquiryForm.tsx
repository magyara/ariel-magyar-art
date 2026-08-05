import { useState } from 'react';
import Field, { fieldStyle } from './Field';
import { sendInquiry } from '../lib/api';
import { solidButton, theme } from '../theme';
import type { InquiryPayload } from '../types';

const PROJECT_TYPES = ['Floral Bouquet', 'Personal/Home Artwork', 'Business Space', 'Something Else'];

interface Props {
  kind: InquiryPayload['kind'];
  /** Commission form adds project type + timeline; contact form is name/email/message. */
  messageLabel?: string;
  artwork?: string;
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function InquiryForm({ kind, messageLabel, artwork }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [note, setNote] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');

    const el = e.currentTarget;
    const form = new FormData(el);
    const result = await sendInquiry({
      kind,
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      message: String(form.get('message') ?? ''),
      projectType: form.get('projectType') ? String(form.get('projectType')) : undefined,
      timeline: form.get('timeline') ? String(form.get('timeline')) : undefined,
      artwork,
    });

    setNote(result.message);
    setStatus(result.ok ? 'sent' : 'error');
    if (result.ok) el.reset();
  }

  const label =
    status === 'sending' ? 'Sending…' : status === 'sent' ? 'Thank you — I’ll be in touch' : 'Send';

  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 26 }}>
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
        />
        <Field label="Name">
          <input type="text" name="name" autoComplete="name" required style={fieldStyle} />
        </Field>
        <Field label="Email">
          <input type="email" name="email" autoComplete="email" required style={fieldStyle} />
        </Field>

        {kind === 'commission' && (
          <>
            <Field label="Type of project">
              <select
                name="projectType"
                style={{ ...fieldStyle, background: theme.ink }}
                defaultValue={PROJECT_TYPES[0]}
              >
                {PROJECT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Timeline">
              <input type="text" name="timeline" placeholder="No rush / by a date" style={fieldStyle} />
            </Field>
          </>
        )}

        <Field label={messageLabel ?? 'Message'} full>
          <textarea
            name="message"
            rows={kind === 'commission' ? 4 : 5}
            required
            style={{ ...fieldStyle, resize: 'vertical' }}
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        style={{ ...solidButton, marginTop: 42, padding: '17px 40px', opacity: status === 'sending' ? 0.7 : 1 }}
      >
        {label}
      </button>

      <p
        aria-live="polite"
        style={{
          fontSize: 15,
          color: status === 'error' ? '#E8A98F' : theme.brass,
          margin: '18px 0 0',
          minHeight: 1,
        }}
      >
        {note}
      </p>
    </form>
  );
}
