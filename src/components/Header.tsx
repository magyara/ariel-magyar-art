import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { theme, light, eyebrow } from '../theme';
import { useNarrow } from '../hooks/useMediaQuery';
import { SITE } from '../data/artworks';
import InstagramMark from './InstagramMark';

const LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Artwork', to: '/artwork' },
  { label: 'About', to: '/about' },
];

function InstagramLink() {
  return (
    <a
      href={SITE.instagram}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Instagram ${SITE.instagramHandle} (opens in a new tab)`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        color: light.green,
      }}
    >
      <InstagramMark />
    </a>
  );
}

export default function Header() {
  const narrow = useNarrow();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname, narrow]);

  const handleHomeClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navOpen = !narrow || open;

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: `10px ${theme.pageX}`,
        backgroundColor: 'rgba(253,252,250,0.82)',
        backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${light.rule}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: narrow ? 'wrap' : 'nowrap',
        }}
      >
        <Link
          to="/"
          onClick={handleHomeClick}
          className="no-hover"
          style={{
            fontFamily: theme.serif,
            fontSize: 20,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: light.black,
            padding: '12px 0',
          }}
        >
          Ariel Magyar
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: narrow ? 4 : 16 }}>
          {/* On phones the menu button stays at the edge, so the icon comes first. */}
          {narrow && <InstagramLink />}
          {narrow ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="primary-nav"
              aria-label={open ? 'Close menu' : 'Open menu'}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-end',
                gap: 5,
                width: 44,
                height: 44,
              }}
            >
              <span aria-hidden style={{ display: 'block', width: 24, height: 1, background: light.text }} />
              <span aria-hidden style={{ display: 'block', width: 24, height: 1, background: light.text }} />
              <span aria-hidden style={{ display: 'block', width: 16, height: 1, background: light.text }} />
            </button>
          ) : (
            <nav
              id="primary-nav"
              aria-label="Main"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '4px 24px',
              }}
            >
              {LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={handleHomeClick}
                  end={l.to === '/'}
                  style={({ isActive }) => ({
                    ...eyebrow,
                    color: light.green,
                    fontWeight: 500,
                    padding: '12px 0',
                    borderBottom: `1px solid ${isActive ? light.accent : 'transparent'}`,
                  })}
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          )}
          {!narrow && <InstagramLink />}
        </div>
      </div>

      {narrow && navOpen && (
        <nav
          id="primary-nav"
          aria-label="Main"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2, padding: '8px 0 14px' }}
        >
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={handleHomeClick}
              end={l.to === '/'}
              style={({ isActive }) => ({
                ...eyebrow,
                color: light.green,
                fontWeight: 500,
                padding: '12px 0',
                width: '100%',
                borderBottom: `1px solid ${isActive ? light.accent : 'transparent'}`,
              })}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
