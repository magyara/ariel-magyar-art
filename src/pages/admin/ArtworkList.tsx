import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { theme, text, availColor } from '../../theme';
import { listArtworks } from '../../lib/adminApi';
import type { AdminArtworkSummary } from '../../types';
import { page, pageTitle, errorBox, noticeBox, primaryButton, hint } from './adminStyles';

export default function ArtworkList() {
  const [artworks, setArtworks] = useState<AdminArtworkSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notice = (useLocation().state as { notice?: string } | null)?.notice;

  useEffect(() => {
    listArtworks()
      .then(setArtworks)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div style={page}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
        <h1 style={pageTitle}>All artwork</h1>
        <Link to="/admin/new" style={primaryButton}>Add artwork</Link>
      </div>

      {notice && <p style={noticeBox}>{notice}</p>}
      {error && <p style={errorBox}>{error}</p>}
      {!artworks && !error && <p style={hint}>Loading…</p>}
      {artworks?.length === 0 && <p style={hint}>No artwork yet.</p>}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {artworks?.map((a) => (
          <li key={a.id} style={{ borderBottom: `1px solid ${theme.rule}` }}>
            <Link
              to={`/admin/${a.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '14px 0', color: theme.paper }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  flexShrink: 0,
                  background: a.thumbUrl ? `center / cover no-repeat url("${a.thumbUrl}")` : theme.inkPanel,
                  border: theme.border,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: theme.serif, fontSize: 22, lineHeight: 1.2 }}>
                  {a.title}
                  {a.featured && (
                    <span title="Featured on homepage" style={{ color: theme.brass, marginLeft: 10, fontSize: 16 }}>
                      ★
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 14, color: text.softer, marginTop: 4 }}>
                  {a.year} · <span style={{ color: availColor(a.availability) }}>{a.availability}</span>
                </div>
              </div>
              <span style={{ color: text.faint, fontSize: 13 }}>Edit →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
