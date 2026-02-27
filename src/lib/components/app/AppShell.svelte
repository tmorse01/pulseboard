<script lang="ts">
	import FilterBuilder from '$lib/components/filter/FilterBuilder.svelte';
	import EventStream from '$lib/components/event/EventStream.svelte';
	import DetailPanel from '$lib/components/event/DetailPanel.svelte';
	import OverviewCards from '$lib/components/app/OverviewCards.svelte';
	import TimelineChart from '$lib/components/charts/TimelineChart.svelte';
	import ServiceSeverityHeatmap from '$lib/components/charts/ServiceSeverityHeatmap.svelte';
	import ServiceEnvHeatmap from '$lib/components/charts/ServiceEnvHeatmap.svelte';
	import SavedViews from '$lib/components/filter/SavedViews.svelte';
	import HeaderActionsDropdown from '$lib/components/app/HeaderActionsDropdown.svelte';
	import { theme, selectedEventId } from '$lib/stores/index.js';
	import { getResolvedTheme } from '$lib/stores/theme.js';
	import { Menu, Activity } from '@lucide/svelte';

	let themeValue = $derived($theme);
	let selectedId = $derived($selectedEventId);
	let sidebarOpen = $state(true);

	function applyThemeToDoc() {
		const resolved = getResolvedTheme(themeValue);
		document.documentElement.classList.toggle('dark', resolved === 'dark');
		document.documentElement.classList.toggle('light', resolved === 'light');
	}

	$effect(() => {
		applyThemeToDoc();
	});
</script>

<div
	class="grid min-h-screen grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr] bg-bg-app text-text-primary lg:grid-cols-[minmax(200px,280px)_minmax(0,1fr)]"
>
	<!-- Header -->
	<header
		class="col-span-full flex min-h-0 shrink-0 items-center justify-between gap-2 border-b border-border-default bg-surface-1 px-4 py-2"
	>
		<div class="flex min-w-0 items-center gap-3">
			<button
				type="button"
				class="rounded p-2 hover:bg-hover-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 lg:hidden"
				aria-label="Toggle sidebar"
				onclick={() => (sidebarOpen = !sidebarOpen)}
			>
				<Menu class="h-5 w-5 shrink-0" aria-hidden="true" />
			</button>
			<h1 class="flex items-center gap-2 truncate text-lg font-semibold">
				<Activity class="hidden h-5 w-5 shrink-0 text-text-muted lg:block" aria-hidden="true" />
				<span>Pulseboard</span>
			</h1>
		</div>
		<div class="flex shrink-0 items-center gap-2">
			<SavedViews />
			<HeaderActionsDropdown />
		</div>
	</header>

	<!-- Sidebar -->
	<aside
		class="hidden overflow-y-auto border-r border-border-default bg-surface-1 lg:block {sidebarOpen
			? 'lg:flex'
			: 'lg:hidden'} w-full flex-col lg:w-auto lg:max-w-[280px] lg:min-w-[200px]"
		aria-label="Filters"
	>
		<FilterBuilder />
	</aside>
	{#if sidebarOpen}
		<div
			class="fixed inset-0 z-40 bg-black/50 lg:hidden"
			aria-hidden="true"
			onclick={() => (sidebarOpen = false)}
		></div>
		<aside
			class="fixed top-0 bottom-0 left-0 z-50 w-[280px] max-w-[85vw] overflow-y-auto border-r border-border-default bg-surface-1 lg:hidden"
			aria-label="Filters"
		>
			<FilterBuilder />
		</aside>
	{/if}

	<!-- Main -->
	<main class="flex min-h-0 flex-col overflow-hidden">
		<div class="border-b border-border-default bg-bg-subtle p-2">
			<OverviewCards />
		</div>
		<div
			class="grid min-h-0 flex-1 grid-cols-1 grid-rows-[1fr_auto] gap-2 p-2 xl:grid-cols-[1fr_320px] xl:grid-rows-[1fr]"
		>
			<div class="flex min-h-0 flex-col overflow-hidden">
				<div class="mb-2">
					<TimelineChart />
				</div>
				<div class="mb-2 grid grid-cols-1 gap-2 md:grid-cols-2">
					<ServiceSeverityHeatmap />
					<ServiceEnvHeatmap />
				</div>
				<div class="flex min-h-0 flex-1 flex-col rounded border border-border-default bg-surface-1">
					<EventStream />
				</div>
			</div>
			<!-- Right sidebar: log detail view (placeholder when no selection) -->
			<aside
				class="flex w-full min-w-0 flex-col overflow-hidden rounded border border-border-default bg-surface-1 xl:w-[320px]"
				aria-label="Log detail view"
			>
				{#if selectedId}
					<DetailPanel eventId={selectedId} />
				{:else}
					<div
						class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-text-muted"
					>
						<p class="text-sm font-medium text-text-faint">Log detail view</p>
						<p class="text-xs">Select an event in the stream to see details here.</p>
					</div>
				{/if}
			</aside>
		</div>
	</main>
</div>
