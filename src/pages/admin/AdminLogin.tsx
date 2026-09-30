import { useEffect, useRef, useState } from 'react';
import { login } from '../../lib/adminApi';
import { page, pageTitle, hint, errorBox } from './adminStyles';

interface GoogleIdentity {
  accounts: {
    id: {
      initialize(options: { client_id: string; callback: (r: { credential: string }) => void }): void;
      renderButton(el: HTMLElement, options: Record<string, unknown>): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';

function loadGoogleScript(): Promise<GoogleIdentity> {
  if (window.google) return Promise.resolve(window.google);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => (window.google ? resolve(window.google) : reject(new Error('Google sign-in failed to load')));
    script.onerror = () => reject(new Error('Google sign-in failed to load'));
    document.head.appendChild(script);
  });
}

interface Props {
  clientId: string | null;
  onSignedIn: () => void;
}

export default function AdminLogin({ clientId, onSignedIn }: Props) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    loadGoogleScript()
      .then((google) => {
        if (cancelled || !buttonRef.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            setError(null);
            try {
              await login(credential);
              onSignedIn();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Sign-in failed');
            }
          },
        });
        google.accounts.id.renderButton(buttonRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'rectangular',
          text: 'signin_with',
        });
      })
      .catch((err: Error) => setError(err.message));

    return () => {
      cancelled = true;
    };
  }, [clientId, onSignedIn]);

  return (
    <div style={{ ...page, maxWidth: 520, paddingTop: 'clamp(70px,11vw,130px)' }}>
      <h1 style={pageTitle}>Studio admin</h1>
      {error && <p style={errorBox}>{error}</p>}
      {clientId ? (
        <div ref={buttonRef} style={{ minHeight: 44 }} />
      ) : (
        <p style={errorBox}>Sign-in isn’t configured: GOOGLE_CLIENT_ID is missing from the environment.</p>
      )}
      <p style={{ ...hint, marginTop: 28 }}>Only approved Google accounts can sign in.</p>
    </div>
  );
}
