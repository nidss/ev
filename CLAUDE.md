# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A prototype platform for running a large event: registration and ticketing, on-site check-in (QR and RFID wristband), and booth lead capture that is consent-aware under PDPA (Thailand's data protection law). The sample event is **MOC Expo 2026**, a Ministry of Commerce trade fair with free registration only. Its dates, venue, categories and exhibitors are placeholder data.

The site is published at https://nidss.github.io/ev/ as a **static site**. Everything runs in the browser and there is no server.

## Working conventions

- **Language:** code comments and UI copy are in Thai (or English). Never use Japanese characters.
- **Branching:** the owner works directly on `main` as the only branch. A push to `main` deploys to GitHub Pages through `.github/workflows/pages.yml`, which runs `pnpm install` → `pnpm test` → `pnpm build` with `NEXT_PUBLIC_BASE_PATH=/<repo>`.
- **Next.js 16** has breaking changes compared with older versions. Read `apps/web/AGENTS.md`, and the guides in `apps/web/node_modules/next/dist/docs/` before writing Next code.
  - `params`, `searchParams` and `cookies` are async.
  - `useSearchParams` must be inside a `<Suspense>` boundary.
- **TypeScript** is pinned to `^6`; v7 breaks the build.

## Commands

Requires Node 22+ and pnpm 10.

```bash
pnpm install
pnpm dev                 # Next dev server on http://localhost:3000
pnpm test                # vitest for packages/core (the only tests in the repo)
pnpm typecheck           # tsc in every package
pnpm build               # static export → apps/web/out

# a single test file, or a single test by name
pnpm --filter @ev/core exec vitest run test/onsite.test.ts
pnpm --filter @ev/core exec vitest run -t "seeds consistent demo data"

# build exactly as Pages does, under the /ev base path
NEXT_PUBLIC_BASE_PATH=/ev pnpm build
```

- **Stale route types:** if tsc complains about routes that no longer exist, delete `apps/web/.next`.
- **No end-to-end tests in the repo.** Browser checks are done ad hoc with Playwright against `apps/web/out`, served under an `/ev` path. Chromium is at `/opt/pw-browsers/chromium`.

## Architecture

There are two packages in a pnpm workspace.

### `packages/core` (`@ev/core`)

All business logic lives here. It is the same code a future server would run, so it must stay **browser-safe**: no Node-only APIs. Crypto comes from `@noble/ed25519` and `@noble/hashes`, wrapped in `src/crypto.ts`.

**`TicketingService` (`ticketing.ts`)** runs over an in-memory `MemoryStore`:
- **Event and orders:** builds the event view (tickets, rounds, products, unlock-code handling), creates orders with a timed hold (`holdMinutes`), quotes promo codes, and handles checkout.
- **Payments:** goes through the `PaymentProvider` interface. `MockPaymentProvider` sends HMAC-signed webhooks into `handleWebhook`, which is idempotent and handles late payments by re-reserving or refunding.
- **Attendees:** confirming an order creates `Attendee`s, each with a signed QR token in the format `EV1.<shortCode>.<id>.<ver>.<sig>` (Ed25519, see `codes.ts`).
- **Persistence:** `serializeStore` / `restoreStore` save and restore the whole store.

**`OnsiteService` (`onsite.ts`)** wraps `TicketingService`:
- **Check-in** at checkpoints: `checkIn` and `syncCheckins`. Scan IDs are generated on the client, so replaying a scan is idempotent.
- **Booths and leads:** `staffScan`, `attendeeBoothAction`, `updateLead`.
- **Exhibitors:** `sponsorView` shows identities only for consenting attendees. `exportLeads` produces CSV with a guard against formula injection.
- **Organizer:** the `dashboard` and attendee list.

**`checkin-rules.ts`** holds the check-in decision logic and is exported separately as `@ev/core/checkin-rules`. The browser's offline scanner uses exactly the same rules as the backend. Change rules there, never in the UI.

**Catalog:** everything event-specific is one `Catalog` object: event, slots, ticket types, products, promos, checkpoints, sponsors, booths, categories and floor plan.
- `src/mock-data.ts` → `createMockCatalog()` returns the live MOC Expo data, which is all free.
- `test/fixtures/paid-catalog.ts` → `createPaidFixtureCatalog()` is an older event with paid tickets, day slots, workshops, add-ons and promo codes. It keeps the engine tests covering payment paths.
  - Tests that need payments use this fixture.
  - The seed test and the floor-plan test use the MOC catalog.

**`seed.ts` (`seedDemo`)** generates demo orders, check-ins and booth scans by calling the real service APIs. It hardcodes MOC ticket and checkpoint IDs (`tt_visitor`, `tt_trade`, `tt_press`, `cp_gate_a`, `cp_gate_b`, `cp_bm`).

**Consent rule:** accepting the terms (`acceptTerms`, which is required) counts as consent to share data with booths the attendee scans or is scanned at. This applies **only to holders whose email equals the buyer's**. Other holders registered in the same order are treated as not consenting.

**Money** is stored as integer satang. **Times** are ISO strings, and dates are computed in the event's timezone.

### `apps/web` (`@ev/web`)

A Next.js App Router app built with `output: "export"` and `trailingSlash: true`. The base path comes from `NEXT_PUBLIC_BASE_PATH`.
- Dynamic routes are prerendered through `generateStaticParams`, from `EVENT_SLUG` in `lib/paths.ts` or from the mock catalog for booths and sponsors.
- Pages are thin server shells that render a client `*-view.tsx` inside `<Suspense>`.

**`lib/backend.ts`** is the "server":
- **Setup:** builds `TicketingService` + `OnsiteService` + `MockPaymentProvider` from `createMockCatalog()`, and seeds demo data on first load.
- **Storage:** persists to localStorage key `ev-prototype-state-v2`. Bump the key whenever the catalog changes incompatibly.
- **Sync:** syncs across tabs through `storage` events.
- **Hook:** components read the backend with `useBackend()`, a `useSyncExternalStore` hook that re-renders on every change.

**`lib/local-api.ts`** exposes `api(path, init)`:
- It matches `/api/...` paths to handlers and returns real `Response` objects, so UI code reads like it is calling a server.
- To add a server later, swap this for `fetch` and run `@ev/core` in API routes; `docs/ARCHITECTURE.md` describes the target design.
- Booth-visitor identity is a signed value stored in localStorage key `ev-attendee`.

**Offline check-in (`lib/offline-checkin.ts`):** the scanner caches a snapshot (attendees, public key, accepted keys) and decides offline using `checkin-rules`. Results are queued and synced later.

**i18n** supports Thai and English, chosen through `LocaleProvider` / `useLocale` (localStorage key `ev-lang`):
- **Attendee-facing strings:** `dict(locale, free)` in `lib/i18n.ts`. `free` applies registration wording overrides; `isFreeEvent(catalog)` decides it.
- **Staff, exhibitor and organizer strings:** `od(locale)` in `lib/onsite-i18n.ts`.
- **Catalog text** is `I18n` objects rendered with `tr()`.

**Free-event mode:** when every ticket and product costs 0, the UI does the following:
- Hides the date chips (when no ticket uses slots), add-ons, the promo field, totals, the payment step and the revenue figures.
- Shows a printable **name badge** (`components/name-badge.tsx`) after registration, instead of e-tickets.
  - Front: name and QR.
  - Back: the floor plan.
  - Print CSS: `.badge-face` in `globals.css`, using `@page 100mm 140mm` with each face on its own page.

**Floor plan (`components/floor-plan.tsx`)** draws `catalog.floorPlan` zones as SVG, coloured by `ProductCategory` (`color` / `colorDark`, swapped through CSS variables in `.fp-auto`).
- The 6 category colours are the standard categorical slots, validated for **adjacent** pairs only.
- Zones that touch on the plan must therefore be slot-adjacent.
- Every zone keeps its letter and name label, and booth codes start with the category letter.
- Keep both rules when you edit categories or the layout.

**CSS:** Tailwind v4 with `@csstools/postcss-cascade-layers`. That plugin flattens `@layer`, because older browsers drop layered CSS entirely and the site would render unstyled.
- Theme tokens live in `globals.css`, with a dark-mode block.
- Use the precomputed `--brand-*` tint tokens or rgba values instead of `color-mix()`.
- Static assets must be prefixed with `BASE_PATH`, because `next/image` optimization is off.

## Docs

- `docs/FEATURES.md`: product features and phases.
- `docs/ARCHITECTURE.md`: target production design (Next.js + PostgreSQL + Redis).
- `docs/TICKETING.md`: order, hold, payment and data model. §12 describes the current mock data.
