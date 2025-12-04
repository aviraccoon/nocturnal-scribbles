// Shared theme utilities - loaded before theme-init.js and theme.js
window.ThemeUtils = (() => {
	const cursedFonts = [
		"Comic Sans MS, cursive",
		"Papyrus, fantasy",
		"Impact, sans-serif",
		"Brush Script MT, cursive",
		"Lucida Handwriting, cursive",
		"Courier New, monospace",
		"Times New Roman, serif",
		"Arial Black, sans-serif",
		"Trebuchet MS, sans-serif",
		"fantasy",
	];

	// Every terrible font we can think of
	const geocitiesFonts = [
		// The classics
		"Comic Sans MS",
		"Papyrus",
		"Impact",
		"Jokerman",
		"Curlz MT",
		"Kristen ITC",
		// Script/handwriting nightmares
		"Brush Script MT",
		"Lucida Handwriting",
		"Bradley Hand",
		"Segoe Script",
		"Freestyle Script",
		"French Script MT",
		"Edwardian Script ITC",
		"Kunstler Script",
		"Palace Script MT",
		"Rage Italic",
		"Script MT Bold",
		"Vivaldi",
		"Vladimir Script",
		"Mistral",
		"Monotype Corsiva",
		// Display/decorative horrors
		"Copperplate",
		"Copperplate Gothic Bold",
		"Luminari",
		"Chalkduster",
		"Marker Felt",
		"Trattatello",
		"Party LET",
		"Jazz LET",
		"Herculanum",
		"Chalkboard",
		"Chalkboard SE",
		"Zapfino",
		"Snell Roundhand",
		"Apple Chancery",
		"Hoefler Text",
		// Novelty
		"Stencil",
		"Wide Latin",
		"Playbill",
		"Harrington",
		"Algerian",
		"Bauhaus 93",
		"Broadway",
		"Showcard Gothic",
		"Ravie",
		"Snap ITC",
		"Magneto",
		"Juice ITC",
		"Jokerman",
		// Oldstyle
		"Old English Text MT",
		"Blackadder ITC",
		"Castellar",
		"Engravers MT",
		"Forte",
		"Goudy Stout",
		"Imprint MT Shadow",
		"Informal Roman",
		"Matura MT Script Capitals",
		"Niagara Engraved",
		"Niagara Solid",
		"Parchment",
		"Rockwell Extra Bold",
		// Symbol fonts (actual chaos - NOT for content areas!)
		"Webdings",
		"Wingdings",
		"Wingdings 2",
		"Wingdings 3",
		"Symbol",
		"MT Extra",
		"Bookshelf Symbol 7",
		"Zapf Dingbats",
		// Monospace but make it weird
		"Courier New",
		"Lucida Console",
		"Consolas",
		"OCR A Extended",
		// Bold/heavy
		"Arial Black",
		"Franklin Gothic Heavy",
		"Haettenschweiler",
		"Elephant",
		"Felix Titling",
		"Bernard MT Condensed",
		// macOS specific
		"American Typewriter",
		"Baskerville",
		"Big Caslon",
		"Bodoni 72",
		"Cochin",
		"Didot",
		"Futura",
		"Gill Sans",
		"Helvetica Neue",
		"Optima",
		"Palatino",
		"Phosphate",
		"Rockwell",
		"Savoye LET",
		"SignPainter",
		"Skia",
		// Generic fallbacks for maximum chaos
		"cursive",
		"fantasy",
		"serif",
		"sans-serif",
		"monospace",
	];

	// Icon/symbol fonts that make text unreadable
	const iconFonts = [
		"Webdings",
		"Wingdings",
		"Wingdings 2",
		"Wingdings 3",
		"Symbol",
		"MT Extra",
		"Bookshelf Symbol 7",
		"Zapf Dingbats",
	];

	// Fonts safe for actual content (excludes icon fonts)
	const geocitiesReadableFonts = geocitiesFonts.filter(
		(f) => !iconFonts.includes(f),
	);

	const geocitiesBorders = [
		"dotted",
		"dashed",
		"double",
		"ridge",
		"groove",
		"outset",
		"inset",
	];

	function randomColor(alpha = 1) {
		const h = Math.floor(Math.random() * 360);
		const s = 60 + Math.floor(Math.random() * 40);
		const l = 30 + Math.floor(Math.random() * 40);
		return alpha < 1
			? `hsla(${h}, ${s}%, ${l}%, ${alpha})`
			: `hsl(${h}, ${s}%, ${l}%)`;
	}

	function randomBackground() {
		const roll = Math.random();
		if (roll < 0.3) {
			return randomColor();
		} else if (roll < 0.6) {
			const angle = Math.floor(Math.random() * 360);
			return `linear-gradient(${angle}deg, ${randomColor()}, ${randomColor()})`;
		} else if (roll < 0.8) {
			return `radial-gradient(${randomColor()}, ${randomColor()})`;
		} else {
			return randomColor(0.5 + Math.random() * 0.4);
		}
	}

	function applyShiftingColors(hue) {
		const root = document.documentElement;
		root.style.setProperty("--bg", `hsl(${hue}, 30%, 12%)`);
		root.style.setProperty("--text", `hsl(${(hue + 180) % 360}, 30%, 85%)`);
		root.style.setProperty(
			"--text-light",
			`hsl(${(hue + 180) % 360}, 20%, 65%)`,
		);
		root.style.setProperty("--accent", `hsl(${(hue + 60) % 360}, 80%, 65%)`);
		root.style.setProperty("--accent-contrast", `hsl(${hue}, 30%, 12%)`);
		root.style.setProperty("--border", `hsl(${hue}, 30%, 25%)`);
		root.style.setProperty("--code-bg", `hsl(${hue}, 25%, 18%)`);
		root.style.setProperty("--tag-bg", `hsl(${hue}, 25%, 20%)`);
		root.style.setProperty("--tag-bg-hover", `hsl(${hue}, 30%, 28%)`);
	}

	function applyChaosColors() {
		const hue1 = Math.floor(Math.random() * 360);
		const hue2 = (hue1 + 120 + Math.floor(Math.random() * 120)) % 360;
		const light1 = Math.random() > 0.5;
		const root = document.documentElement;
		root.style.setProperty("--bg", `hsl(${hue1}, 70%, ${light1 ? 85 : 15}%)`);
		root.style.setProperty("--text", `hsl(${hue2}, 80%, ${light1 ? 20 : 85}%)`);
		root.style.setProperty(
			"--text-light",
			`hsl(${hue2}, 60%, ${light1 ? 35 : 70}%)`,
		);
		root.style.setProperty("--accent", `hsl(${(hue1 + 180) % 360}, 90%, 50%)`);
		root.style.setProperty(
			"--accent-contrast",
			`hsl(${hue1}, 70%, ${light1 ? 85 : 15}%)`,
		);
		root.style.setProperty(
			"--border",
			`hsl(${hue1}, 50%, ${light1 ? 70 : 30}%)`,
		);
		root.style.setProperty(
			"--code-bg",
			`hsl(${hue1}, 60%, ${light1 ? 75 : 25}%)`,
		);
		root.style.setProperty(
			"--tag-bg",
			`hsl(${hue1}, 50%, ${light1 ? 80 : 20}%)`,
		);
		root.style.setProperty(
			"--tag-bg-hover",
			`hsl(${hue1}, 50%, ${light1 ? 70 : 30}%)`,
		);
	}

	function pick(arr) {
		return arr[Math.floor(Math.random() * arr.length)];
	}

	// Random number in range
	function rand(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	// Random float in range
	function randFloat(min, max) {
		return Math.random() * (max - min) + min;
	}

	/**
	 * Start shifting theme animation.
	 * Returns interval ID so caller can store it for cleanup.
	 */
	function startShifting() {
		let hue = rand(0, 359);
		applyShiftingColors(hue);
		const prefersReducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		if (prefersReducedMotion) {
			return null;
		}
		return setInterval(() => {
			hue = (hue + 1) % 360;
			applyShiftingColors(hue);
		}, 100);
	}

	/**
	 * Apply cursed theme styles.
	 * @param {HTMLElement|null} body - document.body, or null if not yet available
	 */
	function applyCursedStyles(body) {
		applyChaosColors();
		const font = pick(cursedFonts);
		if (body) {
			body.style.fontFamily = font;
		} else {
			document.addEventListener("DOMContentLoaded", () => {
				document.body.style.fontFamily = font;
			});
		}
		const radius = rand(0, 29);
		const shadowX = rand(-5, 4);
		const shadowY = rand(-5, 4);
		const shadowColor = `hsl(${rand(0, 359)}, 80%, 40%)`;
		document.documentElement.style.setProperty("--radius", `${radius}px`);
		document.documentElement.style.setProperty(
			"--shadow",
			`${shadowX}px ${shadowY}px 0 ${shadowColor}`,
		);
	}

	return {
		cursedFonts,
		geocitiesFonts,
		geocitiesReadableFonts,
		geocitiesBorders,
		randomColor,
		randomBackground,
		applyShiftingColors,
		applyChaosColors,
		startShifting,
		applyCursedStyles,
		pick,
		rand,
		randFloat,
	};
})();
