import InquiryForm from '../components/InquiryForm';
import { theme, text, h1, placeholderTile, placeholderLabel } from '../theme';

export default function Commissions() {
  return (
    <div
      style={{
        padding: `clamp(50px,8vw,90px) ${theme.pageX} clamp(70px,11vw,130px)`,
        maxWidth: 1180,
        margin: '0 auto',
      }}
    >
      <h1 style={h1}>Commissions</h1>

      <p style={{ fontSize: 19, lineHeight: 1.8, color: text.soft, margin: '0 0 60px', maxWidth: '60ch', textWrap: 'pretty' }}>
        I’m accepting a limited number of commissions on a rolling basis. Whether it’s meaningful florals, a specific
        moment, or a feeling you’d like to capture, let’s talk! At the moment, I’m primarily focusing on work in oil
        pastels.
      </p>

      <div style={{ background: theme.inkPanel, padding: 'clamp(30px,6vw,60px) clamp(22px,5vw,54px)' }}>
        <InquiryForm kind="commission" messageLabel="Inspiration & details" />
      </div>

      <div style={{ ...placeholderTile, aspectRatio: '16 / 7', padding: 22, margin: '60px 0 0' }}>
        <span style={{ ...placeholderLabel, fontSize: 12, letterSpacing: '0.1em' }}>
          COMMISSION PHOTO — a finished piece with its reference, or Ariel at work
        </span>
      </div>
    </div>
  );
}
