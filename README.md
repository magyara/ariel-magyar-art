# Ariel Magyar Art

Portfolio site for Arlington, VA artist Ariel Magyar.

- **Frontend** — React 18 + TypeScript, built with Vite, routed with React Router
- **Backend** — TypeScript serverless functions on Node 20 (`/api`), email via Resend
- **Deployment** — Vercel

## Run locally

```bash
npm install
cp .env.example .env        # fill in your Resend key
npx vercel dev              # frontend + /api together on http://localhost:3000
```

`npm run dev:web` runs Vite alone (port 5173) if you only need the UI; it proxies
`/api` to a `vercel dev` instance on port 3000.

## Deploy

```bash
npm i -g vercel
vercel            # first run links the project
vercel --prod
```

Then in the Vercel dashboard → Settings → Environment Variables, add
`RESEND_API_KEY`, `MAIL_FROM`, `MAIL_TO` (see `.env.example`) for Production,
Preview, and Development.

Custom domain: Settings → Domains → add `arielmagyar.art`, then follow the DNS
records Vercel shows you at your registrar.

## Email setup (one-time)

1. Create a free account at [resend.com](https://resend.com).
2. Add and verify the domain `arielmagyar.art` (a few DNS records).
3. Create an API key → paste into `RESEND_API_KEY`.
4. Set `MAIL_FROM` to an address on the verified domain, `MAIL_TO` to wherever
   you want inquiries to land.

Check it works: `GET /api/health` reports `mailConfigured: true` when all three
variables are present.

## Structure

```
api/
  inquiry.ts            POST — validates and emails contact/commission forms
  health.ts             GET  — config smoke test
  _lib/schema.ts        zod schema shared by both form types
  _lib/mail.ts          subject/body rendering + Resend HTTP call
  _lib/rateLimit.ts     per-IP burst throttle
src/
  App.tsx               routes + page chrome
  theme.ts              colors, type, shared style objects
  data/artworks.ts      artwork catalog — edit here to add a piece
  types.ts              shared TypeScript types
  components/
    Header.tsx          sticky nav, collapses to a hamburger under 760px
    Footer.tsx
    FramedImage.tsx     frame that takes the image's real aspect ratio
    InquiryForm.tsx     contact + commission form, posts to /api/inquiry
    Field.tsx
  hooks/
    useImageRatio.ts    measures intrinsic image dimensions
    useReveal.ts        scroll-in fade via IntersectionObserver
    useMediaQuery.ts
  pages/                Home, Artwork, ArtworkDetail, Commissions, About, Contact, NotFound
public/images/          artwork photography and process shots
```

## Adding an artwork

Add an entry to `ARTWORKS` in `src/data/artworks.ts` and drop its photos in
`public/images/`. `featured: true` surfaces it on the home page; `display` adds
the "Currently on view" panel. The gallery, detail page, and category filters
all read from that one array.

## Still to do

- Real Instagram thumbnails (the home grid has five placeholder tiles)
- Signature GIF in the hero
- Commission photo below the commission form
- Consider serving images through Vercel's image optimization once traffic warrants
