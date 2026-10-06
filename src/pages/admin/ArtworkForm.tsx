import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { theme, text } from '../../theme';
import { useNarrow } from '../../hooks/useMediaQuery';
import {
  createArtwork,
  createIgPost,
  deleteArtwork,
  getArtwork,
  getIgStatus,
  getOptions,
  slugify,
  updateArtwork,
  uploadImage,
} from '../../lib/adminApi';
import { resizeToJpeg } from '../../lib/imagePrep';
import { closestAspect, measureImage, renderIgImage } from '../../lib/igImage';
import { formatScheduled, localInputToIso, scheduleProblem } from '../../lib/scheduleTime';
import { IG_CAPTION_MAX, IG_HASHTAG_MAX, IG_SLIDES_MAX, IMAGE_SLOTS, REQUIRED_SLOTS } from '../../types';
import type {
  AdminArtwork,
  AdminArtworkInput,
  AdminOptions,
  AdminDisplay,
  IgSlide,
  IgStatus,
  ImageSlot,
  NewDisplayInput,
  StoredAvailability,
} from '../../types';
import InstagramComposer, {
  buildCaption,
  countHashtags,
  DEFAULT_FIT,
  initialComposerState,
  type ComposerState,
} from './InstagramComposer';
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
  noticeBox,
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
  addedOn: string;
  availability: StoredAvailability;
  priceDollars: string;
  priceCents: string;
  featured: boolean;
  story: string;
  categories: string[];
  /** Shows this piece is linked to: existing ones by id, new ones created on save. */
  displays: Array<{ id: number } | NewDisplayInput>;
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
  addedOn: todayIso(),
  availability: 'Available',
  priceDollars: '',
  priceCents: '',
  featured: false,
  story: '',
  categories: [],
  displays: [],
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
    addedOn: a.addedOn,
    availability: a.availability,
    priceDollars: a.priceDollars == null ? '' : String(a.priceDollars),
    priceCents: a.priceCents == null ? '' : String(a.priceCents),
    featured: a.featured,
    story: a.story,
    categories: a.categories,
    displays: a.displays,
  };
}

const numberOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

/** Local date as YYYY-MM-DD. */
function todayIso(): string {
  return new Date().toLocaleDateString('en-CA');
}

const emptyDisplay = (): NewDisplayInput => ({ venue: '', city: '', startDate: '', endDate: '' });

function showTiming(d: NewDisplayInput): 'Past' | 'Current' | 'Upcoming' {
  const today = todayIso();
  return d.endDate < today ? 'Past' : d.startDate > today ? 'Upcoming' : 'Current';
}

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
  const [ig, setIg] = useState<ComposerState>(initialComposerState);
  const [igStatus, setIgStatus] = useState<IgStatus | null>(null);
  const notice = (useLocation().state as { notice?: string } | null)?.notice;

  // Instagram is optional: if its status can't be loaded the artwork form still works.
  useEffect(() => {
    getIgStatus()
      .then((s) => {
        setIgStatus(s);
        setIg((c) => (c.hashtags ? c : { ...c, hashtags: s.defaultHashtags }));
      })
      .catch(() => {});
  }, []);

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

    const igCaption = ig.caption ?? buildCaption(fields, ig.hashtags);
    if (ig.enabled) {
      const available = IMAGE_SLOTS.filter((s) => (slots[s].url || slots[s].file) && !ig.excluded.includes(s));
      const problem =
        available.length === 0
          ? 'Pick at least one photo for the Instagram post.'
          : igCaption.length > IG_CAPTION_MAX
            ? `The Instagram caption is over ${IG_CAPTION_MAX} characters.`
            : countHashtags(igCaption) > IG_HASHTAG_MAX
              ? `Instagram allows at most ${IG_HASHTAG_MAX} hashtags.`
              : ig.action === 'schedule'
                ? scheduleProblem(ig.scheduledAt)
                : null;
      if (problem) {
        setError(problem);
        return;
      }
    }

    try {
      // Upload new photos first; keep the resulting URLs in state so a failed
      // save can be retried without uploading again.
      const images: AdminArtworkInput['images'] = [];
      // Original files for photos chosen this session — the Instagram copies
      // are rendered from these rather than re-downloading the upload.
      const localFiles: Partial<Record<ImageSlot, File>> = {};
      for (const slot of IMAGE_SLOTS) {
        const current = slots[slot];
        if (current.file) {
          localFiles[slot] = current.file;
          setStatus(`Uploading ${slot} photo…`);
          const jpeg = await resizeToJpeg(current.file);
          const url = await uploadImage(jpeg, `${slugify(fields.title)}-${slugify(slot)}`);
          setSlots((s) => ({ ...s, [slot]: { ...s[slot], url, file: undefined } }));
          images.push({ slot, url });
        } else if (current.url) {
          images.push({ slot, url: current.url });
        }
      }

      const payload: AdminArtworkInput = {
        title: fields.title,
        place: fields.place,
        medium: fields.medium,
        width: Number(fields.width),
        height: Number(fields.height),
        year: Number(fields.year),
        addedOn: fields.addedOn,
        availability: fields.availability,
        priceDollars: numberOrNull(fields.priceDollars),
        priceCents: numberOrNull(fields.priceCents),
        featured: fields.featured,
        story: fields.story,
        categories: fields.categories,
        displays: fields.displays,
        images,
      };

      setStatus('Saving…');
      let artworkId: number;
      if (id) {
        await updateArtwork(id, payload);
        artworkId = id;
      } else {
        artworkId = await createArtwork(payload);
      }

      if (!ig.enabled) {
        navigate('/admin', {
          state: {
            notice: id
              ? `Saved “${fields.title}”.`
              : `Added “${fields.title}”. It will show on the site within a few minutes.`,
          },
        });
        return;
      }

      // The artwork is saved at this point. If the Instagram step fails, land on
      // the edit page (not "new") so retrying can't create the piece twice.
      try {
        const chosen = images.filter((i) => !ig.excluded.includes(i.slot)).slice(0, IG_SLIDES_MAX);
        const aspect =
          ig.aspect ?? closestAspect(await measureImage(slots[chosen[0].slot].preview ?? chosen[0].url));

        const slides: IgSlide[] = [];
        for (const [n, img] of chosen.entries()) {
          setStatus(`Preparing Instagram image ${n + 1} of ${chosen.length}…`);
          const fit = ig.fits[img.slot] ?? DEFAULT_FIT;
          const copy = await renderIgImage(localFiles[img.slot] ?? img.url, {
            aspect,
            background: ig.background,
            ...fit,
          });
          const igUrl = await uploadImage(copy, `${slugify(fields.title)}-${slugify(img.slot)}`, 'instagram');
          slides.push({ sourceUrl: img.url, igUrl, ...fit });
        }

        setStatus(
          ig.action === 'publish'
            ? 'Posting to Instagram…'
            : ig.action === 'schedule'
              ? 'Scheduling Instagram post…'
              : 'Saving Instagram draft…',
        );
        const post = await createIgPost({
          artworkId,
          caption: igCaption,
          aspect,
          background: ig.background,
          slides,
          action: ig.action,
          scheduledAt: ig.action === 'schedule' ? localInputToIso(ig.scheduledAt) : null,
        });

        const outcome =
          post.status === 'failed'
            ? `Instagram rejected the post: ${post.error} You can retry it below.`
            : post.status === 'draft'
              ? 'Instagram draft created.'
              : post.status === 'scheduled' && post.scheduledAt
                ? `Instagram post scheduled for ${formatScheduled(post.scheduledAt)}.`
                : post.dryRun
                  ? 'Instagram dry run complete — nothing was posted (only the live site posts).'
                  : 'Posted to Instagram.';
        navigate('/admin/instagram', { state: { notice: `Saved “${fields.title}”. ${outcome}` } });
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'unknown error';
        setStatus(null);
        navigate(`/admin/${artworkId}`, {
          replace: true,
          state: { notice: `The artwork is saved, but the Instagram post wasn’t created: ${reason} Save again to retry.` },
        });
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
        <div style={{ display: 'flex', gap: 20 }}>
          <Field label="Year made">
            <input style={input} required type="number" min="1900" max="2100" inputMode="numeric" value={fields.year} onChange={(e) => set('year', e.target.value)} />
          </Field>
          <Field label="Date added">
            <input style={{ ...input, colorScheme: 'dark' }} required type="date" value={fields.addedOn} onChange={(e) => set('addedOn', e.target.value)} />
          </Field>
        </div>
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
          <select style={select} value={fields.availability} onChange={(e) => set('availability', e.target.value as StoredAvailability)}>
            {options.availability.map((a) => <option key={a}>{a}</option>)}
          </select>
          <span style={{ ...hint, fontSize: 12 }}>“On view” is shown automatically while one of its exhibitions is running.</span>
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

      <h2 style={sectionTitle}>Exhibitions</h2>
      <ExhibitionsEditor
        linked={fields.displays}
        existing={options.displays}
        onChange={(displays) => set('displays', displays)}
      />

      <h2 style={sectionTitle}>Instagram</h2>
      <InstagramComposer
        sources={IMAGE_SLOTS.flatMap((slot) => {
          const src = slots[slot].preview ?? slots[slot].url;
          return src ? [{ slot, src }] : [];
        })}
        details={fields}
        state={ig}
        onChange={setIg}
        status={igStatus}
        disabled={busy}
      />

      <div style={{ marginTop: 52, paddingTop: 28, borderTop: `1px solid ${theme.rule}` }}>
        {notice && <p style={noticeBox}>{notice}</p>}
        {error && <p style={errorBox}>{error}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <button type="submit" style={{ ...primaryButton, opacity: busy ? 0.6 : 1 }} disabled={busy}>
            {id ? 'Save changes' : 'Add artwork'}
            {ig.enabled && { publish: ' & post', schedule: ' & schedule', draft: ' & save draft' }[ig.action]}
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

interface ExhibitionsEditorProps {
  linked: Array<{ id: number } | NewDisplayInput>;
  existing: AdminDisplay[];
  onChange: (next: Array<{ id: number } | NewDisplayInput>) => void;
}

/**
 * Every show the piece has been in. Past shows stay linked as a record; the
 * site only says "On view" while one of them is running.
 */
function ExhibitionsEditor({ linked, existing, onChange }: ExhibitionsEditorProps) {
  const [adding, setAdding] = useState<NewDisplayInput | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const details = (d: { id: number } | NewDisplayInput): NewDisplayInput | undefined =>
    'id' in d ? existing.find((e) => e.id === d.id) : d;
  const linkedIds = new Set(linked.flatMap((d) => ('id' in d ? [d.id] : [])));
  const available = existing.filter((d) => !linkedIds.has(d.id));

  const sorted = [...linked].sort((a, b) => (details(b)?.startDate ?? '').localeCompare(details(a)?.startDate ?? ''));

  const addNew = () => {
    if (!adding) return;
    const problem =
      !adding.venue.trim() || !adding.city.trim() || !adding.startDate || !adding.endDate
        ? 'Fill in venue, city, and both dates.'
        : adding.endDate < adding.startDate
          ? 'The end date is before the start date.'
          : null;
    if (problem) {
      setAddError(problem);
      return;
    }
    onChange([...linked, { ...adding, venue: adding.venue.trim(), city: adding.city.trim() }]);
    setAdding(null);
    setAddError(null);
  };

  const timingColor = { Past: text.faint, Current: theme.brass, Upcoming: text.soft } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <p style={{ ...hint, margin: '-6px 0 0' }}>
        The site shows “On view” only while one of these is running. Past shows stay here as a record.
      </p>

      {sorted.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {sorted.map((d) => {
            const info = details(d);
            if (!info) return null;
            const timing = showTiming(info);
            return (
              <li
                key={'id' in d ? `id-${d.id}` : `new-${info.venue}-${info.startDate}`}
                style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 16px', padding: '12px 0', borderBottom: `1px solid ${theme.rule}` }}
              >
                <span style={{ fontSize: 16, flex: 1, minWidth: 200 }}>
                  {info.venue}, {info.city}
                  <span style={{ color: text.faint, fontSize: 14 }}> · {info.startDate} – {info.endDate}</span>
                </span>
                <span style={{ ...caption, color: timingColor[timing] }}>
                  {'id' in d ? timing : `New · ${timing}`}
                </span>
                <button type="button" style={smallButton} onClick={() => onChange(linked.filter((x) => x !== d))}>
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', maxWidth: 560 }}>
        <Field label="Add to an exhibition">
          <select
            style={select}
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'new') setAdding(emptyDisplay());
              else if (v) onChange([...linked, { id: Number(v) }]);
            }}
          >
            <option value="">Choose…</option>
            {available.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.venue}, {d.city} ({d.startDate} – {d.endDate})
              </option>
            ))}
            <option value="new">New exhibition…</option>
          </select>
        </Field>
      </div>

      {adding && (
        <div style={{ border: theme.border, padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px 28px' }}>
            <Field label="Venue">
              <input style={input} value={adding.venue} onChange={(e) => setAdding({ ...adding, venue: e.target.value })} />
            </Field>
            <Field label="City">
              <input style={input} value={adding.city} onChange={(e) => setAdding({ ...adding, city: e.target.value })} />
            </Field>
            <Field label="Start date">
              <input style={{ ...input, colorScheme: 'dark' }} type="date" value={adding.startDate} onChange={(e) => setAdding({ ...adding, startDate: e.target.value })} />
            </Field>
            <Field label="End date">
              <input style={{ ...input, colorScheme: 'dark' }} type="date" value={adding.endDate} onChange={(e) => setAdding({ ...adding, endDate: e.target.value })} />
            </Field>
          </div>
          {addError && <span style={{ ...hint, color: '#F0B8A8' }}>{addError}</span>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" style={{ ...smallButton, background: theme.paper, color: theme.ink }} onClick={addNew}>
              Add exhibition
            </button>
            <button type="button" style={smallButton} onClick={() => { setAdding(null); setAddError(null); }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
