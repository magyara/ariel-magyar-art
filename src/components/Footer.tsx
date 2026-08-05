import { Link } from 'react-router-dom';
import { theme, text, eyebrow } from '../theme';
import { SITE } from '../data/artworks';

const LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Artwork', to: '/artwork' },
  { label: 'Commissions', to: '/commissions' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: theme.inkDeep,
        backgroundImage:
          'linear-gradient(rgba(11,22,17,0.58),rgba(11,22,17,0.58)), url(/images/roses_green.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: `70px ${theme.pageX} 50px`,
        borderTop: `1px solid ${theme.rule}`,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 40,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <div style={{ fontFamily: theme.serif, fontSize: 30, marginBottom: 14 }}>{SITE.name}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: 'rgba(244,235,225,0.72)' }}>
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
              {SITE.instagramHandle}
            </a>
            <a href={`mailto:${SITE.email}`} style={{ color: 'inherit' }}>
              {SITE.email}
            </a>
          </div>
        </div>

        <nav aria-label="Footer" style={{ display: 'flex', gap: '6px 28px', flexWrap: 'wrap' }}>
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              style={{ ...eyebrow, color: 'rgba(244,235,225,0.72)', padding: '10px 0' }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <div style={{ maxWidth: 1280, margin: '44px auto 0', fontSize: 14, color: text.soft }}>
        © {new Date().getFullYear()} {SITE.name}
      </div>
    </footer>
  );
}
