import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'pulseboard-theme';

function loadTheme(): Theme {
	if (typeof localStorage === 'undefined') return 'system';
	const s = localStorage.getItem(STORAGE_KEY);
	if (s === 'light' || s === 'dark' || s === 'system') return s;
	return 'system';
}

function createThemeStore() {
	const { subscribe, set } = writable<Theme>(loadTheme());

	return {
		subscribe,
		set: (value: Theme) => {
			if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, value);
			set(value);
		}
	};
}

export const theme = createThemeStore();

export function getResolvedTheme(current: Theme): 'light' | 'dark' {
	if (current === 'system' && typeof window !== 'undefined') {
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}
	return current === 'system' ? 'dark' : current;
}
