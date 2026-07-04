# Architecture — InsightBoard

## Directory structure

```
src/
├── lib/
│   ├── apollo/          # Apollo Client instance, auth link, error link, cache policies
│   └── supabase/        # Supabase client, echo suppression singleton
├── lib/router/          # React Router (protected/public layout split)
├── shared/
│   ├── types/           # domain.ts (Stage, Priority, STAGES, helpers)
│   │                    # result.ts (Result<T,E>, AppError discriminated union)
│   ├── components/      # AppLayout, AppDrawer, ErrorBoundary, Toast, PriorityBadge,
│   │                    # PrimaryButton, FormTextField, FormSelect
│   └── hooks/           # useThrottle, useIntersectionObserver
└── features/
    ├── auth/            # AuthContext, LoginPage, useAuth
    ├── board/           # Pipeline board — queries, mutations, hooks, components
    ├── insight/         # InsightForm, DetailDrawer, ActivityTimeline
    ├── realtime/        # RealtimeProvider, useBoardSync, useBroadcast,
    │                    # usePresence, useConflictResolution, ConflictModal,
    │                    # ActivityFeedDrawer
    └── analytics/       # AnalyticsPage, transforms, useAnalyticsData, usePdfExport
```

## State management

| Bucket | Tool | What lives here |
|--------|------|-----------------|
| Server state | Apollo InMemoryCache | All Insight, HCP, Category, Tag data |
| Filter state | URL search params | Stage, search query, priorities, date range, category, HCP, tags |
| Global UI state | React Context | Auth session, toast queue, online presence map, broadcast card states |
| Ephemeral UI | local `useState` | Drawer open/closed, swipe animation, form dirty flag, filter draft |

URL-persisted filters use `useSearchParams` with `replace: true` — no history pollution, deep-linkable views.

## GraphQL / Apollo

- **Cache key**: `nodeId` (pg_graphql global Relay ID) via `dataIdFromObject`.
- **Pagination**: `relayStylePagination(['filter', 'orderBy'])` — cursor-based merge, 30-node page size (pg_graphql max).
- **Tags derivation**: Apollo `read` field policy on the `Insights` type maps the `insightTagsCollection` junction edges to a flat `Tag[]`, so all components consume `insight.tags` directly.
- **Auth**: `setContext` async link injects `apikey` + `Authorization: Bearer <token>` on every request.
- **Error handling**: `onError` link converts network/GraphQL errors to the `AppError` discriminated union and triggers a toast.
- **Cache invalidation**: After every create/update/stage-move mutation, both `LIST_INSIGHTS` and `GET_STAGE_COUNTS` are refetched via `refetchAll()` in `BoardPage`, keeping the pipeline counts and card list in sync.

## Real-time layer

Three Supabase channels per session:

| Channel | Used for |
|---------|----------|
| `insights:{teamId}` | Postgres Changes (INSERT/UPDATE/DELETE on insights, RLS-scoped) |
| `activities:{teamId}` | Postgres Changes (INSERT on insight_activities for the activity feed) |
| `board:{teamId}` | Broadcast — ephemeral signals (viewing, editing, swiping) |
| `presence:{teamId}` | Presence — online user list with name/avatar |

**Echo suppression**: `EchoSuppressor` (singleton, `lib/supabase/echoSuppression.ts`) tags a mutation's row ID for 3 s before firing. The Postgres Changes handler checks `echoSuppressor.isMine(id)` and skips own events, preventing the UI from double-applying optimistic + server state.

**Conflict resolution flow**:
1. User opens EditForm — we record `insight.updatedAt` as `loadedAt`.
2. On submit, fetch the row fresh with `network-only`.
3. Compare fresh `updatedAt > loadedAt`. If true, diff tracked fields (`title`, `description`, `priority`, `stage`).
4. If any field differs → open `ConflictModal` with Keep Mine / Keep Theirs / Merge options.
5. Merge: take user's value for fields they changed, server's value for everything else.

## Optimistic swipe

1. `echoSuppressor.tag(id)` — prevents echo.
2. `apolloClient.cache.evict({ id: cacheId })` + `cache.gc()` — card disappears immediately from the list.
3. Fire `updateInsightsCollection` mutation.
4. On success → `onSuccess` callback triggers `refetchAll()` in BoardPage (list + counts).
5. On failure → `apolloClient.refetchQueries({ include: [LIST_INSIGHTS, GET_STAGE_COUNTS] })` reverts the eviction; toast error.

## Filter architecture

Filters are split into two tiers:

| Tier | How it works |
|------|-------------|
| **Quick filters** (priority, search) | Write directly to URL on every change — instant API response |
| **Advanced filters** (category, date range) | Maintain local draft state in the drawer; commit to URL only on "Apply Filters" click |

This prevents mid-keystroke API calls on the date picker while keeping priority toggles feel instant.

## Analytics

**Data sources**:
- Stage counts → `totalCount` from server (no row fetch, O(1) via pg_graphql).
- Distributions, time-series, leaderboards → computed client-side from a full cursor-paginated fetch of all insights.

**Lazy charts**: each chart is wrapped in `<LazyChart>` which uses `IntersectionObserver`; the chart query and render only happen when scrolled into view.

**PDF export (jsPDF + jspdf-autotable)** — 5-page document built progressively (progress bar 0→100%):
1. Cover page — title, date range, timestamp.
2. KPI summary table.
3. Pipeline funnel table.
4. Insight detail table (paginated at 25 rows/page).
5. Drug appendix — insights with linked drug names.

## Reusable UI components

Three shared components were extracted to avoid duplication across 3+ feature areas:

| Component | Used by |
|-----------|---------|
| `AppDrawer` | InsightForm, AdvancedFilterDrawer, ActivityFeedDrawer, DetailDrawer |
| `PrimaryButton` | InsightForm footer, empty state CTAs |
| `FormTextField` / `FormSelect` | InsightForm, AdvancedFilterDrawer |

`AppDrawer` accepts a `width` prop (responsive object or fixed value), `headerExtra` for badge content below the title, `footer` for sticky bottom actions, and `isForm` to render the body as a `<form>` element.

## Testing strategy

Tests are logic-only (no DOM, no network mocks) to maximize signal-to-noise:

| File | What it covers |
|------|---------------|
| `schemas.test.ts` | Zod validation edge cases (empty string, length limits, enum) |
| `transforms.test.ts` | All 6 analytics transform functions with boundary inputs |
| `useBoardFilters.test.ts` | Stage navigation helpers + GraphQL filter builder logic |
| `optimisticSwipe.test.ts` | State machine: idle → pending → reverting → idle |
| `echoSuppression.test.ts` | `EchoSuppressor` with fake timers — TTL, multi-ID independence |

## Performance

- **Virtualized list** (`@tanstack/react-virtual`) — only visible cards render; overscan of 8 items.
- **Lazy charts** — `IntersectionObserver`; chart only mounts when scrolled into view.
- **Throttled broadcast** — swipe progress signals throttled to 300 ms via `useThrottle`.
- **`replace: true` on filter changes** — no history stack growth.
- **Apollo `fetchPolicy: 'cache-and-network'`** — instant render from cache, background refresh to keep data fresh.
