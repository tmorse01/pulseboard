/**
 * Pure logic for preserving scroll position when a list is updated (e.g. new items
 * prepended). Used so the same "anchor" item stays in view. Testable without DOM.
 */

export interface ScrollAnchorItem {
	id: string;
}

export interface ScrollPreservationState {
	anchorId: string | null;
	firstVisibleIndex: number;
	scrollTop: number;
	eventsLength: number;
}

export interface ScrollPreservationInput {
	/** Current list (newest-first order). */
	list: ScrollAnchorItem[];
	/** Current scroll position of the viewport. */
	currentScrollTop: number;
	/** Assumed row height for index-from-scroll calculation. */
	estimatedRowHeight: number;
	/** State from the previous tick. */
	prev: ScrollPreservationState;
	/**
	 * When set, use this as the first visible index instead of deriving from scrollTop.
	 * Typically supplied from the virtual list (e.g. virtua VListHandle.findStartIndex()).
	 */
	firstVisibleIndexFromDOM?: number;
}

export interface ScrollPreservationResult {
	/** True if we should set viewport.scrollTop to newScrollTop (e.g. in rAF). */
	shouldAdjust: boolean;
	/** Target scroll position when shouldAdjust is true. */
	newScrollTop?: number;
	/** State to use for the next tick. */
	nextState: ScrollPreservationState;
}

/**
 * Compute whether to adjust scroll and the next state.
 * When new items are prepended, the same anchor moves to a higher index;
 * we compensate by increasing scrollTop so that anchor stays at the same visual position.
 */
export function computeScrollPreservation(
	input: ScrollPreservationInput
): ScrollPreservationResult {
	const { list, currentScrollTop, estimatedRowHeight, prev, firstVisibleIndexFromDOM } = input;

	if (list.length === 0) {
		return {
			shouldAdjust: false,
			nextState: {
				anchorId: null,
				firstVisibleIndex: 0,
				scrollTop: currentScrollTop,
				eventsLength: 0
			}
		};
	}

	const firstVisibleIndex =
		firstVisibleIndexFromDOM != null
			? Math.max(0, Math.min(list.length - 1, firstVisibleIndexFromDOM))
			: Math.max(0, Math.min(list.length - 1, Math.floor(currentScrollTop / estimatedRowHeight)));
	const anchorId = list[firstVisibleIndex]?.id ?? null;

	const lengthChanged =
		prev.anchorId != null && prev.eventsLength > 0 && list.length !== prev.eventsLength;

	if (lengthChanged) {
		const newIndex = list.findIndex((e) => e.id === prev.anchorId!);
		if (newIndex >= 0 && newIndex !== prev.firstVisibleIndex) {
			const delta = (newIndex - prev.firstVisibleIndex) * estimatedRowHeight;
			const newScrollTop = Math.max(0, prev.scrollTop + delta);
			return {
				shouldAdjust: true,
				newScrollTop,
				nextState: {
					anchorId: prev.anchorId,
					firstVisibleIndex: newIndex,
					scrollTop: newScrollTop,
					eventsLength: list.length
				}
			};
		}
	}

	// No adjustment: use current viewport as the new anchor state
	return {
		shouldAdjust: false,
		nextState: {
			anchorId,
			firstVisibleIndex,
			scrollTop: currentScrollTop,
			eventsLength: list.length
		}
	};
}
