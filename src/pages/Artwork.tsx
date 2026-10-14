import { useState } from 'react';
import { Link } from 'react-router-dom';
import FramedImage from '../components/FramedImage';
import { SkeletonTile, SkeletonLine } from '../components/SkeletonTile';
import { useArtworks } from '../hooks/useArtworks';
import { useCategories } from '../hooks/useCategories';
import { useReveal } from '../hooks/useReveal';
import { theme, light, h1, eyebrow, availColor } from '../theme';

export default function Artwork() {
  const { data: ARTWORKS, loading, error } = useArtworks();
  const { data: CATEGORIES = []} = useCategories();
  const [cat, setCat] = useState<string>('All');

  const shown = ARTWORKS.filter((a) => cat === 'All' || a.cats.includes(cat));

  useReveal([cat, loading, shown.length]);

  return (
    <div
      style={{
        padding: `clamp(50px,8vw,90px) ${theme.pageX} clamp(70px,11vw,130px)`,
        maxWidth: 1440,
        margin: '0 auto',
      }}
    >
      <h1 style={{ ...h1, marginBottom: 46 }}>Artwork</h1>

      <div
        style={{
          display: 'flex',
          gap: 26,
          flexWrap: 'wrap',
          marginBottom: 52,
          paddingBottom: 20,
          borderBottom: `1px solid ${light.rule}`,
        }}
      >
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            aria-pressed={cat === c}
            style={{
              ...eyebrow,
              color: cat === c ? light.text : light.softer,
              borderBottom: `1px solid ${cat === c ? light.accent : 'transparent'}`,
              padding: '11px 0 7px',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {error ? (
        <p style={{ ...eyebrow, color: light.faint }}>Couldn't load artwork right now.</p>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,460px),1fr))', gap: '64px 48px' }}>
        {loading
          ? [0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i}>
                <SkeletonTile ratio="1 / 1" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                  <SkeletonLine width="70%" height={22} />
                  <SkeletonLine width="50%" height={13} />
                </div>
              </div>
            ))
          : shown.map((a) => (
          <Link
            key={a.id}
            to={`/artwork/${a.id}`}
            data-reveal="1"
            style={{ display: 'block', width: '100%', color: 'inherit' }}
          >
            <FramedImage src={a.images[0].img} alt={a.title} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline', marginTop: 16 }}>
              <div style={{ fontFamily: theme.serif, fontStyle: 'italic', fontSize: 24 }}>{a.title}</div>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: '0.14em',
                  color: availColor(a.avail, true),
                  whiteSpace: 'nowrap',
                }}
              >
                {a.avail}
              </div>
            </div>
            <div style={{ fontSize: 14, color: light.softer, marginTop: 6 }}>
              {a.medium} · {a.size} · {a.year}
              {/* {a.price !== '—' ? ` · ${a.price}` : ''} */}
            </div>
            {a.display && (
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: light.accent,
                  marginTop: 8,
                }}
              >
                On view · {a.display.venue}
              </div>
            )}
          </Link>
            ))}
      </div>
      )}
    </div>
  );
}
