import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { theme, eyebrow } from '../theme';
import { useNarrow } from '../hooks/useMediaQuery';

const LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Artwork', to: '/artwork' },
  { label: 'Commissions', to: '/commissions' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export default function Header() {
  const narrow = useNarrow();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname, narrow]);

  const navOpen = !narrow || open;

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: `10px ${theme.pageX}`,
        backgroundColor: theme.inkDeep,
        backgroundImage:
          'linear-gradient(rgba(11,22,17,0.62),rgba(11,22,17,0.62)), url(/images/roses_green.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${theme.rule}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <Link
          to="/"
          style={{
            fontFamily: theme.serif,
            fontSize: 20,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: theme.paper,
            padding: '12px 0',
          }}
        >
          Ariel Magyar
        </Link>

        {narrow && (
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
            <span aria-hidden style={{ display: 'block', width: 24, height: 1, background: theme.paper }} />
            <span aria-hidden style={{ display: 'block', width: 24, height: 1, background: theme.paper }} />
            <span aria-hidden style={{ display: 'block', width: 16, height: 1, background: theme.paper }} />
          </button>
        )}
      </div>

      {navOpen && (
        <nav
          id="primary-nav"
          aria-label="Main"
          style={
            narrow
              ? { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2, padding: '8px 0 14px' }
              : {
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '4px 24px',
                  marginTop: -46,
                }
          }
        >
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              style={({ isActive }) => ({
                ...eyebrow,
                color: isActive ? theme.paper : 'rgba(244,235,225,0.74)',
                padding: '12px 0',
                width: narrow ? '100%' : 'auto',
                borderBottom: `1px solid ${isActive ? theme.brass : 'transparent'}`,
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
