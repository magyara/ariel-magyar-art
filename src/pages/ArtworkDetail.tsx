import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import FramedImage from '../components/FramedImage';
import { findArtwork } from '../data/artworks';
import NotFound from './NotFound';
import { theme, text, eyebrow } from '../theme';

export default function ArtworkDetail() {
  const { id } = useParams();
  const piece = findArtwork(id);
  const [shot, setShot] = useState(0);

  if (!piece) return <NotFound />;

  const views = piece.images;
  const index = Math.min(shot, views.length - 1);
  const current = views[index];

  const specs: Array<[string, string]> = [
    ['Medium', piece.medium],
    ['Dimensions', piece.size],
    ['Year', piece.year],
    ['Place', piece.place],
    ['Availability', piece.avail],
    ['Price', piece.price],
  ];

  const step = (delta: number) => setShot((s) => (s + delta + views.length) % views.length);

  return (
    <div
      style={{
        padding: `clamp(40px,7vw,70px) ${theme.pageX} clamp(70px,11vw,130px)`,
        maxWidth: 1280,
        margin: '0 auto',
      }}
    >
      <Link to="/artwork" style={{ ...eyebrow, color: 'rgba(244,235,225,0.72)', display: 'inline-block', marginBottom: 32, padding: '10px 0' }}>
        ← All artwork
      </Link>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
          gap: 'clamp(36px,5vw,70px)',
          alignItems: 'start',
        }}
      >
        <div>
          <div style={{ position: 'relative' }}>
            <FramedImage src={current.img} alt={`${piece.title} — ${current.label}`} fallbackRatio="4 / 5" />

            <NavArrow side="left" onClick={() => step(-1)} label="Previous image" />
            <NavArrow side="right" onClick={() => step(1)} label="Next image" />

            <div
              style={{
                position: 'absolute',
                left: 18,
                bottom: 18,
                display: 'flex',
                gap: 12,
                alignItems: 'baseline',
                background: 'rgba(11,22,17,0.62)',
                backdropFilter: 'blur(6px)',
                padding: '7px 14px',
              }}
            >
              <span style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.brass }}>
                {current.label}
              </span>
              <span style={{ fontFamily: theme.mono, fontSize: 11, color: text.softer }}>
                {index + 1} / {views.length}
              </span>
            </div>
          </div>

          <div
            role="group"
            aria-label="Image views"
            style={{ display: 'grid', gridTemplateColumns: `repeat(${views.length},1fr)`, gap: 12, marginTop: 14 }}
          >
            {views.map((v, i) => (
              <button
                key={v.img}
                type="button"
                onClick={() => setShot(i)}
                aria-label={v.label}
                aria-current={i === index}
                style={{
                  display: 'block',
                  width: '100%',
                  border: `1px solid ${i === index ? theme.brass : 'rgba(244,235,225,0.38)'}`,
                  opacity: i === index ? 1 : 0.6,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    backgroundImage: `url(${v.img})`,
                    backgroundSize: 'cover',
                    backgroundPosition: v.pos ?? 'center',
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        <div style={{ position: 'sticky', top: 120 }}>
          <div style={{ fontFamily: theme.script, fontSize: 22, color: theme.brass, marginBottom: 10 }}>
            {piece.place}
          </div>
          <h1
            style={{
              fontFamily: theme.serif,
              fontWeight: 400,
              fontStyle: 'italic',
              fontSize: 'clamp(34px,4vw,54px)',
              margin: '0 0 28px',
              lineHeight: 1.08,
            }}
          >
            {piece.title}
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.85, color: text.softer, margin: '0 0 34px', textWrap: 'pretty' }}>
            {piece.story}
          </p>

          {piece.display && (
            <div style={{ border: '1px solid rgba(200,162,99,0.45)', padding: '20px 22px', marginBottom: 34 }}>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: theme.brass,
                  marginBottom: 10,
                }}
              >
                Currently on view
              </div>
              <div style={{ fontFamily: theme.serif, fontSize: 22, color: theme.paper, marginBottom: 4 }}>
                {[piece.display.venue, piece.display.city].filter(Boolean).join(' · ')}
              </div>
              {piece.display.dates && (
                <div style={{ fontSize: 14, letterSpacing: '0.06em', color: 'rgba(244,235,225,0.7)' }}>
                  {piece.display.dates}
                </div>
              )}
              {piece.display.note && (
                <p style={{ fontSize: 15, lineHeight: 1.7, color: text.softer, margin: '12px 0 0', textWrap: 'pretty' }}>
                  {piece.display.note}
                </p>
              )}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              background: 'rgba(244,235,225,0.12)',
              marginBottom: 34,
            }}
          >
            {specs.map(([k, v]) => (
              <div
                key={k}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 20, padding: '14px 2px', background: theme.ink }}
              >
                <span style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(244,235,225,0.65)' }}>
                  {k}
                </span>
                <span style={{ fontSize: 15, color: theme.paper }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Inquiries not open yet — hidden along with the /contact route.
          <Link
            to={`/contact?piece=${encodeURIComponent(piece.title)}`}
            style={{ ...solidButton, display: 'block', width: '100%', textAlign: 'center' }}
          >
            Inquire about this piece
          </Link>
          */}
          <div style={{ fontSize: 14, color: 'rgba(244,235,225,0.65)', marginTop: 14, textAlign: 'center' }}>
            Shipping and framing discussed personally.
          </div>
        </div>
      </div>
    </div>
  );
}

function NavArrow({ side, onClick, label }: { side: 'left' | 'right'; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        position: 'absolute',
        left: side === 'left' ? 0 : undefined,
        right: side === 'right' ? 0 : undefined,
        top: 0,
        bottom: 0,
        width: '24%',
        minWidth: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.85,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(11,22,17,0.82)',
          backdropFilter: 'blur(6px)',
          color: theme.paper,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 17,
          lineHeight: 1,
        }}
      >
        {side === 'left' ? '❮' : '❯'}
      </span>
    </button>
  );
}
