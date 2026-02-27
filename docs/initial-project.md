You are a senior frontend engineer. Build an event/log dashboard web app named “Pulseboard” using SvelteKit + TypeScript + Tailwind CSS.

Goal:
Create a professional-but-wow event/log exploration UI that can handle very large event volumes (tens/hundreds of thousands) with smooth scrolling, fast filtering, and clear visualizations.

Core experience (wow factors):

1. Ultra-smooth event stream

- Implement a virtualized, infinite-scrolling event list (windowing) that can render huge datasets without jank.
- Include a “live tail” mode that auto-appends new events and optionally auto-scrolls to newest, with a pause button when the user scrolls up.
- Provide a minimap/overview scrollbar on the right that shows density/markers (errors/warnings/deploys) and allows jump-to-time.
- Add keyboard navigation: j/k to move selection, enter to open details, / to focus search.

2. Advanced filtering (fast + expressive)

- Left sidebar filter builder with:
  - time range (relative: last 15m/1h/24h; absolute range picker)
  - severity (trace/debug/info/warn/error/fatal)
  - services, environments, hosts, users
  - text search (supports quoted phrases)
  - field filters (key/value) with operators (=, !=, contains, regex optional)
  - AND/OR groups (simple query builder UI)
- Show active filter “chips” above the list; chips are removable and reflect the query state.
- Support saved views: create/edit/delete, set default view.

3. Details + investigation workflow

- Split-pane layout:
  - center: event stream list
  - right: event detail drawer/panel with tabs: “Summary”, “Raw JSON”, “Related”, “Context”
- In detail panel:
  - pretty-print JSON with collapsible nodes
  - highlight key fields (timestamp, traceId, spanId, requestId, userId, service, env)
  - “Add to filter” action on any field value (click field -> add filter chip)
  - show “related events” by traceId/requestId within a time window

4. Data visualizations (lightweight but impactful)

- Top row overview cards: Events/min, Error rate, P95 latency (mock), Unique users (mock)
- Timeline chart: event volume over time, stacked by severity, brush to zoom the visible time range.
- Service breakdown chart: top services by errors or volume.
- Make charts responsive and update instantly when filters change.

Data & architecture:

- Use a local mock event generator first (seeded randomness), producing realistic log objects:
  { id, ts, severity, service, env, message, traceId, requestId, durationMs?, userId?, attrs: Record<string, any> }
- Create a small data layer:
  - eventStore.ts: handles dataset, filtering, sorting, pagination/infinite query, and “live tail” simulation
  - filterState.ts: a typed filter model + serialization to URL query params
- Ensure the UI state is shareable via URL:
  - time range, search string, filters, sort, selected event id, saved view id (optional)
- Performance requirements:
  - virtualization for the event list
  - debounced search input
  - memoized derived data for filtered results
  - avoid expensive JSON stringification on every render; compute once per selected event
- Styling:
  - Tailwind with a clean modern dark mode and light mode toggle
  - subtle animations (selection transitions, drawer slide-in, live indicator pulse)
  - color-coded severity badges, readable typography, compact density toggle (comfortable/compact)
- Components to implement:
  - AppShell (header + sidebar + main + detail panel)
  - EventStream (virtualized list)
  - EventRow (compact row with severity badge, service, message, time)
  - FilterBuilder (query builder + facets)
  - ActiveFilterChips
  - TimelineChart + ServiceBreakdownChart
  - DetailPanel with tabs and “Add to filter” interactions
  - SavedViews (modal or dropdown)
- Deliverables:
  - SvelteKit project structure with clear folders: routes, lib/components, lib/stores, lib/data
  - TypeScript types for events and filters
  - A short README describing how to run, how virtualization works, and how to extend to a real backend.

Implementation notes:

- Favor readable, production-quality code and file organization.
- Start with mock data + UI, then wire up filters and charts to the same filter state.
- Use accessibility-friendly patterns (focus states, keyboard nav, ARIA labels where needed).

Now generate the project skeleton, key files, and the initial working UI with mock data, virtualization, filtering, and charts.
