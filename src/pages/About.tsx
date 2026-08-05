import { useReveal } from '../hooks/useReveal';
import { theme, text, h1 } from '../theme';

const PROCESS_PHOTOS = [
  {
    src: '/images/building_in_progress.png',
    alt: 'An oil pastel of a brick garden wall in progress on a desk',
  },
  {
    src: '/images/arch_in_progress.png',
    alt: 'The Arch Rock oil pastel in progress among pastels and pencils',
  },
  {
    src: '/images/wisteria_sketch.png',
    alt: 'The wisteria sketch held up in the Georgetown alleyway it was drawn in',
    objectPosition: 'center 40%',
  },
];

export default function About() {
  useReveal();

  return (
    <div
      style={{
        padding: `clamp(50px,8vw,90px) ${theme.pageX} clamp(70px,11vw,130px)`,
        maxWidth: 1180,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
          gap: 'clamp(40px,6vw,70px)',
          alignItems: 'start',
          marginBottom: 120,
        }}
      >
        <div>
          <h1 style={{ ...h1, marginBottom: 28 }}>About</h1>
          <p
            style={{
              fontFamily: theme.serif,
              fontSize: 28,
              lineHeight: 1.4,
              color: theme.paper,
              margin: '0 0 26px',
              textWrap: 'pretty',
            }}
          >
            I moved from Michigan to Arlington, Virginia, where I found inspiration in the wisteria-scented streets of
            Georgetown, brick buildings of Old Town Alexandria, and lush vineyards of Shenandoah.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.9, color: text.soft, margin: '0 0 20px', textWrap: 'pretty' }}>
            Although I’ve always been an artist, years spent building a career in software engineering reminded me how
            important creativity is to my identity.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.9, color: text.soft, margin: '0 0 20px', textWrap: 'pretty' }}>
            I want my art to depict not just places, but the memories and emotions they hold. I’m drawn to the way our
            minds soften the details of meaningful experiences, leaving behind a dreamy recollection of vivid color,
            movement, and feeling.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.9, color: text.soft, margin: 0, textWrap: 'pretty' }}>
            I want those who experience my work to be reminded of their own meaningful moments, whether it’s a busy
            street corner the first time they step out of a hotel in a new city, or a bouquet celebrating someone they
            love. My hope is that the emotions tied to those memories linger long after the moment itself has passed.
          </p>
        </div>

        <div style={{ aspectRatio: '3 / 4', overflow: 'hidden', border: theme.border }}>
          <img
            src="/images/ariel_about.png"
            alt="Ariel Magyar sitting in a sunlit window, waving"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 35%' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 18 }}>
        {PROCESS_PHOTOS.map((p) => (
          <div
            key={p.src}
            data-reveal="1"
            style={{ aspectRatio: '4 / 5', overflow: 'hidden', border: theme.border }}
          >
            <img
              src={p.src}
              alt={p.alt}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: p.objectPosition }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
