import type { CSSProperties } from 'react';
import { theme, text, eyebrow, solidButton, ghostButton } from '../../theme';

export const page: CSSProperties = {
  padding: `40px ${theme.pageX} 80px`,
  maxWidth: 1100,
  margin: '0 auto',
};

export const pageTitle: CSSProperties = {
  fontFamily: theme.serif,
  fontWeight: 300,
  fontSize: 'clamp(34px,5vw,52px)',
  margin: '0 0 32px',
  lineHeight: 1.05,
};

export const sectionTitle: CSSProperties = {
  ...eyebrow,
  color: theme.brass,
  margin: '44px 0 20px',
  paddingBottom: 10,
  borderBottom: `1px solid ${theme.rule}`,
};

export const caption: CSSProperties = {
  fontSize: 12,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: text.softer,
};

export const hint: CSSProperties = { fontSize: 13, color: text.faint, lineHeight: 1.5 };

export const input: CSSProperties = {
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid rgba(244,235,225,0.5)',
  color: theme.paper,
  fontFamily: theme.sans,
  fontSize: 16,
  padding: '11px 0',
  outline: 'none',
  width: '100%',
  borderRadius: 0,
};

export const select: CSSProperties = { ...input, background: theme.ink, cursor: 'pointer' };

export const primaryButton: CSSProperties = { ...solidButton, border: 'none', cursor: 'pointer', fontFamily: theme.sans };

export const secondaryButton: CSSProperties = {
  ...ghostButton,
  background: 'transparent',
  cursor: 'pointer',
  fontFamily: theme.sans,
};

export const smallButton: CSSProperties = {
  ...eyebrow,
  fontSize: 11,
  padding: '8px 14px',
  background: 'transparent',
  color: theme.paper,
  border: '1px solid rgba(244,235,225,0.5)',
  cursor: 'pointer',
  fontFamily: theme.sans,
};

export const dangerButton: CSSProperties = {
  ...secondaryButton,
  borderColor: '#D98C7A',
  color: '#E8A897',
};

export const errorBox: CSSProperties = {
  border: '1px solid #D98C7A',
  color: '#F0B8A8',
  padding: '14px 18px',
  fontSize: 15,
  lineHeight: 1.5,
  margin: '0 0 24px',
};

export const noticeBox: CSSProperties = {
  border: `1px solid ${theme.brass}`,
  color: theme.bone,
  padding: '14px 18px',
  fontSize: 15,
  margin: '0 0 24px',
};
