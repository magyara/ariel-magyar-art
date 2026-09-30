import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { theme, text } from '../../theme';
import { useNarrow } from '../../hooks/useMediaQuery';
import {
  createArtwork,
  deleteArtwork,
  getArtwork,
  getOptions,
  slugify,
  updateArtwork,
  uploadImage,
} from '../../lib/adminApi';
import { resizeToJpeg } from '../../lib/imagePrep';
import { IMAGE_SLOTS, REQUIRED_SLOTS } from '../../types';
import type {
  AdminArtwork,
  AdminArtworkInput,
  AdminOptions,
  Availability,
  ImageSlot,
  NewDisplayInput,
} from '../../types';
import {
  page,
  pageTitle,
  sectionTitle,
  caption,
  hint,
  input,
  select,
  primaryButton,
  secondaryButton,
  smallButton,
  dangerButton,
  errorBox,
} from './adminStyles';

interface SlotState {
  /** Already-uploaded image (existing piece, or uploaded before a failed save). */
  url?: string;
  /** New photo chosen in this session, uploaded on save. */
  file?: File;
  preview?: string;
}

type Slots = Record<ImageSlot, SlotState>;

interface Fields {
  title: string;
  place: string;
  medium: string;
  width: string;
  height: string;
  year: string;
  availability: Availability;
  priceDollars: string;
  priceCents: string;
  featured: boolean;
  story: string;
  categories: string[];
  displayMode: 'none' | 'existing' | 'new';
  displayId: string;
  newDisplay: NewDisplayInput;
}

const emptySlots = (): Slots =>
  Object.fromEntries(IMAGE_SLOTS.map((s) => [s, {}])) as Slots;

const blankFields = (): Fields => ({
  title: '',
  place: '',
  medium: '',
  width: '',
  height: '',
  year: String(new Date().getFullYear()),
  availability: 'Available',
  priceDollars: '',
  priceCents: '',
  featured: false,
  story: '',
  categories: [],
  displayMode: 'none',
  displayId: '',
  newDisplay: { venue: '', city: '', startDate: '', endDate: '' },
});

function fieldsFrom(a: AdminArtwork): Fields {
  return {
    ...blankFields(),
    title: a.title,
    place: a.place,
    medium: a.medium,
    width: String(a.width),
    height: String(a.height),
    year: String(a.year),
    availability: a.availability,
    priceDollars: a.priceDollars == null ? '' : String(a.priceDollars),
    priceCents: a.priceCents == null ? '' : String(a.priceCents),
    featured: a.featured,
    story: a.story,
    categories: a.categories,
    displayMode: a.display ? 'existing' : 'none',
    displayId: a.display && 'id' in a.display ? String(a.display.id) : '',
  };
}

const numberOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

export default function ArtworkForm() {
  const { id: idParam } = useParams();
  const id = idParam ? Number(idParam) : null;
  const navigate = useNavigate();
  const narrow = useNarrow();

  const [options, setOptions] = useState<AdminOptions | null>(null);
  const [fields, setFields] = useState<Fields>(blankFields);
  const [slots, setSlots] = useState<Slots>(emptySlots);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    Promise.all([getOptions(), id ? getArtwork(id) : Promise.resolve(null)])
      .then(([opts, artwork]) => {
        setOptions(opts);
        if (artwork) {
          setFields(fieldsFrom(artwork));
          const next = emptySlots();
          for (const img of artwork.images) next[img.slot] = { url: img.url };
          setSlots(next);
        }
      })
      .catch((err: Error) => setLoadError(err.message));
  }, [id]);

  // Free object URLs for local previews when they're replaced or the page closes.
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  useEffect(
    () => () => Object.values(slotsRef.current).forEach((s) => s.preview && URL.revokeObjectURL(s.preview)),
    [],
  );

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => setFields((f) => ({ ...f, [key]: value }));

  const setSlot = (slot: ImageSlot, next: SlotState) =>
    setSlots((s) => {
      if (s[slot].preview) URL.revokeObjectURL(s[slot].preview!);
      return { ...s, [slot]: next };
    });

  const toggleCategory = (name: string) =>
    set(
      'categories',
      fields.categories.includes(name) ? fields.categories.filter((c) => c !== name) : [...fields.categories, name],
    );

  const addCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    const existing = options?.categories.find((c) => c.toLowerCase() === name.toLowerCase());
    const finalName = existing ?? name;
    if (!fields.categories.includes(finalName)) set('categories', [...fields.categories, finalName]);
    setNewCategory('');
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const missing = REQUIRED_SLOTS.filter((s) => !slots[s].url && !slots[s].file);
    if (missing.length) {
      setError(`Add a ${missing.join(' and ')} photo before saving.`);
      return;
    }

    try {
      // Upload new photos first; keep the resulting URLs in state so a failed
      // save can be retried without uploading again.
      const images: AdminArtworkInput['images'] = [];
      for (const slot of IMAGE_SLOTS) {
        const current = slots[slot];
        if (current.file) {
          setStatus(`Uploading ${slot} photo…`);
          const jpeg = await resizeToJpeg(current.file);
          const url = await uploadImage(jpeg, `${slugify(fields.title)}-${slugify(slot)}`);
          setSlots((s) => ({ ...s, [slot]: { ...s[slot], url, file: undefined } }));
          images.push({ slot, url });
        } else if (current.url) {
          images.push({ slot, url: current.url });
        }
      }

      const display: AdminArtworkInput['display'] =
        fields.displayMode === 'existing' && fields.displayId
          ? { id: Number(fields.displayId) }
          : fields.displayMode === 'new'
            ? fields.newDisplay
            : null;

      const payload: AdminArtworkInput = {
        title: fields.title,
        place: fields.place,
        medium: fields.medium,
        width: Number(fields.width),
        height: Number(fields.height),
        year: Number(fields.year),
        availability: fields.availability,
        priceDollars: numberOrNull(fields.priceDollars),
        priceCents: numberOrNull(fields.priceCents),
        featured: fields.featured,
        story: fields.story,
        categories: fields.categories,
        display,
        images,
      };

      setStatus('Saving…');
      if (id) {
        await updateArtwork(id, payload);
        navigate('/admin', { state: { notice: `Saved “${fields.title}”.` } });
      } else {
        await createArtwork(payload);
        navigate('/admin', { state: { notice: `Added “${fields.title}”. It will show on the site within a few minutes.` } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setStatus(null);
    }
  }

  async function onDelete() {
    if (!id) return;
    setError(null);
    setStatus('Deleting…');
    try {
      await deleteArtwork(id);
      navigate('/admin', { state: { notice: `Deleted “${fields.title}”.` } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setStatus(null);
    }
  }

  if (loadError) return <div style={page}><p style={errorBox}>{loadError}</p></div>;
  if (!options) return <div style={{ ...page, ...hint }}>Loading…</div>;

  const busy = status !== null;
  const grid: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: narrow ? '1fr' : 'repeat(2, minmax(0, 1fr))',
    gap: '26px 40px',
  };

  return (
    <form style={page} onSubmit={onSubmit}>
      <Link to="/admin" style={{ ...caption, display: 'inline-block', marginBottom: 20 }}>← All artwork</Link>
      <h1 style={pageTitle}>{id ? `Edit “${fields.title || 'Untitled'}”` : 'Add artwork'}</h1>

      <h2 style={sectionTitle}>Photos</h2>
      <p style={{ ...hint, margin: '-6px 0 22px' }}>
        Photos keep their original shape on the site — nothing is cropped. They’re resized to 2400px and saved as JPEG
        when you save.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: narrow ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
          gap: 20,
        }}
      >
        {IMAGE_SLOTS.map((slot) => (
          <ImageSlotInput
            key={slot}
            slot={slot}
            required={REQUIRED_SLOTS.includes(slot)}
            state={slots[slot]}
            disabled={busy}
            onChoose={(file) => setSlot(slot, { file, preview: URL.createObjectURL(file) })}
            onRemove={() => setSlot(slot, {})}
          />
        ))}
      </div>

      <h2 style={sectionTitle}>Details</h2>
      <div style={grid}>
        <Field label="Title" full>
          <input style={input} required value={fields.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Medium">
          <input style={input} required placeholder="Oil on canvas" value={fields.medium} onChange={(e) => set('medium', e.target.value)} />
        </Field>
        <Field label="Place">
          <input style={input} placeholder="Where it was painted" value={fields.place} onChange={(e) => set('place', e.target.value)} />
        </Field>
        <div style={{ display: 'flex', gap: 20 }}>
          <Field label="Width (in)">
            <input style={input} required type="number" min="0" step="any" inputMode="decimal" value={fields.width} onChange={(e) => set('width', e.target.value)} />
          </Field>
          <Field label="Height (in)">
            <input style={input} required type="number" min="0" step="any" inputMode="decimal" value={fields.height} onChange={(e) => set('height', e.target.value)} />
          </Field>
        </div>
        <Field label="Year">
          <input style={input} required type="number" min="1900" max="2100" inputMode="numeric" value={fields.year} onChange={(e) => set('year', e.target.value)} />
        </Field>
        <Field label="Story" full>
          <textarea
            style={{ ...input, resize: 'vertical', lineHeight: 1.6 }}
            rows={5}
            value={fields.story}
            onChange={(e) => set('story', e.target.value)}
          />
        </Field>
      </div>

      <h2 style={sectionTitle}>Categories</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        {[...new Set([...options.categories, ...fields.categories])].map((name) => {
          const on = fields.categories.includes(name);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => toggleCategory(name)}
              style={{
                ...smallButton,
                background: on ? theme.paper : 'transparent',
                color: on ? theme.ink : theme.paper,
              }}
            >
              {name}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', maxWidth: 420 }}>
        <Field label="New category">
          <input
            style={input}
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCategory();
              }
            }}
          />
        </Field>
        <button type="button" style={smallButton} onClick={addCategory}>Add</button>
      </div>

      <h2 style={sectionTitle}>Availability</h2>
      <div style={grid}>
        <Field label="Status">
          <select style={select} value={fields.availability} onChange={(e) => set('availability', e.target.value as Availability)}>
            {options.availability.map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, cursor: 'pointer', alignSelf: 'end', paddingBottom: 10 }}>
          <input type="checkbox" checked={fields.featured} onChange={(e) => set('featured', e.target.checked)} style={{ width: 18, height: 18 }} />
          Feature on the homepage
        </label>
        <div style={{ display: 'flex', gap: 20 }}>
          <Field label="Price ($)">
            <input style={input} type="number" min="0" step="1" inputMode="numeric" value={fields.priceDollars} onChange={(e) => set('priceDollars', e.target.value)} />
          </Field>
          <Field label="Cents">
            <input style={input} type="number" min="0" max="99" step="1" inputMode="numeric" value={fields.priceCents} onChange={(e) => set('priceCents', e.target.value)} />
          </Field>
        </div>
        <p style={{ ...hint, alignSelf: 'end' }}>Prices are saved but currently hidden on the site.</p>
      </div>

      <h2 style={sectionTitle}>Exhibition</h2>
      <div style={grid}>
        <Field label="Shown at">
          <select
            style={select}
            value={fields.displayMode === 'existing' ? fields.displayId : fields.displayMode}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'none' || v === 'new') setFields((f) => ({ ...f, displayMode: v, displayId: '' }));
              else setFields((f) => ({ ...f, displayMode: 'existing', displayId: v }));
            }}
          >
            <option value="none">Not on display</option>
            {options.displays.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.venue}, {d.city} ({d.startDate} – {d.endDate})
              </option>
            ))}
            <option value="new">New exhibition…</option>
          </select>
        </Field>
        <div />
        {fields.displayMode === 'new' && (
          <>
            <Field label="Venue">
              <input style={input} required value={fields.newDisplay.venue} onChange={(e) => set('newDisplay', { ...fields.newDisplay, venue: e.target.value })} />
            </Field>
            <Field label="City">
              <input style={input} required value={fields.newDisplay.city} onChange={(e) => set('newDisplay', { ...fields.newDisplay, city: e.target.value })} />
            </Field>
            <Field label="Start date">
              <input style={{ ...input, colorScheme: 'dark' }} required type="date" value={fields.newDisplay.startDate} onChange={(e) => set('newDisplay', { ...fields.newDisplay, startDate: e.target.value })} />
            </Field>
            <Field label="End date">
              <input style={{ ...input, colorScheme: 'dark' }} required type="date" value={fields.newDisplay.endDate} onChange={(e) => set('newDisplay', { ...fields.newDisplay, endDate: e.target.value })} />
            </Field>
          </>
        )}
      </div>

      <div style={{ marginTop: 52, paddingTop: 28, borderTop: `1px solid ${theme.rule}` }}>
        {error && <p style={errorBox}>{error}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <button type="submit" style={{ ...primaryButton, opacity: busy ? 0.6 : 1 }} disabled={busy}>
            {id ? 'Save changes' : 'Add artwork'}
          </button>
          <Link to="/admin" style={secondaryButton}>Cancel</Link>
          {status && <span style={{ color: text.soft, fontSize: 15 }}>{status}</span>}

          {id && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
              {confirmDelete ? (
                <>
                  <span style={{ fontSize: 15, color: text.soft }}>Delete permanently?</span>
                  <button type="button" style={dangerButton} disabled={busy} onClick={onDelete}>Yes, delete</button>
                  <button type="button" style={smallButton} onClick={() => setConfirmDelete(false)}>Keep</button>
                </>
              ) : (
                <button type="button" style={dangerButton} disabled={busy} onClick={() => setConfirmDelete(true)}>
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </form>
  );
}

function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1, gridColumn: full ? '1 / -1' : undefined }}>
      <span style={caption}>{label}</span>
      {children}
    </label>
  );
}

interface ImageSlotProps {
  slot: ImageSlot;
  required: boolean;
  state: SlotState;
  disabled: boolean;
  onChoose: (file: File) => void;
  onRemove: () => void;
}

function ImageSlotInput({ slot, required, state, disabled, onChoose, onRemove }: ImageSlotProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const src = state.preview ?? state.url;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={caption}>
        {slot} <span style={{ color: required ? theme.brass : text.faint, letterSpacing: '0.1em' }}>{required ? '· required' : '· optional'}</span>
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file?.type.startsWith('image/')) onChoose(file);
        }}
        aria-label={src ? `Replace ${slot} photo` : `Add ${slot} photo`}
        style={{
          aspectRatio: '4 / 5',
          width: '100%',
          padding: 0,
          cursor: 'pointer',
          background: src ? `center / contain no-repeat url("${src}"), ${theme.inkPanel}` : theme.inkPanel,
          border: dragging ? `1px solid ${theme.brass}` : src ? theme.border : '1px dashed rgba(244,235,225,0.4)',
          color: text.faint,
          fontFamily: theme.sans,
          fontSize: 14,
        }}
      >
        {!src && 'Drop a photo or click'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChoose(file);
          e.target.value = '';
        }}
      />
      {src && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={smallButton} disabled={disabled} onClick={() => fileRef.current?.click()}>Replace</button>
          <button type="button" style={smallButton} disabled={disabled} onClick={onRemove}>Remove</button>
        </div>
      )}
      {state.file && <span style={{ ...hint, fontSize: 12 }}>New — uploads on save</span>}
    </div>
  );
}
