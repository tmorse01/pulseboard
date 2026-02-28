<script lang="ts">
	/**
	 * Custom scrollbar that keeps the thumb under the cursor during drag.
	 * Prevents the mouse from "outrunning" the thumb on very long lists.
	 */

	interface Props {
		/** The scrollable element (e.g. VList root). */
		container: HTMLDivElement | null;
		/** Current scroll offset (from parent so we stay in sync when not dragging). */
		scrollTop: number;
	}

	let { container, scrollTop: scrollTopProp }: Props = $props();

	const MIN_THUMB_PX = 40;
	const TRACK_WIDTH_PX = 10;

	let scrollHeight = $state(0);
	let clientHeight = $state(0);
	let trackHeight = $state(0);
	let trackEl = $state<HTMLDivElement | null>(null);
	let dragging = $state(false);
	let dragOffsetY = $state(0); // offset within thumb where user grabbed

	const maxScroll = $derived(Math.max(0, scrollHeight - clientHeight));
	const thumbHeight = $derived.by(() => {
		if (scrollHeight <= 0) return MIN_THUMB_PX;
		const proportional = (clientHeight / scrollHeight) * trackHeight;
		return Math.max(MIN_THUMB_PX, Math.min(trackHeight, proportional));
	});
	const thumbTop = $derived.by(() => {
		if (maxScroll <= 0) return 0;
		return (scrollTopProp / maxScroll) * (trackHeight - thumbHeight);
	});

	function updateDimensions() {
		if (!container) return;
		scrollHeight = container.scrollHeight;
		clientHeight = container.clientHeight;
		if (trackEl) {
			trackHeight = trackEl.clientHeight;
		}
	}

	function onThumbPointerDown(e: PointerEvent) {
		if (!trackEl || !container) return;
		e.preventDefault();
		const rect = trackEl.getBoundingClientRect();
		const thumbTopNow = (scrollTopProp / maxScroll) * (trackHeight - thumbHeight);
		dragOffsetY = e.clientY - rect.top - thumbTopNow;
		dragging = true;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onThumbPointerMove(e: PointerEvent) {
		if (!dragging || !trackEl || !container) return;
		const rect = trackEl.getBoundingClientRect();
		const thumbTopTarget = e.clientY - rect.top - dragOffsetY;
		const travel = trackHeight - thumbHeight;
		if (travel <= 0) return;
		const t = Math.max(0, Math.min(1, thumbTopTarget / travel));
		container.scrollTop = t * maxScroll;
	}

	function onThumbPointerUp(e: PointerEvent) {
		dragging = false;
		(e.target as HTMLElement).releasePointerCapture(e.pointerId);
	}

	function onTrackClick(e: MouseEvent) {
		if (!container || !trackEl || (e.target as HTMLElement).closest('[data-thumb]')) return;
		const rect = trackEl.getBoundingClientRect();
		const y = e.clientY - rect.top;
		const travel = trackHeight - thumbHeight;
		if (travel <= 0) return;
		const t = Math.max(0, Math.min(1, y / travel));
		container.scrollTop = t * maxScroll;
	}

	$effect(() => {
		const el = container;
		if (!el) return;
		updateDimensions();
		const ro = new ResizeObserver(updateDimensions);
		ro.observe(el);
		el.addEventListener('scroll', updateDimensions);
		return () => {
			ro.disconnect();
			el.removeEventListener('scroll', updateDimensions);
		};
	});

	$effect(() => {
		if (!trackEl || !container) return;
		updateDimensions();
		const ro = new ResizeObserver(updateDimensions);
		ro.observe(trackEl);
		return () => ro.disconnect();
	});
</script>

{#if container && scrollHeight > clientHeight}
	<div
		role="scrollbar"
		aria-orientation="vertical"
		aria-controls="event-list-scroll"
		aria-valuenow={maxScroll > 0 ? Math.round((scrollTopProp / maxScroll) * 100) : 0}
		aria-valuemin={0}
		aria-valuemax={100}
		tabindex="0"
		class="shrink-0 touch-none select-none self-stretch"
		style="width: {TRACK_WIDTH_PX}px;"
		bind:this={trackEl}
		onclick={onTrackClick}
		onkeydown={(e) => {
			if (!container) return;
			if (e.key === 'Home') container.scrollTop = 0;
			else if (e.key === 'End') container.scrollTop = maxScroll;
			else if (e.key === 'ArrowUp') container.scrollTop = Math.max(0, container.scrollTop - 40);
			else if (e.key === 'ArrowDown') container.scrollTop = Math.min(maxScroll, container.scrollTop + 40);
		}}
	>
		<div
			class="relative w-full rounded-full bg-border-soft"
			style="height: 100%; min-height: 80px;"
		>
			<div
				data-thumb
				role="slider"
				aria-orientation="vertical"
				aria-valuenow={maxScroll > 0 ? Math.round((scrollTopProp / maxScroll) * 100) : 0}
				aria-valuemin={0}
				aria-valuemax={100}
				tabindex="-1"
				class="absolute left-0 w-full rounded-full bg-border-default transition-colors hover:bg-text-faint active:bg-text-muted cursor-grab active:cursor-grabbing"
				style="top: {thumbTop}px; height: {thumbHeight}px;"
				onpointerdown={onThumbPointerDown}
				onpointermove={onThumbPointerMove}
				onpointerup={onThumbPointerUp}
				onpointercancel={onThumbPointerUp}
			></div>
		</div>
	</div>
{/if}
