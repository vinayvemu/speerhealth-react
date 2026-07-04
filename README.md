# InsightBoard — Speer Health Take-Home

A mobile-first React web app for pharmaceutical field reps to capture, organize, and collaborate on HCP insights in real time.

> **Live credentials are already in `.env.example` — no extra config needed.**

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env (credentials are pre-filled — this is a shared public Supabase instance)
cp .env.example .env

# 3. Start dev server
npm run dev
# Opens at http://localhost:5173

# 4. Log in with test accounts
#   Alice: alice01@insightboard.test / InsightBoard-01
#   Bob:   bob01@insightboard.test   / InsightBoard-01
```

To demo **real-time collaboration**, open two browser tabs (or incognito) and log in as Alice and Bob simultaneously.

## Scripts

```bash
npm run dev      # Dev server with HMR (Vite 8)
npm run build    # Production build
npm run preview  # Serve the production build locally
npm test         # 36 unit tests via Vitest
npm run lint     # Oxlint
```

---

## Modules Delivered

| # | Module | Status | Coverage |
|---|--------|--------|----------|
| 1 | **Pipeline Board** | ✅ Complete | 4-stage pipeline bar with per-stage counts; card list with swipe-to-move (spring animation); priority pills + advanced filter drawer (category, HCP, date range, tags) with lazy-apply; active filter chips; recency sort; URL-persisted filter state; virtualised infinite scroll list; grid view; overview mode |
| 2 | **Insight Detail & Form** | ✅ Complete | Side drawer with full detail view, activity timeline, stage-move controls; validated create/edit form (react-hook-form + Zod); conflict detection fetches fresh `updatedAt` before every save; custom fields rendered dynamically in both form and detail |
| 3 | **Real-Time Collaboration** | ✅ Complete | Postgres Changes subscription syncs board across sessions; Presence API shows live avatar list in header; echo suppression singleton (3 s tag) prevents own mutations from double-applying |
| 4 | **Analytics & Export** | ✅ Complete | KPI cards (total, by stage, avg pipeline time, most active HCP); 5 Recharts charts (funnel, weekly time-series, category breakdown, priority-by-stage heatmap, HCP leaderboard); multi-page PDF export with date-range filter, 25-row pagination, drug appendix with FDA adverse reactions |
| 5 | **Real-Time Enhancements** | ✅ Complete | Broadcast signals show who is viewing, editing, or swiping a card in real time; conflict resolution modal with Keep Mine / Keep Theirs / Merge when concurrent edits detected |
| 6 | **Board Enhancements** | ✅ Complete | Overview mode (all stages at a glance); drag-to-reorder within stage via `@dnd-kit` (persists `column_order` for all items on drop); composable filter bar with Filter + Recency + Reorder controls |

---

## Bonus Tasks Completed

### B1 — Custom Fields

- Users tap **+ Add Field** in the insight form to define ad-hoc fields (text, number, date, single-select with user-defined options).
- Definitions are persisted per-user in the `user_preferences` JSONB column via GraphQL mutation (`UPDATE_USER_PREFERENCES`).
- Values are stored in the insight's `custom_fields` JSONB column alongside core fields.
- Rendered dynamically in both the **create/edit form** (`CustomFieldsSection`) and the **detail drawer** (`CustomFieldValues`).
- Typed end-to-end with TypeScript generics:

```ts
type FieldType = 'text' | 'number' | 'date' | 'select';

interface CustomFieldDef<T extends FieldType = FieldType> {
  key: string;
  label: string;
  type: T;
  options: T extends 'select' ? string[] : never;
}
```

### B1 — Voice-to-Text

- Mic button on the Description field toggles native `SpeechRecognition` (Web Speech API).
- Visual indicator changes between *Click to listen*, *Requesting…*, *Recording…*, and *Denied* states.
- Uses `continuous: true` so recording stays open until the user stops it — avoids the browser auto-stopping mid-sentence and resetting the UI while the mic stays open (a real memory-leak scenario I've seen cause confusion in production).
- `resultIndex` used on every `onresult` event to process only the newly finalised utterance, preventing transcript duplication.
- `stoppingRef` distinguishes a user-initiated stop from a browser auto-stop, preventing a stale `setState` after explicit `stop()`.
- Mic is stopped immediately when the drawer closes (`useEffect` on `open` prop) and on component unmount — **no resource leak**.
- Permission denial handled gracefully with a clear UI state (`'denied'`); unsupported browsers surface `'unsupported'` state.

### B2 — Drug Integration (OpenFDA)

- Expandable **Drug Context** panel appears in the detail drawer whenever an insight has a `drug_name`.
- Powered by a dedicated, independently testable `openFDAService` module — no inline fetch in components.
- Two endpoints called in parallel:
  - **Label API** → indication (1-liner) + boxed warning (styled with amber border)
  - **Events API** → top 5 adverse reactions with reported counts
- Each endpoint has its own independent loading / error / empty state so a slow events fetch doesn't block the label from rendering.
- **10-minute TTL cache** per drug name — repeated opens of the same insight never re-fetch within the window.
- **HTTP 429 handling** — exponential backoff (up to 3 retries) with "FDA data loading slowly…" user feedback.
- All API responses fully typed; no `any`.

---

## Quality Notes

- **No `any` in production code** — `InsightFilter` and `AnalyticsFilter` typed interfaces replace all `Record<string, any>` usages.
- **36 unit tests** covering filter logic, schema validation, echo suppression, optimistic swipe, and data transforms.
- **Infinite-render prevention** — `insights` array memoized with `useMemo` so the `useEffect` that syncs drag-reorder local state only fires on genuine data changes, not on every render.
- **URL-persisted filters** — stage, search, priority, date, category, sort all live in `useSearchParams`; fully deep-linkable, browser back/forward works correctly.
- **Lazy-apply advanced filters** — filter drawer maintains local draft; URL (and API call) only update on "Apply".

---

## Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + Vite 8 + TypeScript (strict) |
| Component library | MUI v9 (Material UI) |
| GraphQL | Apollo Client 3 + Supabase pg_graphql |
| Real-time | Supabase Realtime (Postgres Changes, Presence, Broadcast) |
| Charts | Recharts 3 |
| PDF export | jsPDF + jspdf-autotable |
| Forms | react-hook-form + Zod |
| Animations | @react-spring/web + @use-gesture/react |
| Virtualization | @tanstack/react-virtual |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable |
| Tests | Vitest 4 + @testing-library/react |

---

## Architecture

### Feature-based structure

```
src/
├── lib/apollo/          # Apollo Client, auth link, error link, cache config
├── lib/supabase/        # Supabase client, echo suppression singleton
├── lib/router/          # React Router protected/public layout split
├── shared/              # Reusable UI components, domain types, hooks
└── features/
    ├── auth/            # Auth context, login page
    ├── board/           # Pipeline board — queries, hooks, components
    ├── insight/         # InsightForm, DetailDrawer, ActivityTimeline, custom fields, speech
    ├── realtime/        # RealtimeProvider, broadcast, presence, conflict resolution
    └── analytics/       # Dashboard charts, data transforms, PDF export
```

### Key decisions

- **Apollo `relayStylePagination`** — cursor-based infinite scroll; `nodeId` as normalized cache key; `['filter', 'orderBy']` as key args so each stage/sort combination has its own cache entry.
- **Echo suppression** — own mutation events tagged for 3 s so Postgres Changes don't double-apply optimistic state.
- **URL-persisted filters** — deep-linkable, no history pollution, browser navigation works.
- **Lazy-apply filters** — advanced filter drawer commits to URL only on "Apply", preventing mid-type API calls.
- **Optimistic swipe** — insight evicted from Apollo cache immediately; reverts via `refetchQueries` on failure.
- **Conflict resolution** — fetches fresh `updatedAt` before every save; diff modal with Keep Mine / Keep Theirs / Merge on concurrent edit.
- **Drag-to-reorder persistence** — all items in the list get their `column_order` updated on every drop (not just the moved item), keeping `ORDER BY column_order ASC NULLS LAST` stable.
- **Speech cleanup** — mic stopped on drawer close and unmount to release the browser media track; `continuous: true` prevents ghost "idle" resets while the mic indicator is still active.
