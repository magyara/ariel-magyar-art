import { Link } from 'react-router-dom';
import { theme, h1, underlineLink } from '../theme';

export default function NotFound() {
  return (
    <div
      style={{
        padding: `clamp(70px,11vw,130px) ${theme.pageX}`,
        maxWidth: 900,
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <h1 style={{ ...h1, marginBottom: 24 }}>Not found</h1>
      <p style={{ fontSize: 18, lineHeight: 1.7, color: 'rgba(244,235,225,0.72)', margin: '0 0 40px' }}>
        That page doesn’t exist — but the artwork does.
      </p>
      <Link to="/artwork" style={underlineLink}>
        See all artwork
      </Link>
    </div>
  );
}
