# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Portfolio site for Arlington, VA artist Ariel Magyar. React 18 + TypeScript SPA built with Vite, served with TypeScript serverless functions under `/api` on Vercel (Node 24). Artwork data lives in a Lakebase/Neon Postgres database; contact email goes through Resend.

## Commands

```bash
npm install
npx vercel dev            # frontend + /api together on http://localhost:3000 — the only way to exercise API routes
npm run dev               # Vite alone on :5173, proxies /api to a vercel dev on :3000
npm run build             # tsc -b && vite build
npm run typecheck         # checks BOTH tsconfigs: src and api
npm run preview           # serve the built dist/
```

There is no test suite and no linter. `npm run typecheck` is the verification gate — run it after any change, since `tsconfig.json` sets `noUnusedLocals`/`noUnusedParameters` and an unused import will fail the production build.

`vercel dev` needs `.env` populated. Check config without a DB: `GET /api/health` reports `mailConfigured`.

## Environment variables

`DATABASE_URL` (Neon pooled; API routes throw at module load without it), `DATABASE_URL_UNPOOLED`, `IG_ACCESS_TOKEN` (long-lived Instagram token — absent, `/api/instagram` returns an empty list and the homepage hides its Instagram section), and `RESEND_API_KEY` / `MAIL_FROM` / `MAIL_TO` for the inquiry form. These must also be set in the Vercel dashboard per environment.

## Two TypeScript projects, one shared type file

`src/` and `api/` compile under separate tsconfigs but `api/_lib/artwork.ts` imports `src/types.ts` — `Artwork`, `ArtworkImage`, `Availability`, `DisplayInfo`, `InquiryPayload` are the contract between the DB layer and the UI. Change a shape there and both sides must follow.

**Relative imports inside `api/` require an explicit `.js` extension** (`'./_lib/artwork.js'`, `'../../src/types.js'`) or the deployed function fails to resolve them. `src/` uses extensionless imports. Don't mix the conventions.

## Data flow

Postgres tables: `artworks`, `categories`, `artwork_categories` (join), `images` (ordered by `position`), `displays` (exhibition venue/dates, referenced by `artworks.display_id`).

Rows never reach the UI raw. `api/_lib/artwork.ts` is the single place where a DB row becomes an `Artwork`:

- `loadArtworksBatch(rows)` — for list endpoints. Fetches categories/images/displays for *all* ids in three `ANY($ids)` queries, then joins in memory. Use this for any new multi-row endpoint; per-row loading was the previous cause of slow page loads.
- `loadArtworkRow(row)` — single artwork only (`api/artworks/[id].ts`).
- `buildArtwork()` applies the presentation formatting: `formatSize`, `formatPrice`, `formatDate`. Prices and dimensions are stored as numbers and become display strings here, so `Artwork.price` is `'$450'`, not a number.

Endpoints follow one shape: reject non-GET with 405, set `Cache-Control: public, max-age=60, stale-while-revalidate=300`, return `{ artworks }` / `{ artwork }` / `{ categories }`, catch and return 500 with the error message. `/api/artworks?featured=true` returns only featured pieces — the homepage uses this to avoid loading the full catalog.

Client side, `src/hooks/useArtworks.ts` (`useArtworks({ featured })`, `useArtwork(id)`) and `useCategories.ts` are plain `useEffect` + `fetch` hooks returning `{ data, loading, error }`; there is no data-fetching library or cache. `useCategories` prepends `'All'` to the list itself. `src/lib/api.ts` holds the non-hook calls (`sendInquiry`, `fetchInstagramFeed`), both of which swallow errors and return a user-facing message or an empty array rather than throwing.

`src/data/artworks.ts` no longer holds artwork — only the `SITE` constant (Instagram handle, email, name). The artwork catalog is the database.

## Styling

No CSS framework, no CSS modules. Every component styles itself with inline `style={{}}` objects composed from `src/theme.ts` — colors (`theme.ink`, `theme.brass`, `theme.paper`), fonts (`serif`/`sans`/`script`), and shared `CSSProperties` objects (`eyebrow`, `h1`, `solidButton`, `ghostButton`, `underlineLink`, `placeholderTile`). Spread and override them rather than writing literal colors.

What inline styles can't express lives in the `<style>` block in `index.html`: link/hover/focus states, the `.btn-solid` / `.btn-instagram` hover classes, `:focus-visible` rings, the `[data-reveal]` scroll-in transition, and the `[data-skeleton]` pulse — all with `prefers-reduced-motion` opt-outs. Add new global animation or pseudo-class behavior there.

Responsive layout is done in JS, not media queries: `useNarrow()` from `src/hooks/useMediaQuery.ts` (760px breakpoint). Scroll-in reveals use `useReveal(deps)` — pass the loading flag as a dep so tiles that mount after fetch still animate. `FramedImage` sizes its frame from the image's intrinsic aspect ratio via `useImageRatio`.

Artwork images are served from `public/images/` (the DB stores the URL) and are cached immutably for a year by `vercel.json`, so **changed artwork needs a new filename**, not an overwrite.

## Inquiry form

`POST /api/inquiry` → zod `inquirySchema` (`api/_lib/schema.ts`, shared by both contact and commission variants) → `sendMail` (Resend) . Protected by a per-IP in-memory burst limit (`rateLimit.ts`, 5/min, best-effort across serverless instances) and a `company` honeypot field that returns a fake 200 when filled.

Note: the Contact and Commissions routes are **commented out** in `src/App.tsx` — the pages exist but are unreachable while inquiries are paused. Price display is likewise commented out in the artwork pages.
