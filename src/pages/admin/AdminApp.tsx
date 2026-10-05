import { useCallback, useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { theme, eyebrow, text } from '../../theme';
import { getSession, logout, UNAUTHORIZED_EVENT } from '../../lib/adminApi';
import type { AdminSession } from '../../types';
import AdminLogin from './AdminLogin';
import ArtworkList from './ArtworkList';
import ArtworkForm from './ArtworkForm';
import InstagramPosts from './InstagramPosts';
import { page, errorBox, smallButton } from './adminStyles';

const navLink = { ...eyebrow, fontSize: 12, color: theme.bone };

/** Entry for /admin/*. Lazy-loaded from App.tsx so none of this ships to visitors. */
export default function AdminApp() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    getSession()
      .then(setSession)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    document.title = 'Studio admin';
    refresh();
    const onUnauthorized = () => setSession((s) => (s ? { ...s, authenticated: false } : s));
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [refresh]);

  if (error) return <div style={page}><p style={errorBox}>{error}</p></div>;
  if (!session) return <div style={{ ...page, color: text.faint }}>Loading…</div>;
  if (!session.authenticated) return <AdminLogin clientId={session.googleClientId} onSignedIn={refresh} />;

  return (
    <>
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '14px 28px',
          padding: `18px ${theme.pageX}`,
          borderBottom: `1px solid ${theme.rule}`,
          background: theme.inkDeep,
        }}
      >
        <Link to="/admin" style={{ fontFamily: theme.serif, fontSize: 24, color: theme.paper }}>
          Studio admin
        </Link>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 24px', flex: 1 }}>
          <Link to="/admin" style={navLink}>All artwork</Link>
          <Link to="/admin/new" style={navLink}>Add artwork</Link>
          <Link to="/admin/instagram" style={navLink}>Instagram</Link>
          <a href="/" target="_blank" rel="noopener noreferrer" style={navLink}>View site ↗</a>
        </nav>
        <span style={{ fontSize: 13, color: text.faint }}>{session.email}</span>
        <button
          type="button"
          style={smallButton}
          onClick={() => logout().finally(() => setSession({ ...session, authenticated: false }))}
        >
          Sign out
        </button>
      </header>

      <Routes>
        <Route index element={<ArtworkList />} />
        <Route path="new" element={<ArtworkForm />} />
        <Route path="instagram" element={<InstagramPosts />} />
        <Route path=":id" element={<ArtworkForm />} />
      </Routes>
    </>
  );
}
