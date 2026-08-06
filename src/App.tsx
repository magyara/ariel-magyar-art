import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Artwork from './pages/Artwork';
import ArtworkDetail from './pages/ArtworkDetail';
// Commissions and Contact are temporarily unrouted — not ready to accept inquiries yet.
// import Commissions from './pages/Commissions';
import About from './pages/About';
// import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import { theme } from './theme';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div
      style={{
        background: theme.ink,
        color: theme.paper,
        fontFamily: theme.sans,
        fontWeight: 300,
        minHeight: '100vh',
        overflowX: 'clip',
      }}
    >
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
          {/* <Route path="/commissions" element={<Commissions />} /> */}
          <Route path="/about" element={<About />} />
          {/* <Route path="/contact" element={<Contact />} /> */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
      <Analytics />
      <SpeedInsights />
    </div>
  );
}
