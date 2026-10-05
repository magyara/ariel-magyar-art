import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { theme, text } from '../../theme';
import { saveDefaultHashtags } from '../../lib/adminApi';
import { closestAspect, matchesAspect, measureImage } from '../../lib/igImage';
import { IG_ASPECTS, IG_ASPECT_RATIO, IG_CAPTION_MAX, IG_HASHTAG_MAX, IG_SLIDES_MAX } from '../../types';
import type { IgAspect, IgFit, IgStatus, ImageSlot } from '../../types';
import { caption as captionStyle, hint, input, smallButton, errorBox, noticeBox } from './adminStyles';

export interface SlideFit {
  fit: IgFit;
  offsetX: number;
  offsetY: number;
}

export const DEFAULT_FIT: SlideFit = { fit: 'pad', offsetX: 0.5, offsetY: 0.5 };

export interface ComposerState {
  enabled: boolean;
  /** Photos left out of the post; everything else goes in, in slot order. */
  excluded: ImageSlot[];
  /** null = pick the shape closest to the first photo. */
  aspect: IgAspect | null;
  background: string;
  fits: Partial<Record<ImageSlot, SlideFit>>;
  /** null = follow the template built from the artwork details. */
  caption: string | null;
  hashtags: string;
  action: 'publish' | 'draft';
}

export const initialComposerState = (): ComposerState => ({
  enabled: false,
  excluded: [],
  aspect: null,
  background: '#ffffff',
  fits: {},
  caption: null,
  hashtags: '',
  action: 'publish',
});

export interface CaptionDetails {
  title: string;
  medium: string;
  width: string;
  height: string;
  story: string;
}

export function buildCaption(d: CaptionDetails, hashtags: string): string {
  const size = d.width && d.height ? `${d.width} × ${d.height} in` : '';
  const title = d.title.trim() ? `“${d.title.trim()}”` : '';
  const facts = [d.medium, size].filter(Boolean).join(' · ');
  return [title, facts, d.story.trim(), hashtags.trim()].filter(Boolean).join('\n\n');
}

export const countHashtags = (value: string) => (value.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;

export interface ComposerSource {
  slot: ImageSlot;
  src: string;
}

interface Props {
  sources: ComposerSource[];
  details: CaptionDetails;
  state: ComposerState;
  onChange: (next: ComposerState) => void;
  status: IgStatus | null;
  disabled: boolean;
}

export default function InstagramComposer({ sources, details, state, onChange, status, disabled }: Props) {
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [hashtagNote, setHashtagNote] = useState<string | null>(null);

  // Measure each photo once so we know which ones need fitting.
  const measuring = useRef(new Set<string>());
  useEffect(() => {
    for (const { src } of sources) {
      if (measuring.current.has(src)) continue;
      measuring.current.add(src);
      measureImage(src)
        .then((ratio) => setRatios((r) => ({ ...r, [src]: ratio })))
        .catch(() => {});
    }
  }, [sources]);

  const set = (patch: Partial<ComposerState>) => onChange({ ...state, ...patch });

  const selected = sources.filter((s) => !state.excluded.includes(s.slot)).slice(0, IG_SLIDES_MAX);
  const firstRatio = selected[0] ? ratios[selected[0].src] : undefined;
  const aspect = state.aspect ?? (firstRatio ? closestAspect(firstRatio) : '4:5');
  const captionValue = state.caption ?? buildCaption(details, state.hashtags);
  const hashtagCount = countHashtags(captionValue);

  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={state.enabled}
          disabled={disabled}
          onChange={(e) => set({ enabled: e.target.checked })}
          style={{ width: 18, height: 18 }}
        />
        Also create an Instagram post
      </label>

      {state.enabled && (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <StatusNote status={status} />

          {sources.length === 0 ? (
            <p style={hint}>Add photos above first.</p>
          ) : (
            <>
              <div>
                <span style={captionStyle}>Post shape</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12, alignItems: 'center' }}>
                  {IG_ASPECTS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      aria-pressed={aspect === a}
                      onClick={() => set({ aspect: a })}
                      style={{
                        ...smallButton,
                        background: aspect === a ? theme.paper : 'transparent',
                        color: aspect === a ? theme.ink : theme.paper,
                      }}
                    >
                      {a === '4:5' ? 'Portrait 4:5' : a === '1:1' ? 'Square 1:1' : 'Landscape 1.91:1'}
                    </button>
                  ))}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12, ...hint }}>
                    Padding color
                    <input
                      type="color"
                      value={state.background}
                      onChange={(e) => set({ background: e.target.value })}
                      style={{ width: 36, height: 28, padding: 0, border: theme.border, background: 'none' }}
                    />
                  </label>
                </div>
                <p style={{ ...hint, marginTop: 10 }}>
                  {selected.length > 1
                    ? 'Instagram shows every slide of a carousel at one shape, so all photos are fitted to this.'
                    : 'Photos that already match this shape are posted untouched.'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
                {sources.map((source) => {
                  const included = !state.excluded.includes(source.slot);
                  const fit = state.fits[source.slot] ?? DEFAULT_FIT;
                  const ratio = ratios[source.src];
                  const matches = ratio !== undefined && matchesAspect(ratio, aspect);
                  const setFit = (next: SlideFit) => set({ fits: { ...state.fits, [source.slot]: next } });

                  return (
                    <div key={source.slot} style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: included ? 1 : 0.45 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', ...captionStyle }}>
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={(e) =>
                            set({
                              excluded: e.target.checked
                                ? state.excluded.filter((s) => s !== source.slot)
                                : [...state.excluded, source.slot],
                            })
                          }
                        />
                        {source.slot}
                      </label>
                      <SlidePreview
                        src={source.src}
                        imageRatio={ratio}
                        aspect={aspect}
                        background={state.background}
                        fit={matches ? { ...fit, fit: 'pad' } : fit}
                        onMove={(offsetX, offsetY) => setFit({ ...fit, offsetX, offsetY })}
                      />
                      {included && !matches && ratio !== undefined && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {(['pad', 'crop'] as const).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              aria-pressed={fit.fit === mode}
                              onClick={() => setFit({ ...fit, fit: mode })}
                              style={{
                                ...smallButton,
                                padding: '6px 12px',
                                background: fit.fit === mode ? theme.paper : 'transparent',
                                color: fit.fit === mode ? theme.ink : theme.paper,
                              }}
                            >
                              {mode === 'pad' ? 'Pad' : 'Crop'}
                            </button>
                          ))}
                          {fit.fit === 'crop' && <span style={{ ...hint, fontSize: 12 }}>Drag to position</span>}
                        </div>
                      )}
                      {included && matches && <span style={{ ...hint, fontSize: 12 }}>Fits as-is</span>}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={captionStyle}>Hashtags</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <input
                    style={input}
                    placeholder="#oilpainting #arlingtonva"
                    value={state.hashtags}
                    disabled={state.caption !== null}
                    onChange={(e) => {
                      setHashtagNote(null);
                      set({ hashtags: e.target.value });
                    }}
                  />
                  <button
                    type="button"
                    style={{ ...smallButton, whiteSpace: 'nowrap' }}
                    onClick={() =>
                      saveDefaultHashtags(state.hashtags)
                        .then(() => setHashtagNote('Saved as your default.'))
                        .catch((err: Error) => setHashtagNote(err.message))
                    }
                  >
                    Save as default
                  </button>
                </div>
                {hashtagNote && <span style={{ ...hint, fontSize: 12 }}>{hashtagNote}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <span style={captionStyle}>Caption</span>
                  {state.caption !== null && (
                    <button type="button" style={{ ...smallButton, padding: '5px 10px' }} onClick={() => set({ caption: null })}>
                      Reset to template
                    </button>
                  )}
                </div>
                <textarea
                  style={{ ...input, resize: 'vertical', lineHeight: 1.6, border: theme.border, padding: 14 }}
                  rows={9}
                  value={captionValue}
                  onChange={(e) => set({ caption: e.target.value })}
                />
                <span
                  style={{
                    ...hint,
                    fontSize: 12,
                    color: captionValue.length > IG_CAPTION_MAX || hashtagCount > IG_HASHTAG_MAX ? '#F0B8A8' : text.faint,
                  }}
                >
                  {captionValue.length} / {IG_CAPTION_MAX} characters · {hashtagCount} / {IG_HASHTAG_MAX} hashtags
                  {state.caption === null && ' · follows the details above until you edit it'}
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 28px' }}>
                {(
                  [
                    ['publish', 'Post now'],
                    ['draft', 'Save as draft'],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, cursor: 'pointer' }}>
                    <input type="radio" name="ig-action" checked={state.action === value} onChange={() => set({ action: value })} />
                    {label}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatusNote({ status }: { status: IgStatus | null }) {
  if (!status) return null;
  if (!status.configured) {
    return <p style={{ ...errorBox, margin: 0 }}>Instagram isn’t connected yet (no access token). You can still save drafts.</p>;
  }
  if (status.error) {
    return <p style={{ ...errorBox, margin: 0 }}>Instagram connection problem: {status.error}</p>;
  }
  return (
    <p style={{ ...noticeBox, margin: 0 }}>
      {status.username ? `Connected as @${status.username}. ` : ''}
      {status.live
        ? '“Post now” publishes to Instagram immediately.'
        : 'Test mode: only the live site posts for real. Here, “Post now” does a dry run and nothing goes to Instagram.'}
    </p>
  );
}

interface SlidePreviewProps {
  src: string;
  imageRatio: number | undefined;
  aspect: IgAspect;
  background: string;
  fit: SlideFit;
  onMove: (offsetX: number, offsetY: number) => void;
}

/** CSS mirror of renderIgImage: same contain/cover maths, so what you see is what's posted. */
function SlidePreview({ src, imageRatio, aspect, background, fit, onMove }: SlidePreviewProps) {
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const cropping = fit.fit === 'crop' && imageRatio !== undefined;
  const boxRatio = IG_ASPECT_RATIO[aspect];

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!cropping) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: fit.offsetX, oy: fit.offsetY };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !cropping) return;
    const box = e.currentTarget.getBoundingClientRect();
    // How far the photo overflows the frame along the axis it's cropped on.
    const overflowX = Math.max(0, box.height * imageRatio - box.width);
    const overflowY = Math.max(0, box.width / imageRatio - box.height);
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    onMove(
      overflowX > 1 ? clamp(drag.current.ox - (e.clientX - drag.current.x) / overflowX) : fit.offsetX,
      overflowY > 1 ? clamp(drag.current.oy - (e.clientY - drag.current.y) / overflowY) : fit.offsetY,
    );
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      style={{
        aspectRatio: String(boxRatio),
        width: '100%',
        backgroundColor: background,
        backgroundImage: `url("${src}")`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: cropping ? 'cover' : 'contain',
        backgroundPosition: cropping ? `${fit.offsetX * 100}% ${fit.offsetY * 100}%` : 'center',
        border: theme.border,
        cursor: cropping ? 'grab' : 'default',
        touchAction: cropping ? 'none' : 'auto',
      }}
    />
  );
}
