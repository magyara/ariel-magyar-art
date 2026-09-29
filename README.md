# Ariel Magyar Art

Portfolio site for Arlington, VA artist Ariel Magyar.

- **Frontend** — React 18 + TypeScript, built with Vite, routed with React Router
- **Backend** — TypeScript serverless functions on Node 20 (`/api`), Postgres on
  Neon, email via Resend
- **Deployment** — Vercel

## Run locally

```bash
npm install
cp .env.example .env        # then fill it in — see the table below
npx vercel dev              # frontend + /api together on http://localhost:3000
```

`npm run dev` runs Vite alone (port 5173) if you only need the UI; it proxies
`/api` to a `vercel dev` instance on port 3000. The API routes need a database,
so `vercel dev` is the way to exercise anything under `/api`.

`.env.example` documents every variable; in short:

| Variable | Used for |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection — the artwork catalog. Required; API routes fail to start without it. |
| `DATABASE_URL_UNPOOLED` | Direct connection, for migrations and schema work |
| `NEON_BRANCH` | Which Neon branch your `.env` points at. Not read by the app. |
| `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_TO` | Contact / commission email |
| `IG_ACCESS_TOKEN` | Long-lived Instagram token for the homepage feed. Optional — without it the homepage hides its Instagram section. |

## Checks

```bash
npm run typecheck           # type-checks both src/ and api/
npm run build               # tsc -b && vite build
```

There is no test suite. `npm run typecheck` is the gate — unused imports and
variables fail the build, so run it before pushing.

## Deploy

```bash
npm i -g vercel
vercel            # first run links the project
vercel --prod
```

Then in the Vercel dashboard → Settings → Environment Variables, add the
variables from `.env.example` for Production, Preview, and Development.

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

## Adding artwork

Artwork lives in the Neon database, not in the codebase. To add a piece: upload
the photography to `public/images/` (use a new filename — images are cached for
a year, so overwriting one will not take effect), then insert the row into
`artworks` plus its `images`, `artwork_categories`, and optional `displays`
rows.

## Structure

```
api/
  artworks.ts           GET  — catalog; ?featured=true for the homepage subset
  artworks/[id].ts      GET  — one piece
  categories.ts         GET  — category names
  instagram.ts          GET  — cached Instagram feed
  inquiry.ts            POST — validates and emails contact/commission forms
  health.ts             GET  — config smoke test
  _lib/artwork.ts       DB rows → Artwork objects; batch + single loaders
  _lib/schema.ts        zod schema shared by both form types
  _lib/mail.ts          subject/body rendering + Resend HTTP call
  _lib/rateLimit.ts     per-IP burst throttle
src/
  App.tsx               routes + page chrome
  theme.ts              colors, type, shared style objects
  types.ts              shared TypeScript types — also imported by api/
  data/artworks.ts      SITE constants (handle, email, name)
  lib/api.ts            inquiry + Instagram fetches
  components/
    Header.tsx          sticky nav, collapses to a hamburger under 760px
    Footer.tsx
    FramedImage.tsx     frame that takes the image's real aspect ratio
    InquiryForm.tsx     contact + commission form, posts to /api/inquiry
    SkeletonTile.tsx    loading placeholders
    Field.tsx
  hooks/
    useArtworks.ts      fetches the catalog / a single piece
    useCategories.ts    fetches category names, prepends "All"
    useImageRatio.ts    measures intrinsic image dimensions
    useReveal.ts        scroll-in fade via IntersectionObserver
    useMediaQuery.ts
  pages/                Home, Artwork, ArtworkDetail, Commissions, About, Contact, NotFound
public/images/          artwork photography and process shots
```

Commissions and Contact are built but currently unrouted in `App.tsx` while
inquiries are paused.
