import type { CSSProperties, ReactNode } from 'react';
import { theme, text } from '../theme';

const labelStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 9 };

const captionStyle: CSSProperties = {
  fontSize: 12,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: text.softer,
};

export const fieldStyle: CSSProperties = {
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid rgba(244,235,225,0.5)',
  color: theme.paper,
  fontSize: 16,
  padding: '11px 0',
  outline: 'none',
};

interface FieldProps {
  label: string;
  children: ReactNode;
  full?: boolean;
}

export default function Field({ label, children, full }: FieldProps) {
  return (
    <label style={full ? { ...labelStyle, gridColumn: '1 / -1' } : labelStyle}>
      <span style={captionStyle}>{label}</span>
      {children}
    </label>
  );
}
