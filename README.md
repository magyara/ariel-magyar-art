# Ariel Magyar Art

Portfolio site for Arlington, VA artist Ariel Magyar.

- **Frontend** — React 18 + TypeScript, built with Vite, routed with React Router
- **Backend** — TypeScript serverless functions on Node 24 (`/api`), Postgres on
  Neon
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
| `IG_ACCESS_TOKEN` | Long-lived Instagram token: homepage feed, and posting from `/admin`. Seeds the DB copy, which refreshes itself. Optional — without it the homepage hides its Instagram section. |
| `GOOGLE_CLIENT_ID`, `ADMIN_EMAILS`, `SESSION_SECRET` | Google sign-in for `/admin` and the allowed accounts |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store for photos uploaded through `/admin` |

## Checks

```bash
npm run typecheck           # type-checks both src/ and api/
npm run build               # tsc -b && vite build
```

There is no test suite. `npm run typecheck` is the gate — unused imports and
variables fail the build, so run it before pushing.

GitHub Actions runs the same two commands on every PR and on pushes to `dev`
and `main` (`.github/workflows/ci.yml`). After Vercel finishes a Preview
deploy, `smoke.yml` checks `/api/health`, `/api/artworks?featured=true`, and
`/` on the live URL. Dependabot opens monthly dependency PRs against `dev`.

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

## Adding artwork

Sign in at `/admin` with an allowed Google account (`ADMIN_EMAILS`) to add,
edit, or delete pieces. Each piece has four photo slots — **Full view** and
**Detail** (required), **Framed** and **Context** (optional). Photos are resized
in the browser to 2400px JPEG, keep their original shape, and upload to Vercel
Blob; changes show on the site within a few minutes (the public API caches for
60 seconds).

Older pieces' photos stay in `public/images/`. The admin only deletes Blob
files, never those.

### Posting to Instagram

Tick **Also create an Instagram post** on the artwork form to post the same
piece. Pick which photos go in (one = single post, several = carousel), the post
shape (4:5, 1:1, or 1.91:1), and per photo whether to pad or crop. The caption
is built from the title, medium, size, year, story, and your default hashtags,
and can be edited. Choose **Post now** or **Save as draft**; drafts, published
posts, and failures are listed under `/admin/instagram`.

Instagram gets separate 1080px copies — the site's photos are never changed.
Only the production deployment really posts: locally and on Previews "Post now"
is a dry run.

### Database changes

SQL migrations live in `db/migrations/` and are run by hand, once per Neon
branch (`development`, then `main`):

```bash
psql "$DATABASE_URL_UNPOOLED" -f db/migrations/001_instagram.sql
```

## Structure

```
api/
  artworks.ts           GET  — catalog; ?featured=true for the homepage subset
  artworks/[id].ts      GET  — one piece
  categories.ts         GET  — category names
  instagram.ts          GET  — cached Instagram feed
  health.ts             GET  — config smoke test
  admin.ts              /api/admin/* (via vercel.json rewrite): sign-in, uploads, artwork CRUD
  _lib/session.ts       Google ID-token check + signed session cookie
  _lib/adminArtworks.ts admin reads and transactional writes
  _lib/adminSchema.ts   zod validation for the artwork form
  _lib/adminInstagram.ts Instagram post records, validation, publish orchestration
  _lib/instagramPublish.ts Instagram Graph API calls (dry run outside production)
  _lib/igToken.ts       Instagram token stored in app_settings, auto-refreshed
  _lib/artwork.ts       DB rows → Artwork objects; batch + single loaders
src/
  App.tsx               routes + page chrome
  theme.ts              colors, type, shared style objects
  types.ts              shared TypeScript types — also imported by api/
  data/artworks.ts      SITE constants (handle, email, name)
  lib/api.ts            Instagram feed fetch
  lib/adminApi.ts       admin API calls + Blob upload
  lib/imagePrep.ts      in-browser resize to JPEG
  lib/igImage.ts        renders the Instagram-shaped copy (pad or crop)
  components/
    Header.tsx          sticky nav, collapses to a hamburger under 760px
    Footer.tsx
    FramedImage.tsx     frame that takes the image's real aspect ratio
    SkeletonTile.tsx    loading placeholders
  hooks/
    useArtworks.ts      fetches the catalog / a single piece
    useCategories.ts    fetches category names, prepends "All"
    useImageRatio.ts    measures intrinsic image dimensions
    useReveal.ts        scroll-in fade via IntersectionObserver
    useMediaQuery.ts
  pages/                Home, Artwork, ArtworkDetail, About, NotFound
  pages/admin/          /admin — lazy-loaded, no public header/footer
public/images/          artwork photography and process shots
db/migrations/          SQL run by hand per Neon branch
```
