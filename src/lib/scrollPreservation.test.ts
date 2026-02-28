import { describe, it, expect } from 'vitest';
import {
	computeScrollPreservation,
	type ScrollPreservationState,
	type ScrollAnchorItem
} from './scrollPreservation.js';

function makeItems(ids: string[]): ScrollAnchorItem[] {
	return ids.map((id) => ({ id }));
}

const ROW = 40;

const EMPTY_PREV: ScrollPreservationState = {
	anchorId: null,
	firstVisibleIndex: 0,
	scrollTop: 0,
	eventsLength: 0
};

describe('computeScrollPreservation', () => {
	it('returns no adjustment and zero state when list is empty', () => {
		const result = computeScrollPreservation({
			list: [],
			currentScrollTop: 100,
			estimatedRowHeight: ROW,
			prev: { ...EMPTY_PREV, eventsLength: 10 }
		});
		expect(result.shouldAdjust).toBe(false);
		expect(result.newScrollTop).toBeUndefined();
		expect(result.nextState.eventsLength).toBe(0);
		expect(result.nextState.anchorId).toBeNull();
	});

	it('returns no adjustment when there is no previous anchor', () => {
		const list = makeItems(['a', 'b', 'c']);
		const result = computeScrollPreservation({
			list,
			currentScrollTop: 40,
			estimatedRowHeight: ROW,
			prev: EMPTY_PREV
		});
		expect(result.shouldAdjust).toBe(false);
		expect(result.nextState.anchorId).toBe('b');
		expect(result.nextState.firstVisibleIndex).toBe(1);
		expect(result.nextState.scrollTop).toBe(40);
		expect(result.nextState.eventsLength).toBe(3);
	});

	it('uses firstVisibleIndexFromDOM when provided (variable row heights)', () => {
		const list = makeItems(['a', 'b', 'c', 'd', 'e']);
		// scrollTop 40 would imply index 1, but DOM says index 3 is at top (e.g. variable heights).
		const result = computeScrollPreservation({
			list,
			currentScrollTop: 40,
			estimatedRowHeight: ROW,
			prev: EMPTY_PREV,
			firstVisibleIndexFromDOM: 3
		});
		expect(result.shouldAdjust).toBe(false);
		expect(result.nextState.anchorId).toBe('d');
		expect(result.nextState.firstVisibleIndex).toBe(3);
	});

	it('returns no adjustment when list length unchanged', () => {
		const list = makeItems(['a', 'b', 'c']);
		const result = computeScrollPreservation({
			list,
			currentScrollTop: 80,
			estimatedRowHeight: ROW,
			prev: {
				anchorId: 'b',
				firstVisibleIndex: 1,
				scrollTop: 40,
				eventsLength: 3
			}
		});
		expect(result.shouldAdjust).toBe(false);
		expect(result.nextState.anchorId).toBe('c');
		expect(result.nextState.firstVisibleIndex).toBe(2);
		expect(result.nextState.scrollTop).toBe(80);
		expect(result.nextState.eventsLength).toBe(3);
	});

	it('adjusts scroll when items are prepended (anchor moves to higher index)', () => {
		const list = makeItems(['x', 'y', 'a', 'b', 'c', 'd']);
		const result = computeScrollPreservation({
			list,
			currentScrollTop: 80,
			estimatedRowHeight: ROW,
			prev: {
				anchorId: 'c',
				firstVisibleIndex: 2,
				scrollTop: 80,
				eventsLength: 4
			}
		});
		expect(result.shouldAdjust).toBe(true);
		expect(result.newScrollTop).toBe(80 + (4 - 2) * ROW);
		expect(result.newScrollTop).toBe(160);
		expect(result.nextState.anchorId).toBe('c');
		expect(result.nextState.firstVisibleIndex).toBe(4);
		expect(result.nextState.scrollTop).toBe(160);
		expect(result.nextState.eventsLength).toBe(6);
	});

	it('returns no adjustment when anchor not found in new list (e.g. filter changed)', () => {
		const list = makeItems(['x', 'y', 'z']);
		const result = computeScrollPreservation({
			list,
			currentScrollTop: 0,
			estimatedRowHeight: ROW,
			prev: {
				anchorId: 'gone',
				firstVisibleIndex: 5,
				scrollTop: 200,
				eventsLength: 10
			}
		});
		expect(result.shouldAdjust).toBe(false);
		expect(result.nextState.anchorId).toBe('x');
		expect(result.nextState.firstVisibleIndex).toBe(0);
		expect(result.nextState.scrollTop).toBe(0);
		expect(result.nextState.eventsLength).toBe(3);
	});

	it('returns no adjustment when anchor at same index', () => {
		const list = makeItems(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l']);
		const result = computeScrollPreservation({
			list,
			currentScrollTop: 200,
			estimatedRowHeight: ROW,
			prev: {
				anchorId: 'f',
				firstVisibleIndex: 5,
				scrollTop: 200,
				eventsLength: 10
			}
		});
		expect(result.shouldAdjust).toBe(false);
		expect(result.nextState.anchorId).toBe('f');
		expect(result.nextState.firstVisibleIndex).toBe(5);
	});

	it('clamps newScrollTop to non-negative when anchor moves to lower index', () => {
		const list = makeItems(['a', 'b', 'c']);
		const result = computeScrollPreservation({
			list,
			currentScrollTop: 400,
			estimatedRowHeight: ROW,
			prev: {
				anchorId: 'b',
				firstVisibleIndex: 10,
				scrollTop: 400,
				eventsLength: 20
			}
		});
		expect(result.shouldAdjust).toBe(true);
		expect(result.newScrollTop).toBe(40);
	});

	it('multiple prepends: state stays consistent after adjust', () => {
		let prev: ScrollPreservationState = EMPTY_PREV;
		let list = makeItems(['a', 'b', 'c']);
		let r = computeScrollPreservation({
			list,
			currentScrollTop: 80,
			estimatedRowHeight: ROW,
			prev
		});
		expect(r.shouldAdjust).toBe(false);
		prev = r.nextState;
		expect(prev.anchorId).toBe('c');
		expect(prev.firstVisibleIndex).toBe(2);
		expect(prev.scrollTop).toBe(80);
		expect(prev.eventsLength).toBe(3);

		list = makeItems(['x', 'y', 'a', 'b', 'c']);
		r = computeScrollPreservation({
			list,
			currentScrollTop: 80,
			estimatedRowHeight: ROW,
			prev
		});
		expect(r.shouldAdjust).toBe(true);
		expect(r.newScrollTop).toBe(80 + 2 * ROW);
		prev = r.nextState;
		expect(prev.anchorId).toBe('c');
		expect(prev.firstVisibleIndex).toBe(4);
		expect(prev.scrollTop).toBe(160);

		r = computeScrollPreservation({
			list,
			currentScrollTop: 160,
			estimatedRowHeight: ROW,
			prev
		});
		expect(r.shouldAdjust).toBe(false);
		expect(r.nextState.anchorId).toBe('c');
		expect(r.nextState.firstVisibleIndex).toBe(4);
		expect(r.nextState.scrollTop).toBe(160);
	});
});
