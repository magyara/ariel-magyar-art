import { useState } from 'react';
import { Link } from 'react-router-dom';
import FramedImage from '../components/FramedImage';
import { ARTWORKS, CATEGORIES } from '../data/artworks';
import { useReveal } from '../hooks/useReveal';
import { theme, text, h1, eyebrow, availColor } from '../theme';

export default function Artwork() {
  const [cat, setCat] = useState<string>('All');
  const shown = ARTWORKS.filter((a) => cat === 'All' || a.cats.includes(cat));
  useReveal([cat]);

  return (
    <div
      style={{
        padding: `clamp(50px,8vw,90px) ${theme.pageX} clamp(70px,11vw,130px)`,
        maxWidth: 1280,
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
          borderBottom: '1px solid rgba(244,235,225,0.12)',
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
              color: cat === c ? theme.paper : text.softer,
              borderBottom: `1px solid ${cat === c ? theme.brass : 'transparent'}`,
              padding: '11px 0 7px',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '44px 32px' }}>
        {shown.map((a) => (
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
                  color: availColor(a.avail),
                  whiteSpace: 'nowrap',
                }}
              >
                {a.avail}
              </div>
            </div>
            <div style={{ fontSize: 14, color: text.softer, marginTop: 6 }}>
              {a.medium} · {a.size} · {a.year}
              {a.price !== '—' ? ` · ${a.price}` : ''}
            </div>
            {a.display && (
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: theme.brass,
                  marginTop: 8,
                }}
              >
                On view · {a.display.venue}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
