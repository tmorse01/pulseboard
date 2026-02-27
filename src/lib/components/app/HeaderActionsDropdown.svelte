<script lang="ts">
	import { theme, density, liveTailPaused } from '$lib/stores/index.js';
	import { getResolvedTheme } from '$lib/stores/theme.js';
	import { clickOutside } from '$lib/utils/clickOutside.js';
	import type { Theme } from '$lib/stores/theme.js';
	import type { Density } from '$lib/stores/filterState.js';
	import { SlidersHorizontal, Sun, Rows3, Radio } from '@lucide/svelte';

	let open = $state(false);

	let themeValue = $derived($theme);
	let densityValue = $derived($density);
	let livePaused = $derived($liveTailPaused);

	function toggleTheme() {
		const next: Theme =
			themeValue === 'dark' ? 'light' : themeValue === 'light' ? 'system' : 'dark';
		theme.set(next);
	}

	function toggleDensity() {
		density.set(densityValue === 'comfortable' ? 'compact' : 'comfortable');
	}

	function toggleLiveTail() {
		liveTailPaused.set(!livePaused);
	}
</script>

<div class="relative" use:clickOutside={{ open, onClose: () => (open = false) }}>
	<button
		type="button"
		class="flex items-center gap-2 px-3 py-1.5 rounded border border-border-default hover:bg-hover-surface text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
		onclick={() => (open = !open)}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label="Actions"
	>
		<SlidersHorizontal class="w-4 h-4 shrink-0" aria-hidden="true" />
		<span class="hidden md:inline">Actions</span>
	</button>
	{#if open}
		<div
			class="absolute right-0 top-full mt-1 w-56 rounded border border-border-default bg-surface-2 shadow-lg z-50 py-2"
			role="menu"
		>
			<button
				type="button"
				role="menuitem"
				class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-hover-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset"
				onclick={toggleTheme}
			>
				<span class="flex items-center gap-2">
					<Sun class="w-4 h-4 shrink-0 text-text-muted" aria-hidden="true" />
					Theme
				</span>
				<span class="text-text-muted">{themeValue}</span>
			</button>
			<button
				type="button"
				role="menuitem"
				class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-hover-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset"
				onclick={toggleDensity}
			>
				<span class="flex items-center gap-2">
					<Rows3 class="w-4 h-4 shrink-0 text-text-muted" aria-hidden="true" />
					Density
				</span>
				<span class="text-text-muted capitalize">{densityValue}</span>
			</button>
			<button
				type="button"
				role="menuitem"
				class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-hover-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset"
				onclick={toggleLiveTail}
				aria-label={livePaused ? 'Resume live tail' : 'Pause live tail'}
			>
				<span class="flex items-center gap-2">
					<Radio class="w-4 h-4 shrink-0 text-text-muted" aria-hidden="true" />
					Live tail
				</span>
				<span class="flex items-center gap-1.5">
					<span
						class="w-2 h-2 rounded-full {livePaused
							? 'bg-amber-500'
							: 'bg-live-pulse animate-pulse'}"
					></span>
					{livePaused ? 'Paused' : 'Live'}
				</span>
			</button>
		</div>
	{/if}
</div>
