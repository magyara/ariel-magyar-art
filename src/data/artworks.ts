import type { Artwork } from '../types';

const img = (name: string) => `/images/${name}`;

export const CATEGORIES = ['All', 'Landscapes', 'Florals', 'City Scenes', 'DC', 'Travel'] as const;

export const ARTWORKS: Artwork[] = [
  {
    id: 'wisteria',
    title: 'I Know Where the Wisteria Bloom',
    cats: ['Landscapes', 'City Scenes', 'DC'],
    place: 'Georgetown, DC',
    medium: 'Oil Pastel on Paper',
    size: '8 × 8 in',
    year: '2026',
    avail: 'On display',
    price: '$283',
    featured: true,
    images: [
      { img: img('wisteria_frame.jpg'), label: 'Framed' },
      { img: img('wisteria_full.jpg'), label: 'Full view' },
      { img: img('wisteria_close.jpg'), label: 'Detail' },
    ],
    display: { venue: 'Alliance Gallery', city: 'Clarendon, VA' },
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
    price: '$283',
    images: [
      { img: img('roses_frame.jpg'), label: 'Framed' },
      { img: img('roses_full.jpg'), label: 'Full view' },
      { img: img('roses_close.jpg'), label: 'Detail' },
    ],
    story:
      'I found these roses when taking pictures with the Golden Gate bridge on a trip to San Francisco, CA. The flowers were bright despite the cloudy weather and I just knew they deserved to be drawn.',
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
    featured: true,
    images: [
      { img: img('arch_rock_frame.jpg'), label: 'Framed' },
      { img: img('arch_rock_full.jpg'), label: 'Full view' },
    ],
    story:
      'I grew up in metro Detroit, Michigan and one of the state’s best places to visit is Mackinac Island. It’s easy to bike around and stop at a variety of hiking trails, including this one that takes you to a beautiful view of Arch Rock, through which you can see Lake Huron and boats passing by.',
  },
];

export const findArtwork = (id: string | undefined) => ARTWORKS.find((a) => a.id === id);

export const SITE = {
  instagram: 'https://www.instagram.com/ari.mag.art/',
  instagramHandle: '@ari.mag.art',
  email: 'hello@arielmagyar.art',
  name: 'Ariel Magyar',
} as const;
