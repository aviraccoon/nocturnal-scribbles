// Theme switcher - handles button clicks and theme application
// Depends on theme-shared.js being loaded first

const DEFAULT_THEME = "system";
const T = window.ThemeUtils;
const buttons =
	document.querySelectorAll<HTMLButtonElement>("[data-theme-btn]");
let currentTheme = localStorage.getItem("theme") || DEFAULT_THEME;
const chaosVars = [
	"--bg",
	"--text",
	"--accent",
	"--border",
	"--code-bg",
	"--tag-bg",
	"--text-light",
	"--tag-bg-hover",
	"--accent-contrast",
];
// Injected at build time from data-meta attributes in base.html
const metaThemes = "__META_THEMES__".split(",");
let shiftingInterval: ReturnType<typeof setInterval> | null = null;

function getShuffleThemes() {
	return Array.from(buttons)
		.map((btn) => btn.dataset.themeBtn)
		.filter((t) => t && !metaThemes.includes(t));
}

function clearChaosStyles() {
	const root = document.documentElement;
	for (const v of chaosVars) {
		root.style.removeProperty(v);
	}
	document.body.style.removeProperty("font-family");
	root.style.removeProperty("--radius");
	root.style.removeProperty("--shadow");
	if (shiftingInterval) {
		clearInterval(shiftingInterval);
		shiftingInterval = null;
	}
}

// Geocities is loaded dynamically to keep the main bundle small
let geocitiesLoading: Promise<unknown> | null = null;
const GEOCITIES_TIMEOUT = 5000;

function loadScript(src: string) {
	return new Promise<unknown>((resolve, reject) => {
		const script = document.createElement("script");
		script.src = src;
		script.onload = resolve;
		script.onerror = reject;
		document.head.appendChild(script);
	});
}

function loadGeocities() {
	if (window.applyGeocitiesTheme) {
		return Promise.resolve();
	}
	if (geocitiesLoading) {
		return geocitiesLoading;
	}
	// Load bundled geocities theme (includes music player)
	geocitiesLoading = loadScript("/static/geocities.js");

	// Timeout fallback in case scripts hang
	const timeoutPromise = new Promise((_, reject) => {
		setTimeout(() => {
			if (!window.applyGeocitiesTheme) {
				reject(new Error("Geocities load timeout"));
			}
		}, GEOCITIES_TIMEOUT);
	});

	geocitiesLoading = Promise.race([geocitiesLoading, timeoutPromise]);
	return geocitiesLoading;
}

function applyGeocitiesWithFallback() {
	loadGeocities()
		.then(() => window.applyGeocitiesTheme?.())
		.catch(() => {
			// Script failed or timed out - reveal content anyway
			// Background is already applied via placeholder
			T.revealGeocitiesContent();
		});
}

function applyTheme(theme: string) {
	clearChaosStyles();
	if (theme === DEFAULT_THEME) {
		document.documentElement.removeAttribute("data-theme");
	} else if (theme === "chaos") {
		document.documentElement.removeAttribute("data-theme");
		T.applyChaosColors();
	} else if (theme === "shifting") {
		document.documentElement.removeAttribute("data-theme");
		shiftingInterval = T.startShifting();
	} else if (theme === "cursed") {
		document.documentElement.setAttribute("data-theme", "cursed");
		T.applyCursedStyles(document.body);
	} else if (theme === "geocities") {
		document.documentElement.removeAttribute("data-theme");
		T.applyGeocitiesPlaceholder();
		applyGeocitiesWithFallback();
	} else if (theme === "shuffle") {
		const themes = getShuffleThemes();
		const picked =
			themes[Math.floor(Math.random() * themes.length)] ?? DEFAULT_THEME;
		document.documentElement.setAttribute("data-theme", picked);
	} else {
		document.documentElement.setAttribute("data-theme", theme);
	}
}

function updateButtons(activeTheme: string) {
	buttons.forEach((btn) => {
		const btnTheme = btn.dataset.themeBtn;
		const variants = btn.dataset.themeVariants?.split(",") || [];
		const isActive = btnTheme === activeTheme || variants.includes(activeTheme);
		btn.classList.toggle("active", isActive);
	});
}

updateButtons(currentTheme);

// Apply geocities on page load if it's the current theme
// Placeholder is already applied in theme-init.js
if (currentTheme === "geocities") {
	applyGeocitiesWithFallback();
}

buttons.forEach((btn) => {
	btn.addEventListener("click", () => {
		const wasGeocities = currentTheme === "geocities";
		let theme = btn.dataset.themeBtn ?? DEFAULT_THEME;
		const variants = btn.dataset.themeVariants?.split(",") || [];
		if (variants.length > 0) {
			const currentIndex = variants.indexOf(currentTheme);
			if (currentIndex !== -1) {
				theme = variants[(currentIndex + 1) % variants.length] ?? DEFAULT_THEME;
			} else {
				theme =
					variants[Math.floor(Math.random() * variants.length)] ??
					DEFAULT_THEME;
			}
		}
		currentTheme = theme ?? DEFAULT_THEME;
		localStorage.setItem("theme", theme);
		// Geocities applies inline styles everywhere, reload to clean up
		if (wasGeocities && theme !== "geocities") {
			location.reload();
			return;
		}
		applyTheme(theme);
		updateButtons(theme);
		updateMusicToggleVisibility();
	});
});

// Music player toggle (hidden when geocities theme is active)
const musicToggleContainer = document.getElementById("music-toggle-container");
const musicToggleCheckbox = document.getElementById(
	"music-toggle",
) as HTMLInputElement | null;
let musicLoading: Promise<unknown> | null = null;
let musicPlayerActive = false;

function updateMusicToggleVisibility() {
	if (!musicToggleContainer) return;
	// Hide when geocities is active (it has its own player)
	musicToggleContainer.classList.toggle("hidden", currentTheme === "geocities");
}

function loadMusicPlayer() {
	if (window.addMusicPlayerStandalone) {
		return Promise.resolve();
	}
	if (musicLoading) {
		return musicLoading;
	}
	musicLoading = loadScript("/static/music.js");
	return musicLoading;
}

function enableMusicPlayer() {
	if (musicPlayerActive) return;
	loadMusicPlayer()
		.then(() => {
			window.addMusicPlayerStandalone?.();
			musicPlayerActive = true;
		})
		.catch((err) => {
			console.error("Failed to load music player:", err);
			if (musicToggleCheckbox) musicToggleCheckbox.checked = false;
		});
}

// Initialize music toggle state
updateMusicToggleVisibility();

// Restore music preference (but not if geocities is active)
if (musicToggleCheckbox) {
	const musicEnabled = localStorage.getItem("musicPlayer") === "true";
	musicToggleCheckbox.checked = musicEnabled;

	if (musicEnabled && currentTheme !== "geocities") {
		enableMusicPlayer();
	}

	musicToggleCheckbox.addEventListener("change", () => {
		const enabled = musicToggleCheckbox.checked;

		if (enabled) {
			localStorage.setItem("musicPlayer", "true");
			enableMusicPlayer();
		} else {
			localStorage.removeItem("musicPlayer");
			// Reload to remove the player (it injects DOM elements)
			location.reload();
		}
	});
}
