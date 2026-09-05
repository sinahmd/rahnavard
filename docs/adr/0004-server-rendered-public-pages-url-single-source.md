# ADR-0004: Server-rendered public pages; URL as the single source of truth for listings

**Status:** Accepted (implemented)
**Date:** 2026-09-04 · **Plan ref:** SENIOR_REFACTOR_PLAN §6.C, §17#11/#12

## Context

Detail pages were already RSC with `generateMetadata` + revalidate, but the
home page's five sections and both listing pages were client components that
fetched on mount — the first HTML was empty for crawlers and slow to first
content. The cars listing mirrored URL state into React state, synced back
from the URL in one effect and pushed to the URL in another (the "ping-pong
pair" and its stale-sync bugs).

## Decision

- **Home**: server component; `lib/data/home.ts` fetches section data; the
  hero slider / featured cars / articles / branches / consultation form are
  client **islands** receiving typed props (no mount fetch).
- **Settings**: server-fetched once in `(site)/layout.tsx` (`revalidate: 60`),
  passed as props to Header/Footer; `SettingsContext` deleted.
- **Listings**: async server shells parse `searchParams` with the shared
  `listQuery.ts`, fetch the matching first page + filter options, and hand a
  snapshot to the `CarsExplorer`/`ArticlesExplorer` island. Canonical listing
  state = `searchParams`, derived during render; interactions mutate the URL
  (`router.replace` preserved); the island skips its first fetch when the URL
  equals `initialQuery`. No `useState` mirrors of URL params.
- Detail pages route through `lib/data/*` and call `notFound()`;
  `(site)/loading.tsx` + `(site)/error.tsx` provide boundaries.

## Consequences

- `curl /` and `/cars` return content-bearing HTML; LCP baseline `/` 107 kB
  first load (recorded in Phase 5).
- Back/forward and deep links work because state is read from the URL, not
  mirrored into it. Abort/race/stale-while-revalidate UX preserved in islands.
- Admin edits appear publicly within ≤60s (`revalidate`); a
  `revalidatePath`/tag on admin save is a deferred follow-up.

## Alternatives rejected

- Full RSC listings with server actions per keystroke — wrong latency model.
- Keeping the mirror inside an island — keeps the state-disagreement bug class.
