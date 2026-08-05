export type Availability = 'Available' | 'On display' | 'Unavailable' | 'Sold';

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
  note?: string;
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

export interface InstagramPost {
  id: string;
  imageUrl: string;
  permalink: string;
  caption?: string;
}

export interface InquiryPayload {
  kind: 'contact' | 'commission';
  name: string;
  email: string;
  message: string;
  projectType?: string;
  timeline?: string;
  artwork?: string;
}
