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
  display?: DisplayInfo;
  story: string;
}

/** Image slots in the admin form, in display order. Stored as `images.label`. */
export const IMAGE_SLOTS = ['Full view', 'Detail', 'Framed', 'Context'] as const;
export type ImageSlot = (typeof IMAGE_SLOTS)[number];
export const REQUIRED_SLOTS: readonly ImageSlot[] = ['Full view', 'Detail'];

export const AVAILABILITY: readonly Availability[] = ['Available', 'On Display', 'Unavailable'];

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
  availability: Availability;
  priceDollars: number | null;
  priceCents: number | null;
  featured: boolean;
  story: string;
  categories: string[];
  /** Existing display id, a new display to create, or none. */
  display: { id: number } | NewDisplayInput | null;
  images: AdminImageInput[];
}

export interface AdminArtwork extends AdminArtworkInput {
  id: number;
}

export interface AdminArtworkSummary {
  id: number;
  title: string;
  year: number;
  availability: Availability;
  featured: boolean;
  thumbUrl: string | null;
}

export interface AdminDisplay extends NewDisplayInput {
  id: number;
}

export interface AdminOptions {
  /** Values of the availability_status enum, so the form matches the DB exactly. */
  availability: Availability[];
  categories: string[];
  displays: AdminDisplay[];
}

export interface AdminSession {
  authenticated: boolean;
  email?: string;
  googleClientId: string | null;
}

export interface InstagramPost {
  id: string;
  imageUrl: string;
  permalink: string;
  caption?: string;
}
