import type { Artwork } from '../types';

const img = (name: string) => `/images/${name}`;

export const CATEGORIES = ['All', 'Landscapes', 'Florals', 'City Scenes', 'DC', 'Virginia', 'Maryland', 'Travel'] as const;

export const ARTWORKS: Artwork[] = [
  {
    id: 'market',
    title: 'Courthouse Farmer\'s Market Flowers',
    cats: ['Virginia', 'Florals'],
    place: 'Arlington, VA',
    medium: 'Oil Pastel and Acrylic on Canvas',
    size: 'X × X in',
    year: '2026',
    avail: 'Available',
    price: '',
    featured: true,
    images: [
      { img: img('market_full.jpg'), label: 'Full view' },
      { img: img('market_frame.jpg'), label: 'Framed' },
      { img: img('market_close.jpg'), label: 'Detail' },
    ],
    story:
      '',
  },
  {
    id: 'kite',
    title: 'DC Kite Festival',
    cats: ['City Scenes', 'DC'],
    place: 'National Mall, Washington, DC',
    medium: 'Oil Pastel and Acrylic on Canvas',
    size: '8 × 8 in',
    year: '2026',
    avail: 'Available',
    price: '',
    featured: false,
    images: [
      { img: img('kite_full.jpg'), label: 'Full view' },
      { img: img('kite_frame.jpg'), label: 'Framed' },
      { img: img('kite_close.jpg'), label: 'Detail' },
    ],
    story:
      '',
  },
  {
    id: 'lilies',
    title: 'Frederick Water Lilies',
    cats: ['Maryland', 'Florals'],
    place: 'Frederick, MD',
    medium: 'Oil Pastel on Paper',
    size: '8 × 8 in',
    year: '2026',
    avail: 'Available',
    price: '',
    featured: false,
    images: [
      { img: img('lilies_full.jpg'), label: 'Full view' },
      { img: img('lilies_frame.jpg'), label: 'Framed' },
      { img: img('lilies_close.jpg'), label: 'Detail' },
    ],
    story:
      '',
  },
  {
    id: 'chairs',
    title: 'Cervesas and Conversation',
    cats: ['Travel', 'City Scenes'],
    place: 'Santa Cruz, Bolivia',
    medium: 'Oil Pastel and Acrylic on Canvas',
    size: 'X × X in',
    year: '2026',
    avail: 'Available',
    price: '',
    featured: false,
    images: [
      { img: img('chairs_full.jpg'), label: 'Full view' },
      { img: img('chairs_frame.jpg'), label: 'Framed' },
      { img: img('chairs_close.jpg'), label: 'Detail' },
    ],
    story:
      '',
  },
  {
    id: 'bouquet',
    title: 'Trader Joe\'s Bouquet',
    cats: ['Virginia', 'Florals'],
    place: 'Arlington, VA',
    medium: 'Oil Pastel on Paper',
    size: '8 × 8 in',
    year: '2026',
    avail: 'Available',
    price: '',
    featured: false,
    images: [
      { img: img('bouquet_full.jpg'), label: 'Full view' },
      { img: img('bouquet_frame.jpg'), label: 'Framed' },
      { img: img('bouquet_close.jpg'), label: 'Detail' },
    ],
    story:
      '',
  },
  {
    id: 'museum',
    title: 'Lounging at the National Portrait Gallery',
    cats: ['City Scenes', 'DC'],
    place: 'National Portrait Gallery, Washington, DC',
    medium: 'Oil Pastel on Paper',
    size: '8 × 8 in',
    year: '2026',
    avail: 'Available',
    price: '—',
    featured: true,
    images: [
      { img: img('museum_full.jpg'), label: 'Full view' },
      { img: img('museum_frame.jpg'), label: 'Framed' },
      { img: img('museum_close.jpg'), label: 'Detail' },
    ],
    story:
      'The National Portrait Gallery’s Kogod Courtyard is filled with light and plants. It’s one of my favorite places to work from in DC when I need to escape the cabin fever of my apartment. I originally started this piece plein air at the museum. ',
  },
  {
    id: 'arch-rock',
    title: 'Arch Rock',
    cats: ['Landscapes', 'Travel'],
    place: 'Mackinac Island, MI',
    medium: 'Oil Pastel on Paper',
    size: '8 × 8 in',
    year: '2026',
    avail: 'Unavailable',
    price: '—',
    featured: false,
    images: [
      { img: img('arch_rock_full.jpg'), label: 'Full view' },
      { img: img('arch_rock_frame.jpg'), label: 'Framed' },
    ],
    story:
      'I grew up in metro Detroit, Michigan and one of the state’s best places to visit is Mackinac Island. It’s easy to bike around and stop at a variety of hiking trails, including this one that takes you to a beautiful view of Arch Rock, through which you can see Lake Huron and boats passing by.',
  },
  {
    id: 'wisteria',
    title: 'I Know Where the Wisteria Bloom',
    cats: ['Landscapes', 'City Scenes', 'DC'],
    place: 'Georgetown, Washington, DC',
    medium: 'Oil Pastel on Paper',
    size: '8 × 8 in',
    year: '2026',
    avail: 'On display',
    price: '-',
    featured: false,
    images: [
      { img: img('wisteria_full.jpg'), label: 'Full view' },
      { img: img('wisteria_frame.jpg'), label: 'Framed' },
      { img: img('wisteria_close.jpg'), label: 'Detail' },
    ],
    display: { venue: 'Alliance Gallery', city: 'Arlington, VA' },
    story:
      'I stumbled upon this alleyway in Georgetown after being rejected from the Dumbarton Oaks Gardens, which was sold out for the day. Determined to see some springtime wisteria, I noticed the flowers on a side street. Walking down the alleyway felt like a scene out of a movie where I tread lightly on cherry blossom petals with fragrant wisteria overhead. I sat on the street sketching the beautiful flowers for an hour until the sun started to set.',
  },
  {
    id: 'roses',
    title: 'Yellow Shrub Roses',
    cats: ['Florals', 'Travel'],
    place: 'San Francisco, CA',
    medium: 'Oil Pastel on Paper',
    size: '8 × 8 in',
    year: '2026',
    avail: 'Available',
    price: '-',
    featured: false,
    images: [
      { img: img('roses_full.jpg'), label: 'Full view' },
      { img: img('roses_frame.jpg'), label: 'Framed' },
      { img: img('roses_close.jpg'), label: 'Detail' },
    ],
    story:
      'I found these roses when taking pictures with the Golden Gate bridge on a trip to San Francisco, CA. The flowers were bright despite the cloudy weather and I just knew they deserved to be drawn.',
  },
];

export const findArtwork = (id: string | undefined) => ARTWORKS.find((a) => a.id === id);

export const SITE = {
  instagram: 'https://www.instagram.com/ari.mag.art/',
  instagramHandle: '@ari.mag.art',
  email: 'hello@arielmagyar.art',
  name: 'Ariel Magyar',
} as const;
