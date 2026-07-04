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
npm run lint     # ESLint + Oxlint
```

## Modules Delivered

| # | Module | Status |
|---|--------|--------|
| 1 | **Pipeline Board** — 4-stage pipeline bar, card list, swipe-to-move, priority + advanced filters | ✅ Done |
| 2 | **Insight Detail & Form** — side drawer detail panel, validated create/edit form (Zod), activity timeline | ✅ Done |
| 3 | **Real-Time Collaboration** — Postgres Changes board sync, Presence avatars in header | ✅ Done |
| 4 | **Analytics & Export** — KPI cards, 5 Recharts charts (funnel, time-series, category, heatmap, leaderboard), multi-page PDF export | ✅ Done |
| 5 | **Real-Time Enhancements** — Broadcast signals (viewing/editing/swiping indicators), conflict resolution modal | ✅ Done |
| 6 | **Board Enhancements** — Overview mode, drag-to-reorder within stage, composable filter drawer (lazy apply) | ✅ Done |

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

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design rationale.

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
    ├── insight/         # InsightForm, DetailDrawer, ActivityTimeline
    ├── realtime/        # RealtimeProvider, broadcast, presence, conflict resolution
    └── analytics/       # Dashboard charts, data transforms, PDF export
```

### Key decisions at a glance

- **Apollo `relayStylePagination`** — cursor-based infinite scroll; `nodeId` as normalized cache key.
- **Echo suppression** — own mutation events tagged for 3 s so Postgres Changes don't double-apply optimistic state.
- **URL-persisted filters** — stage, search, priority, date, category stored in `useSearchParams`; deep-linkable, no history pollution.
- **Lazy-apply filters** — advanced filter drawer maintains local draft state and commits to URL only on "Apply", preventing mid-type API calls.
- **Optimistic swipe** — insight evicted from Apollo cache immediately; reverts via `refetchQueries` on failure.
- **Conflict resolution** — fetches fresh `updatedAt` before every save; diff modal with Keep Mine / Keep Theirs / Merge if concurrent edit detected.
