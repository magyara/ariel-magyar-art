import type { CSSProperties } from 'react';

export const theme = {
  ink: '#14231C',
  inkDeep: '#0B1611',
  inkPanel: '#101D17',
  bone: '#DED3C4',
  paper: '#F4EBE1',
  brass: '#C8A263',
  serif: "'Cormorant Garamond', serif",
  sans: "'Karla', sans-serif",
  script: "'Caveat', cursive",
  mono: 'ui-monospace, monospace',
  rule: 'rgba(244,235,225,0.16)',
  border: '1px solid rgba(222,211,196,0.55)',
  pageX: 'clamp(20px,5vw,40px)',
} as const;

export const text = {
  soft: 'rgba(244,235,225,0.78)',
  softer: 'rgba(244,235,225,0.68)',
  faint: 'rgba(244,235,225,0.58)',
} as const;

export const eyebrow: CSSProperties = {
  fontSize: 13,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
};

export const h1: CSSProperties = {
  fontFamily: theme.serif,
  fontWeight: 300,
  fontSize: 'clamp(42px,6vw,80px)',
  margin: '0 0 48px',
  lineHeight: 1,
};

export const solidButton: CSSProperties = {
  ...eyebrow,
  display: 'inline-block',
  padding: '17px 32px',
  background: theme.paper,
  color: theme.ink,
  whiteSpace: 'nowrap',
};

export const ghostButton: CSSProperties = {
  ...eyebrow,
  display: 'inline-block',
  padding: '17px 32px',
  border: '1px solid rgba(244,235,225,0.7)',
  color: theme.paper,
  whiteSpace: 'nowrap',
};

export const underlineLink: CSSProperties = {
  ...eyebrow,
  color: theme.bone,
  borderBottom: '1px solid rgba(222,211,196,0.6)',
  padding: '10px 0 6px',
};

export const placeholderTile: CSSProperties = {
  background: 'repeating-linear-gradient(135deg,#1E3229 0 10px,#263D32 10px 20px)',
  display: 'flex',
  alignItems: 'flex-end',
  padding: 16,
};

export const placeholderLabel: CSSProperties = {
  fontFamily: theme.mono,
  fontSize: 11,
  letterSpacing: '0.08em',
  color: text.softer,
};

export const availColor = (avail: string) =>
  avail === 'Sold' || avail === 'Unavailable' ? text.faint : theme.brass;
