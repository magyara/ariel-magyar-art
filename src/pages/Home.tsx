import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FramedImage from '../components/FramedImage';
import { ARTWORKS, SITE } from '../data/artworks';
import { fetchInstagramFeed } from '../lib/api';
import { useReveal } from '../hooks/useReveal';
import { useNarrow } from '../hooks/useMediaQuery';
import type { InstagramPost } from '../types';
import {
  theme,
  text,
  eyebrow,
  solidButton,
  ghostButton,
  underlineLink,
  placeholderTile,
  placeholderLabel,
} from '../theme';

export default function Home() {
  useReveal();
  const narrow = useNarrow();
  const featured = ARTWORKS.filter((a) => a.featured);
  const [igPosts, setIgPosts] = useState<InstagramPost[]>([]);

  useEffect(() => {
    let live = true;
    fetchInstagramFeed().then((posts) => {
      if (live) setIgPosts(posts);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div>
      {/* Hero */}
      <div style={{ position: 'relative', minHeight: '88vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            textAlign: 'center',
            padding: `clamp(70px,10vw,110px) ${theme.pageX}`,
            maxWidth: 1180,
            margin: '0 auto',
          }}
        >
          <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)', margin: 0 }}>
            {SITE.name}
          </h1>

          <div
            style={{
              ...placeholderTile,
              maxWidth: 640,
              margin: '0 auto 40px',
              aspectRatio: '16 / 9',
              justifyContent: 'flex-start',
            }}
          >
            <span style={{ ...placeholderLabel, textAlign: 'left' }}>SIGNATURE GIF — Ariel writing her signature</span>
          </div>

          <p
            style={{
              maxWidth: 600,
              fontSize: 19,
              lineHeight: 1.65,
              color: 'rgba(244,235,225,0.82)',
              margin: '0 auto 40px',
              textWrap: 'pretty',
            }}
          >
            Arlington, VA-based artist capturing the feelings behind everyday moments
          </p>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/artwork" style={solidButton}>
              Explore Artwork
            </Link>
            <Link to="/commissions" style={ghostButton}>
              Commission a Piece
            </Link>
          </div>
        </div>
      </div>

      {/* Featured works */}
      <div style={{ background: theme.inkPanel, padding: `clamp(66px,10vw,120px) ${theme.pageX}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 24,
              flexWrap: 'wrap',
              marginBottom: 70,
            }}
          >
            <h2
              style={{
                fontFamily: theme.serif,
                fontWeight: 300,
                fontSize: 'clamp(38px,5vw,64px)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Featured Works
            </h2>
            <Link to="/artwork" style={{ ...eyebrow, color: 'rgba(244,235,225,0.75)', padding: '10px 0' }}>
              See all artwork →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 110 }}>
            {featured.map((w, i) => {
              const flipped = i % 2 === 1;
              return (
                <div
                  key={w.id}
                  data-reveal="1"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: narrow ? '1fr' : flipped ? '0.9fr 1.1fr' : '1.1fr 0.9fr',
                    gap: 'clamp(30px,5vw,56px)',
                    alignItems: 'start',
                  }}
                >
                  <Link
                    to={`/artwork/${w.id}`}
                    aria-label={`View ${w.title}`}
                    style={{ display: 'block', width: '100%', order: narrow ? 1 : flipped ? 2 : 1 }}
                  >
                    <FramedImage src={w.images[0].img} alt={w.title} fallbackRatio="5 / 4" />
                  </Link>

                  <div style={{ order: narrow ? 2 : flipped ? 1 : 2 }}>
                    <div style={{ fontFamily: theme.script, fontSize: 22, color: theme.brass, marginBottom: 10 }}>
                      {w.place}
                    </div>
                    <h3
                      style={{
                        fontFamily: theme.serif,
                        fontWeight: 400,
                        fontStyle: 'italic',
                        fontSize: 'clamp(30px,3.4vw,46px)',
                        margin: '0 0 20px',
                        lineHeight: 1.1,
                      }}
                    >
                      <Link to={`/artwork/${w.id}`} style={{ font: 'inherit', color: 'inherit' }}>
                        {w.title}
                      </Link>
                    </h3>
                    <p
                      style={{
                        fontSize: 16,
                        lineHeight: 1.85,
                        color: text.soft,
                        margin: '0 0 24px',
                        maxWidth: '44ch',
                        textWrap: 'pretty',
                      }}
                    >
                      {w.story}
                    </p>
                    <div style={{ fontSize: 13, letterSpacing: '0.12em', color: 'rgba(244,235,225,0.65)', marginBottom: 10 }}>
                      {w.medium} · {w.size} · {w.year}
                      {w.price !== '—' ? ` · ${w.price}` : ''}
                    </div>
                    {w.display && (
                      <div
                        style={{
                          fontSize: 13,
                          letterSpacing: '0.16em',
                          textTransform: 'uppercase',
                          color: theme.brass,
                          marginBottom: 22,
                        }}
                      >
                        On view · {w.display.venue}
                      </div>
                    )}
                    <Link to={`/artwork/${w.id}`} style={underlineLink}>
                      View this piece
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* The Artist */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
          gap: 'clamp(40px,6vw,72px)',
          alignItems: 'center',
          padding: `clamp(70px,11vw,130px) ${theme.pageX}`,
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        <div data-reveal="1">
          <div
            style={{
              fontSize: 12,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: theme.brass,
              marginBottom: 26,
            }}
          >
            The Artist
          </div>
          <p
            style={{
              fontFamily: theme.serif,
              fontSize: 'clamp(26px,3vw,38px)',
              lineHeight: 1.32,
              margin: '0 0 28px',
              color: theme.paper,
              textWrap: 'pretty',
            }}
          >
            Did you know you can watercolor while flying?
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.85, color: text.soft, margin: '0 0 20px', maxWidth: '52ch', textWrap: 'pretty' }}>
            When I travel I like to tuck a small watercolor sketchbook and travel palette into my carry-on. A few
            hours after take-off is the perfect time to paint! It saves money on souvenirs while giving me tangible
            memories of the places I’ve been. I’ve had the travel itch lately and in the past couple of years have
            visited Japan, Spain, Morocco, the Philippines, and Bolivia.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.85, color: text.soft, margin: '0 0 32px', maxWidth: '52ch', textWrap: 'pretty' }}>
            When I’m not traveling, I enjoy lounging in a local cafe or, if I need more back support and elbow room,
            working at home on my vintage teak desk. My two cats, May and Sophie, are my biggest critics. I assure you
            that any fur will be diligently plucked from the pastels before sealing.
          </p>
          <Link to="/about" style={underlineLink}>
            More about Ariel
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} data-reveal="1">
          <PhotoTile
            src="/images/travel_journal_flowers.png"
            alt="Dahlia studies in a sketchbook beside a watercolor palette and a cup of tea"
            ratio="4 / 3"
            span
          />
          <PhotoTile src="/images/ariel_bolivia.png" alt="Ariel in Bolivia" ratio="3 / 4" />
          <PhotoTile
            src="/images/travel_journal_cat.png"
            alt="Watercolor sketch of a cat asleep in a planter on a brick wall"
            ratio="3 / 4"
          />
        </div>
      </div>

      {/* Instagram */}
      <div style={{ padding: `0 ${theme.pageX} clamp(70px,11vw,130px)`, maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: theme.serif, fontWeight: 300, fontSize: 32, margin: 0 }}>
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
              {SITE.instagramHandle}
            </a>
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12 }}>
          {igPosts.length > 0
            ? igPosts.map((post) => (
                <a
                  key={post.id}
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={post.caption ? post.caption.slice(0, 140) : 'View on Instagram'}
                  style={{ display: 'block', aspectRatio: '1', overflow: 'hidden' }}
                >
                  <img
                    src={post.imageUrl}
                    alt={post.caption ? post.caption.slice(0, 140) : 'Instagram post'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                </a>
              ))
            : ['IG 01', 'IG 02', 'IG 03', 'IG 04', 'IG 05'].map((slot) => (
                <div key={slot} style={{ ...placeholderTile, aspectRatio: '1', padding: 12 }}>
                  <span style={placeholderLabel}>{slot}</span>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

function PhotoTile({
  src,
  alt,
  ratio,
  span,
  objectPosition,
}: {
  src: string;
  alt: string;
  ratio: string;
  span?: boolean;
  objectPosition?: string;
}) {
  return (
    <div
      style={{
        gridColumn: span ? '1 / -1' : undefined,
        aspectRatio: ratio,
        overflow: 'hidden',
        border: theme.border,
      }}
    >
      <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition }} />
    </div>
  );
}
