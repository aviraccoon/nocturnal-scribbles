// Type declarations for browser scripts

interface ThemeUtils {
	cursedFonts: string[];
	geocitiesPatterns: string[];
	randomColor: (alpha?: number) => string;
	randomBackground: () => string;
	applyShiftingColors: (hue: number) => void;
	applyChaosColors: () => void;
	startShifting: () => ReturnType<typeof setInterval> | null;
	applyCursedStyles: (body: HTMLElement | null) => void;
	applyGeocitiesPlaceholder: () => void;
	revealGeocitiesContent: () => void;
	pick: <const T>(arr: readonly T[]) => T;
	rand: (min: number, max: number) => number;
	randFloat: (min: number, max: number) => number;
}

interface GeocitiesMusic {
	musicGen: unknown;
	addMusicPlayer: (statusBarOffsets: {
		top: number;
		bottom: number;
		left: number;
		right: number;
	}) => void;
}

declare global {
	interface Window {
		ThemeUtils: ThemeUtils;
		__initialTheme?: string;
		applyGeocitiesTheme?: () => void;
		addMusicPlayerStandalone?: () => void;
		GeocitiesMusic?: GeocitiesMusic;
	}
}

export {};
