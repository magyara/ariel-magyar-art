import { theme, placeholderTile, placeholderLabel } from '../theme';

interface SkeletonTileProps {
  ratio?: string;
  label?: string;
}

export function SkeletonTile({ ratio = '1 / 1', label }: SkeletonTileProps) {
  return (
    <div
      data-skeleton="1"
      style={{
        ...placeholderTile,
        border: theme.border,
        aspectRatio: ratio,
      }}
    >
      {label && <span style={placeholderLabel}>{label}</span>}
    </div>
  );
}

interface SkeletonLineProps {
  width?: string | number;
  height?: number;
}

export function SkeletonLine({ width = '100%', height = 14 }: SkeletonLineProps) {
  return (
    <div
      data-skeleton="1"
      style={{
        width,
        height,
        background: 'rgba(244,235,225,0.08)',
      }}
    />
  );
}
