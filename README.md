# Pulseboard

A professional event/log exploration dashboard built with SvelteKit, TypeScript, and Tailwind CSS. Handles large event volumes (tens/hundreds of thousands) with virtualized scrolling, fast filtering, and visualizations.

## Getting Started

```sh
pnpm install
pnpm dev
```

Then open [http://localhost:5173](http://localhost:5173).

## Project Structure

```
src/lib/
├── components/
│   ├── app/          # AppShell, OverviewCards
│   ├── event/        # EventStream, EventRow, DetailPanel
│   ├── filter/       # FilterBuilder, ActiveFilterChips, SavedViews
│   └── charts/       # TimelineChart, ServiceBreakdownChart
├── stores/           # filterState, theme, density, etc.
├── data/             # eventStore, mockEvents
└── types/            # Event, Filter, SavedView types
```

## Features

- **Virtualized event list** – Uses `@humanspeak/svelte-virtual-list` for windowing; only visible rows plus a buffer are rendered, so 100k+ events scroll smoothly.
- **Live tail mode** – Simulated new events with pause/resume.
- **Filtering** – Time range, severity, services, environments, text search; filters sync to the URL.
- **Detail panel** – Summary, raw JSON, related events by trace/request ID; "Add to filter" on field click.
- **Charts** – Timeline (volume by severity), service breakdown by volume and errors.
- **Saved views** – Persisted in localStorage.

## Keyboard Shortcuts

- `j` / `k` – Move selection up/down
- `Enter` – Open event details
- `/` – Focus search

## Virtualization

The event list uses `@humanspeak/svelte-virtual-list`, which:

1. Renders only items in the viewport plus a buffer
2. Supports dynamic item heights
3. Keeps memory usage low for large datasets

## Extending to a Real Backend

To replace mock data with a real API:

1. **Replace `mockEvents`** – Remove or bypass `generateEvents` and `streamEvents` in `src/lib/data/mockEvents.ts`.
2. **Replace `eventStore`** – In `src/lib/data/eventStore.ts`:
   - Replace `datasetStore` with API calls (e.g. `fetch` or a client)
   - Keep `filteredEvents` derived from `filterState`; either filter client-side or pass filter params to the API
   - Keep `subscribeToLiveTail` but wire it to WebSocket/SSE instead of the mock timer
3. **Keep `filterState` and URL sync** – `serializeToUrl` / `parseFromUrl` in `filterState.ts` work for any backend; URL state remains shareable.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build |
| `pnpm test` | Run Vitest tests |
| `pnpm check` | Run svelte-check |
| `pnpm lint` | Run ESLint + Prettier |
