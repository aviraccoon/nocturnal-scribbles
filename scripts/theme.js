// Theme switcher - handles button clicks and theme application
// Depends on theme-shared.js being loaded first
(() => {
	const T = window.ThemeUtils;
	const buttons = document.querySelectorAll("[data-theme-btn]");
	let currentTheme = localStorage.getItem("theme") || "system";
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
	let shiftingInterval = null;

	function getShuffleThemes() {
		return Array.from(buttons)
			.map((btn) => btn.dataset.themeBtn)
			.filter((t) => !metaThemes.includes(t));
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
	let geocitiesLoading = null;
	function loadGeocities() {
		if (window.applyGeocitiesTheme) {
			return Promise.resolve();
		}
		if (geocitiesLoading) {
			return geocitiesLoading;
		}
		geocitiesLoading = new Promise((resolve) => {
			const script = document.createElement("script");
			script.src = "/static/theme-geocities.js";
			script.onload = resolve;
			document.head.appendChild(script);
		});
		return geocitiesLoading;
	}

	function applyTheme(theme) {
		clearChaosStyles();
		if (theme === "system") {
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
			loadGeocities().then(() => window.applyGeocitiesTheme());
		} else if (theme === "shuffle") {
			const themes = getShuffleThemes();
			const picked = themes[Math.floor(Math.random() * themes.length)];
			document.documentElement.setAttribute("data-theme", picked);
		} else {
			document.documentElement.setAttribute("data-theme", theme);
		}
	}

	function updateButtons(activeTheme) {
		buttons.forEach((btn) => {
			const btnTheme = btn.dataset.themeBtn;
			const variants = btn.dataset.themeVariants?.split(",") || [];
			const isActive =
				btnTheme === activeTheme || variants.includes(activeTheme);
			btn.classList.toggle("active", isActive);
		});
	}

	updateButtons(currentTheme);

	// Apply geocities on page load if it's the current theme
	if (currentTheme === "geocities") {
		loadGeocities().then(() => window.applyGeocitiesTheme());
	}

	buttons.forEach((btn) => {
		btn.addEventListener("click", () => {
			const wasGeocities = currentTheme === "geocities";
			let theme = btn.dataset.themeBtn;
			const variants = btn.dataset.themeVariants?.split(",") || [];
			if (variants.length > 0) {
				const currentIndex = variants.indexOf(currentTheme);
				if (currentIndex !== -1) {
					theme = variants[(currentIndex + 1) % variants.length];
				} else {
					theme = variants[Math.floor(Math.random() * variants.length)];
				}
			}
			currentTheme = theme;
			localStorage.setItem("theme", theme);
			// Geocities applies inline styles everywhere, reload to clean up
			if (wasGeocities && theme !== "geocities") {
				location.reload();
				return;
			}
			applyTheme(theme);
			updateButtons(theme);
		});
	});
})();
