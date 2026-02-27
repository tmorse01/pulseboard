/**
 * Svelte action: close when clicking outside the node or pressing Escape.
 * Only attaches listeners when `open` is true.
 */
export function clickOutside(
	node: HTMLElement,
	params: { open: boolean; onClose: () => void }
) {
	let { open, onClose } = params;

	function handleClick(e: MouseEvent) {
		if (node && !node.contains(e.target as Node)) onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

	function attach() {
		document.addEventListener('click', handleClick, true);
		document.addEventListener('keydown', handleKeydown, true);
	}

	function detach() {
		document.removeEventListener('click', handleClick, true);
		document.removeEventListener('keydown', handleKeydown, true);
	}

	if (open) attach();

	return {
		update(next: { open: boolean; onClose: () => void }) {
			const wasOpen = open;
			open = next.open;
			onClose = next.onClose;
			if (wasOpen && !open) detach();
			else if (!wasOpen && open) attach();
		},
		destroy() {
			if (open) detach();
		}
	};
}
