export type Availability = 'Available' | 'On Display' | 'Unavailable';

export interface ArtworkImage {
  img: string;
  label: string;
  /** CSS background-position for cropped thumbnails. */
  pos?: string;
}

export interface DisplayInfo {
  venue: string;
  city: string;
  dates?: string;
}

export interface ExhibitionRecord extends DisplayInfo {
  timing: 'past' | 'current' | 'upcoming';
}

export interface Artwork {
  id: string;
  title: string;
  cats: string[];
  place: string;
  medium: string;
  size: string;
  year: string;
  avail: Availability;
  price: string;
  featured?: boolean;
  images: ArtworkImage[];
  /** The show running today, if any — drives "On view". */
  display?: DisplayInfo;
  /** Every show the piece has been in, newest first. Only on single-artwork responses. */
  exhibitions?: ExhibitionRecord[];
  story: string;
}

/** Image slots in the admin form, in display order. Stored as `images.label`. */
export const IMAGE_SLOTS = ['Full view', 'Detail', 'Framed', 'Context'] as const;
export type ImageSlot = (typeof IMAGE_SLOTS)[number];
export const REQUIRED_SLOTS: readonly ImageSlot[] = ['Full view', 'Detail'];

/**
 * What the admin can set. "On Display" isn't stored any more — the site shows it
 * automatically while one of the piece's shows is running.
 */
export type StoredAvailability = Exclude<Availability, 'On Display'>;
export const AVAILABILITY: readonly StoredAvailability[] = ['Available', 'Unavailable'];

export interface AdminImageInput {
  slot: ImageSlot;
  url: string;
}

export interface NewDisplayInput {
  venue: string;
  city: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
}

/** Raw, unformatted artwork as edited in /admin — numbers stay numbers. */
export interface AdminArtworkInput {
  title: string;
  place: string;
  medium: string;
  width: number;
  height: number;
  year: number;
  /** YYYY-MM-DD; the public artwork page lists newest first. */
  addedOn: string;
  availability: StoredAvailability;
  priceDollars: number | null;
  priceCents: number | null;
  featured: boolean;
  story: string;
  categories: string[];
  /** Every show the piece has been in: existing ones by id, or new ones to create. */
  displays: Array<{ id: number } | NewDisplayInput>;
  images: AdminImageInput[];
}

export interface AdminArtwork extends AdminArtworkInput {
  id: number;
}

export interface AdminArtworkSummary {
  id: number;
  title: string;
  year: number;
  addedOn: string;
  availability: StoredAvailability;
  featured: boolean;
  thumbUrl: string | null;
}

export interface AdminDisplay extends NewDisplayInput {
  id: number;
}

export interface AdminOptions {
  /** Settable values of the availability_status enum (everything except "On Display"). */
  availability: StoredAvailability[];
  categories: string[];
  displays: AdminDisplay[];
}

export interface AdminSession {
  authenticated: boolean;
  email?: string;
  googleClientId: string | null;
}

export const IG_ASPECTS = ['4:5', '1:1', '1.91:1'] as const;
export type IgAspect = (typeof IG_ASPECTS)[number];

/** width / height for each Instagram post shape. */
export const IG_ASPECT_RATIO: Record<IgAspect, number> = { '4:5': 4 / 5, '1:1': 1, '1.91:1': 1.91 };

export const IG_CAPTION_MAX = 2200;
export const IG_HASHTAG_MAX = 30;
export const IG_SLIDES_MAX = 10;

export type IgFit = 'pad' | 'crop';

export interface IgSlide {
  /** The site image this slide was made from. */
  sourceUrl: string;
  /** The Instagram-shaped copy that actually gets posted. */
  igUrl: string;
  fit: IgFit;
  /** Crop position along each axis, 0–1 (0.5 = centered). Ignored when padding. */
  offsetX: number;
  offsetY: number;
}

export type IgPostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

export interface IgPostInput {
  artworkId: number | null;
  caption: string;
  aspect: IgAspect;
  background: string;
  slides: IgSlide[];
  /** Save for later, publish right away, or publish at `scheduledAt`. */
  action: 'draft' | 'publish' | 'schedule';
  /** ISO timestamp; required when action is 'schedule'. */
  scheduledAt?: string | null;
}

/** Changes to an existing post (PATCH /api/admin/ig-posts/:id). */
export interface IgPostChange {
  caption?: string;
  /** publish now; schedule (or reschedule) at scheduledAt; unschedule back to draft. */
  action?: 'publish' | 'schedule' | 'unschedule';
  scheduledAt?: string;
}

export interface IgPost {
  id: number;
  artworkId: number | null;
  artworkTitle: string | null;
  caption: string;
  aspect: IgAspect;
  background: string;
  slides: IgSlide[];
  status: IgPostStatus;
  scheduledAt: string | null;
  permalink: string | null;
  error: string | null;
  /** True when "published" only as a dry run outside production. */
  dryRun: boolean;
  createdAt: string;
  publishedAt: string | null;
}

export interface IgStatus {
  /** A token is available (DB or IG_ACCESS_TOKEN). */
  configured: boolean;
  username: string | null;
  /** Only the production deployment really posts; everywhere else is a dry run. */
  live: boolean;
  defaultHashtags: string;
  error: string | null;
}

export interface InstagramPost {
  id: string;
  imageUrl: string;
  permalink: string;
  caption?: string;
}
