<script lang="ts">
	import FilterBuilder from '$lib/components/filter/FilterBuilder.svelte';
	import ActiveFilterChips from '$lib/components/filter/ActiveFilterChips.svelte';
	import EventStream from '$lib/components/event/EventStream.svelte';
	import DetailPanel from '$lib/components/event/DetailPanel.svelte';
	import OverviewCards from '$lib/components/app/OverviewCards.svelte';
	import TimelineChart from '$lib/components/charts/TimelineChart.svelte';
	import ServiceBreakdownChart from '$lib/components/charts/ServiceBreakdownChart.svelte';
	import SavedViews from '$lib/components/filter/SavedViews.svelte';
	import {
		theme,
		density,
		liveTailPaused,
		selectedEventId
	} from '$lib/stores/index.js';
	import { getResolvedTheme } from '$lib/stores/theme.js';

	let themeValue = $derived($theme);
	let densityValue = $derived($density);
	let livePaused = $derived($liveTailPaused);
	let selectedId = $derived($selectedEventId);
	let sidebarOpen = $state(true);

	function toggleTheme() {
		const next: 'light' | 'dark' | 'system' =
			themeValue === 'dark' ? 'light' : themeValue === 'light' ? 'system' : 'dark';
		theme.set(next);
	}

	function toggleDensity() {
		density.set(densityValue === 'comfortable' ? 'compact' : 'comfortable');
	}

	function toggleLiveTail() {
		liveTailPaused.set(!livePaused);
	}

	function applyThemeToDoc() {
		const resolved = getResolvedTheme(themeValue);
		document.documentElement.classList.toggle('dark', resolved === 'dark');
		document.documentElement.classList.toggle('light', resolved === 'light');
	}

	$effect(() => {
		applyThemeToDoc();
	});
</script>

<div class="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(200px,280px)_minmax(0,1fr)] grid-rows-[auto_1fr] min-h-screen bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
	<!-- Header -->
	<header
		class="col-span-full flex items-center justify-between gap-4 shrink-0 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-1.5"
	>
		<div class="flex items-center gap-3">
			<button
				type="button"
				class="lg:hidden p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
				aria-label="Toggle sidebar"
				onclick={() => (sidebarOpen = !sidebarOpen)}
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>
			<h1 class="text-lg font-semibold">Pulseboard</h1>
		</div>
		<div class="flex items-center gap-2">
			<SavedViews />
			<button
				type="button"
				class="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm"
				onclick={toggleTheme}
				aria-label="Toggle theme"
			>
				{themeValue === 'dark' ? 'Light' : themeValue === 'light' ? 'System' : 'Dark'}
			</button>
			<button
				type="button"
				class="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm"
				onclick={toggleDensity}
				aria-label="Toggle density"
			>
				{densityValue === 'compact' ? 'Comfortable' : 'Compact'}
			</button>
			<button
				type="button"
				class="flex items-center gap-2 px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm"
				onclick={toggleLiveTail}
				aria-label={livePaused ? 'Resume live tail' : 'Pause live tail'}
			>
				<span
					class="w-2 h-2 rounded-full {livePaused
						? 'bg-amber-500'
						: 'bg-emerald-500 animate-pulse'}"
				></span>
				{livePaused ? 'Paused' : 'Live'}
			</button>
		</div>
	</header>

	<!-- Sidebar -->
	<aside
		class="hidden lg:block border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-y-auto {sidebarOpen ? 'lg:flex' : 'lg:hidden'} flex-col w-full lg:w-auto lg:min-w-[200px] lg:max-w-[280px]"
		aria-label="Filters"
	>
		<FilterBuilder />
	</aside>
	{#if sidebarOpen}
		<div
			class="lg:hidden fixed inset-0 z-40 bg-black/50"
			aria-hidden="true"
			onclick={() => (sidebarOpen = false)}
		></div>
		<aside
			class="fixed left-0 top-0 bottom-0 z-50 w-[280px] max-w-[85vw] border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-y-auto lg:hidden"
			aria-label="Filters"
		>
			<FilterBuilder />
		</aside>
	{/if}

	<!-- Main -->
	<main class="flex flex-col min-h-0 overflow-hidden">
		<div class="p-2 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50">
			<OverviewCards />
		</div>
		<div class="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-2 p-2 flex-1 min-h-0">
			<div class="flex flex-col min-h-0">
				<div class="mb-2">
					<TimelineChart />
				</div>
				<div class="mb-2">
					<ServiceBreakdownChart />
				</div>
				<ActiveFilterChips />
				<div class="flex-1 min-h-0 flex flex-col rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
					<EventStream />
				</div>
			</div>
			{#if selectedId}
				<div class="min-w-0">
					<DetailPanel eventId={selectedId} />
				</div>
			{/if}
		</div>
	</main>
</div>
