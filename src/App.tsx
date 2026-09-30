import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Artwork from './pages/Artwork';
import ArtworkDetail from './pages/ArtworkDetail';
import About from './pages/About';
import NotFound from './pages/NotFound';
import { theme } from './theme';

// Admin code is split into its own chunk so visitors never download it.
const AdminApp = lazy(() => import('./pages/admin/AdminApp'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  return null;
}

const shell = {
  background: theme.ink,
  color: theme.paper,
  fontFamily: theme.sans,
  fontWeight: 300,
  minHeight: '100vh',
  overflowX: 'clip',
} as const;

export default function App() {
  const { pathname } = useLocation();

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <div style={shell}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/admin/*" element={<AdminApp />} />
          </Routes>
        </Suspense>
      </div>
    );
  }

  return (
    <div style={shell}>
      <ScrollToTop />
      <a
        href="#main"
        style={{
          position: 'absolute',
          left: -9999,
          top: 0,
          zIndex: 100,
          background: theme.paper,
          color: theme.ink,
          padding: '12px 20px',
          fontSize: 14,
          letterSpacing: '0.1em',
        }}
        onFocus={(e) => {
          e.currentTarget.style.left = '12px';
          e.currentTarget.style.top = '12px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.left = '-9999px';
        }}
      >
        Skip to content
      </a>

      <Header />

      <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/artwork" element={<Artwork />} />
          <Route path="/artwork/:id" element={<ArtworkDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
      <Analytics />
      <SpeedInsights />
    </div>
  );
}
