import { useSearchParams } from 'react-router-dom';
import InquiryForm from '../components/InquiryForm';
import { SITE } from '../data/artworks';
import { theme, h1 } from '../theme';

export default function Contact() {
  const [params] = useSearchParams();
  const piece = params.get('piece') ?? undefined;

  return (
    <div
      style={{
        padding: `clamp(50px,8vw,90px) ${theme.pageX} clamp(70px,11vw,140px)`,
        maxWidth: 900,
        margin: '0 auto',
      }}
    >
      <h1 style={h1}>Contact</h1>

      {piece && (
        <p style={{ fontSize: 16, color: theme.brass, margin: '-24px 0 34px', letterSpacing: '0.04em' }}>
          Inquiry about <em>{piece}</em>
        </p>
      )}

      <InquiryForm kind="contact" artwork={piece} />

      <div
        style={{
          marginTop: 64,
          paddingTop: 30,
          borderTop: '1px solid rgba(244,235,225,0.12)',
          display: 'flex',
          gap: 44,
          flexWrap: 'wrap',
          fontSize: 15,
          color: 'rgba(244,235,225,0.74)',
        }}
      >
        <a href={`mailto:${SITE.email}`} style={{ color: 'inherit' }}>
          {SITE.email}
        </a>
        <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
          {SITE.instagramHandle}
        </a>
      </div>
    </div>
  );
}
