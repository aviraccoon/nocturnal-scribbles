// Geocities theme - lazy loaded only when needed
// Depends on theme-shared.js being loaded first
(() => {
	const T = window.ThemeUtils;

	const geocitiesTooltips = [
		"Welcome to my homepage!!!",
		"Under construction!!!",
		"Best viewed in 800x600",
		"Sign my guestbook!",
		"Made with Notepad",
		"This page is Y2K compliant!",
		"Netscape Navigator 4.0+ recommended",
		"Get Internet Explorer FREE!",
		"AOL Keyword: awesome",
		"Add me to your bookmarks!",
		"Click here for MIDI music!",
		"No right-click allowed!!!",
		"This site is frames-free!",
		"Optimized for 56k modem",
		"Java-enhanced experience!",
		"Created with Microsoft FrontPage",
		"Best viewed with eyes closed",
		"Powered by GeoCities!",
		"Member of the Raccoon WebRing",
		"FREE hit counter!",
		"Download Netscape NOW!",
		"This page uses DHTML!",
		"Enhanced for IE 4.0",
		"JavaScript required",
		"Shockwave Flash inside!",
	];

	const cursors = [
		"crosshair",
		"help",
		"wait",
		"cell",
		"move",
		"not-allowed",
		"grab",
		"zoom-in",
		"zoom-out",
		"pointer",
		"progress",
		"text",
		"vertical-text",
		"alias",
		"copy",
		"no-drop",
		"all-scroll",
		"col-resize",
		"row-resize",
		"n-resize",
		"e-resize",
		"s-resize",
		"w-resize",
		"ne-resize",
		"nw-resize",
		"se-resize",
		"sw-resize",
	];

	const filters = [
		"blur(0.5px)",
		"blur(1px)",
		"saturate(200%)",
		"saturate(50%)",
		"contrast(150%)",
		"contrast(75%)",
		"brightness(120%)",
		"brightness(80%)",
		"sepia(50%)",
		"sepia(100%)",
		"hue-rotate(90deg)",
		"hue-rotate(180deg)",
		"hue-rotate(270deg)",
		"invert(100%)",
		"grayscale(100%)",
	];

	// Filters safe for large containers (no blur)
	const safeFilters = [
		"saturate(200%)",
		"saturate(50%)",
		"contrast(120%)",
		"contrast(85%)",
		"brightness(110%)",
		"brightness(90%)",
		"sepia(30%)",
		"hue-rotate(30deg)",
		"hue-rotate(60deg)",
	];

	const blendModes = [
		"multiply",
		"screen",
		"overlay",
		"darken",
		"lighten",
		"color-dodge",
		"color-burn",
		"hard-light",
		"soft-light",
		"difference",
		"exclusion",
		"hue",
		"saturation",
		"color",
		"luminosity",
	];

	function injectGeocitiesStyles() {
		const style = document.createElement("style");
		style.id = "geocities-styles";
		style.textContent = `
			@keyframes geocities-blink {
				0%, 49% { opacity: 1; }
				50%, 100% { opacity: 0; }
			}
			@keyframes geocities-spin {
				to { transform: rotate(360deg); }
			}
			@keyframes geocities-bounce {
				0%, 100% { transform: translateY(0); }
				50% { transform: translateY(-10px); }
			}
			@keyframes geocities-rainbow {
				0% { color: red; }
				14% { color: orange; }
				28% { color: yellow; }
				42% { color: green; }
				57% { color: blue; }
				71% { color: indigo; }
				85% { color: violet; }
				100% { color: red; }
			}
			@keyframes geocities-glow {
				0%, 100% { text-shadow: 0 0 5px currentColor; }
				50% { text-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
			}
			@keyframes geocities-pulse {
				0%, 100% { transform: scale(1); }
				50% { transform: scale(1.05); }
			}
			@keyframes geocities-shake {
				0%, 100% { transform: translateX(0); }
				25% { transform: translateX(-3px) rotate(-1deg); }
				75% { transform: translateX(3px) rotate(1deg); }
			}
			@keyframes geocities-wiggle {
				0%, 100% { transform: rotate(-3deg); }
				50% { transform: rotate(3deg); }
			}
			@keyframes geocities-color-cycle {
				0% { background-color: red; }
				16% { background-color: orange; }
				33% { background-color: yellow; }
				50% { background-color: green; }
				66% { background-color: blue; }
				83% { background-color: purple; }
				100% { background-color: red; }
			}
			@keyframes geocities-gradient-shift {
				0% { background-position: ${T.rand(0, 50)}% ${T.rand(0, 50)}%; }
				50% { background-position: ${T.rand(50, 100)}% ${T.rand(50, 100)}%; }
				100% { background-position: ${T.rand(0, 50)}% ${T.rand(0, 50)}%; }
			}
			.geocities-blink { animation: geocities-blink 1s step-end infinite; }
			.geocities-spin { animation: geocities-spin 2s linear infinite; display: inline-block; }
			.geocities-bounce { animation: geocities-bounce 0.5s ease-in-out infinite; display: inline-block; }
			.geocities-rainbow { animation: geocities-rainbow 3s linear infinite; }
			.geocities-glow { animation: geocities-glow 1.5s ease-in-out infinite; }
			.geocities-pulse { animation: geocities-pulse 1s ease-in-out infinite; }
			.geocities-shake { animation: geocities-shake 0.3s ease-in-out infinite; }
			.geocities-wiggle { animation: geocities-wiggle 0.5s ease-in-out infinite; display: inline-block; }
			.geocities-color-cycle { animation: geocities-color-cycle 5s linear infinite; }
			.geocities-gradient-shift {
				background-size: 200% 200%;
				animation: geocities-gradient-shift 8s ease infinite;
			}
			.geocities-lens-flare {
				position: fixed;
				pointer-events: none;
				z-index: 9998;
				border-radius: 50%;
				mix-blend-mode: screen;
				transition: transform 0.1s ease-out;
			}
			.geocities-entry {
				animation: geocities-entry 0.8s ease-out forwards;
			}
			@keyframes geocities-entry {
				from {
					opacity: 0;
					transform: var(--entry-transform);
				}
				to {
					opacity: 1;
					transform: none;
				}
			}
			.geocities-status-bar {
				position: fixed;
				bottom: 0;
				left: 0;
				right: 0;
				font-family: "MS Sans Serif", "Segoe UI", Tahoma, sans-serif;
				font-size: 12px;
				padding: 2px 4px;
				z-index: 9999;
			}
			.geocities-status-bar marquee {
				display: block;
			}
			/* Styled scrollbars - random every reload */
			::-webkit-scrollbar {
				width: ${T.rand(12, 25)}px;
				height: ${T.rand(12, 25)}px;
			}
			::-webkit-scrollbar-track {
				background: ${T.pick([
					`linear-gradient(${T.rand(0, 360)}deg, ${T.randomColor()}, ${T.randomColor()})`,
					`repeating-linear-gradient(${T.rand(0, 90)}deg, ${T.randomColor()} 0px, ${T.randomColor()} 5px, ${T.randomColor()} 5px, ${T.randomColor()} 10px)`,
					T.randomColor(),
					`radial-gradient(${T.randomColor()}, ${T.randomColor()})`,
				])};
			}
			::-webkit-scrollbar-thumb {
				background: ${T.pick([
					`linear-gradient(${T.rand(0, 360)}deg, ${T.randomColor()}, ${T.randomColor()}, ${T.randomColor()})`,
					T.randomColor(),
					`repeating-linear-gradient(45deg, ${T.randomColor()} 0px, ${T.randomColor()} 3px, ${T.randomColor()} 3px, ${T.randomColor()} 6px)`,
				])};
				border: ${T.rand(2, 5)}px ${T.pick(T.geocitiesBorders)} ${T.randomColor()};
				border-radius: ${T.rand(0, 10)}px;
			}
			::-webkit-scrollbar-thumb:hover {
				background: ${T.randomColor()};
			}
			::-webkit-scrollbar-corner {
				background: ${T.randomColor()};
			}
			/* Firefox scrollbar */
			* {
				scrollbar-width: auto;
				scrollbar-color: ${T.randomColor()} ${T.randomColor()};
			}
			/* Random selection colors per refresh */
			::selection {
				background: ${T.randomColor()};
				color: ${T.randomColor()};
			}
			/* Cursed tooltips */
			.tooltip {
				background: ${T.randomBackground()} !important;
				color: ${T.randomColor()} !important;
				border: ${T.rand(2, 5)}px ${T.pick(T.geocitiesBorders)} ${T.randomColor()} !important;
				border-radius: ${T.rand(0, 30)}px !important;
				font-family: ${T.pick(T.geocitiesReadableFonts)} !important;
				box-shadow: ${T.rand(-5, 5)}px ${T.rand(-5, 5)}px ${T.rand(5, 15)}px ${T.randomColor()},
					${T.rand(-5, 5)}px ${T.rand(-5, 5)}px ${T.rand(5, 15)}px ${T.randomColor()} !important;
				transform: rotate(${T.randFloat(-5, 5)}deg);
				animation: ${T.pick(["geocities-pulse", "geocities-shake", "geocities-wiggle", "none", "none"])} 0.5s ease-in-out infinite;
			}
			.tooltip a {
				color: ${T.randomColor()} !important;
				text-decoration: ${T.pick(["underline wavy", "underline dotted", "underline dashed", "none"])} ${T.randomColor()} !important;
			}
		`;
		document.head.appendChild(style);
	}

	function marqueeifyText() {
		const directions = ["left", "right", "up", "down"];
		const behaviors = ["scroll", "alternate", "slide"];

		const candidates = document.querySelectorAll("p, li, h1, h2, h3, span");
		candidates.forEach((el) => {
			if (
				Math.random() > 0.85 &&
				el.childNodes.length === 1 &&
				el.childNodes[0].nodeType === Node.TEXT_NODE
			) {
				const marquee = document.createElement("marquee");
				marquee.setAttribute("scrollamount", String(T.rand(2, 10)));
				marquee.setAttribute("direction", T.pick(directions));
				marquee.setAttribute("behavior", T.pick(behaviors));
				marquee.textContent = el.textContent;
				el.textContent = "";
				el.appendChild(marquee);
			}
		});
	}

	function rainbowifyHeadings() {
		document.querySelectorAll("h1, h2").forEach((h) => {
			if (Math.random() > 0.5) {
				const text = h.textContent;
				h.innerHTML = text
					.split("")
					.map(
						(char, i) =>
							`<span style="color: hsl(${(i * 25) % 360}, 100%, 50%)">${char}</span>`,
					)
					.join("");
			}
		});
	}

	function addCursors() {
		document.body.style.cursor = T.pick(cursors);
		document.querySelectorAll("a, button, h1, h2, h3, p, li").forEach((el) => {
			if (Math.random() > 0.5) {
				el.style.cursor = T.pick(cursors);
			}
		});
	}

	function addTooltips() {
		const elements = document.querySelectorAll(
			"a, button, h1, h2, h3, img, p, li, pre, code",
		);
		elements.forEach((el) => {
			if (Math.random() > 0.5) {
				el.title = T.pick(geocitiesTooltips);
			}
		});
	}

	function addTypographyChaos() {
		const elements = document.querySelectorAll(
			"h1, h2, h3, p, li, a, strong, em, span",
		);
		elements.forEach((el) => {
			// Letter spacing
			if (Math.random() > 0.7) {
				el.style.letterSpacing = `${T.rand(-2, 5)}px`;
			}
			// Word spacing
			if (Math.random() > 0.8) {
				el.style.wordSpacing = `${T.rand(-3, 10)}px`;
			}
			// Text transform
			if (Math.random() > 0.85) {
				el.style.textTransform = T.pick([
					"uppercase",
					"lowercase",
					"capitalize",
				]);
			}
			// Text stroke (outline text)
			if (Math.random() > 0.9) {
				el.style.webkitTextStroke = `1px ${T.randomColor()}`;
			}
		});
	}

	function addTextEffects() {
		const elements = document.querySelectorAll("h1, h2, h3, a, strong, em");
		const animations = [
			"geocities-blink",
			"geocities-rainbow",
			"geocities-glow",
			"geocities-pulse",
			"geocities-shake",
			"geocities-wiggle",
		];

		elements.forEach((el) => {
			// Random animation
			if (Math.random() > 0.7) {
				el.classList.add(T.pick(animations));
			}

			// Random text shadows (multiple!)
			if (Math.random() > 0.6) {
				const numShadows = T.rand(1, 4);
				const shadows = [];
				for (let i = 0; i < numShadows; i++) {
					const x = T.rand(-5, 5);
					const y = T.rand(-5, 5);
					const blur = T.rand(0, 10);
					shadows.push(`${x}px ${y}px ${blur}px ${T.randomColor()}`);
				}
				el.style.textShadow = shadows.join(", ");
			}

			// Random text decorations
			if (Math.random() > 0.75) {
				const decorations = [
					"underline",
					"overline",
					"line-through",
					"underline overline",
					"underline line-through",
				];
				const styles = ["wavy", "dotted", "dashed", "double", "solid"];
				el.style.textDecoration = `${T.pick(decorations)} ${T.pick(styles)} ${T.randomColor()}`;
			}
		});
	}

	function addVisualChaos() {
		const largeContainers = [
			"HEADER",
			"MAIN",
			"FOOTER",
			"NAV",
			"ARTICLE",
			"SECTION",
		];
		const elements = document.querySelectorAll(
			"header, main, footer, nav, article, section, h1, h2, h3, p, pre, code, .post-list, .tags, .theme-switcher, img",
		);

		elements.forEach((el) => {
			const isLarge = largeContainers.includes(el.tagName);

			// Random rotation
			if (Math.random() > 0.85) {
				const rotate = T.randFloat(-5, 5);
				el.style.transform = `rotate(${rotate}deg)`;
			}

			// Random skew
			if (Math.random() > 0.9) {
				const skewX = T.randFloat(-5, 5);
				const skewY = T.randFloat(-3, 3);
				el.style.transform = `skew(${skewX}deg, ${skewY}deg)`;
			}

			// Random filter (use safe filters for large containers)
			if (Math.random() > 0.85) {
				el.style.filter = T.pick(isLarge ? safeFilters : filters);
			}

			// Random blend mode (skip large containers - breaks visibility)
			if (!isLarge && Math.random() > 0.9) {
				el.style.mixBlendMode = T.pick(blendModes);
			}

			// Random box shadow (multiple!)
			if (Math.random() > 0.6) {
				const numShadows = T.rand(1, 3);
				const shadows = [];
				for (let i = 0; i < numShadows; i++) {
					const x = T.rand(-10, 10);
					const y = T.rand(-10, 10);
					const blur = T.rand(0, 20);
					const spread = T.rand(-5, 10);
					const inset = Math.random() > 0.7 ? "inset " : "";
					shadows.push(
						`${inset}${x}px ${y}px ${blur}px ${spread}px ${T.randomColor()}`,
					);
				}
				el.style.boxShadow = shadows.join(", ");
			}

			// Random outline
			if (Math.random() > 0.8) {
				const outlineStyles = [
					"dotted",
					"dashed",
					"solid",
					"double",
					"groove",
					"ridge",
				];
				el.style.outline = `${T.rand(1, 4)}px ${T.pick(outlineStyles)} ${T.randomColor()}`;
				el.style.outlineOffset = `${T.rand(-3, 5)}px`;
			}

			// Random border-radius
			if (Math.random() > 0.7) {
				const corners = [
					`${T.rand(0, 50)}%`,
					`${T.rand(0, 30)}px`,
					`${T.rand(0, 50)}% ${T.rand(0, 50)}% ${T.rand(0, 50)}% ${T.rand(0, 50)}%`,
				];
				el.style.borderRadius = T.pick(corners);
			}

			// Random z-index for chaos overlapping
			if (Math.random() > 0.8) {
				el.style.position = "relative";
				el.style.zIndex = String(T.rand(-10, 100));
			}
		});
	}

	function addWritingModesChaos() {
		const elements = document.querySelectorAll("p, li, h3, span, a");
		elements.forEach((el) => {
			const textLength = (el.textContent || "").length;
			// Vertical text - only for short elements to avoid layout chaos
			if (Math.random() > 0.95 && textLength < 50) {
				el.style.writingMode = T.pick([
					"vertical-rl",
					"vertical-lr",
					"sideways-rl",
					"sideways-lr",
				]);
			}
			// RTL chaos
			if (Math.random() > 0.95) {
				el.style.direction = "rtl";
			}
		});
	}

	function addBackgroundPatterns() {
		const tileSize = T.rand(15, 40);
		const patterns = [
			// Checkerboard
			`repeating-conic-gradient(${T.randomColor()} 0% 25%, ${T.randomColor()} 0% 50%) 50% / ${tileSize}px ${tileSize}px`,
			// Stripes
			`repeating-linear-gradient(${T.rand(0, 180)}deg, ${T.randomColor()}, ${T.randomColor()} 10px, ${T.randomColor()} 10px, ${T.randomColor()} 20px)`,
			// Polka dots
			`radial-gradient(${T.randomColor()} 20%, transparent 20%) 0 0 / ${tileSize}px ${tileSize}px`,
			// Diagonal stripes
			`repeating-linear-gradient(45deg, ${T.randomColor()}, ${T.randomColor()} 5px, ${T.randomColor()} 5px, ${T.randomColor()} 10px)`,
			// Stars
			`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ctext y='15' font-size='15'%3E%E2%AD%90%3C/text%3E%3C/svg%3E")`,
			// Hearts
			`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ctext y='15' font-size='15'%3E%E2%9D%A4%EF%B8%8F%3C/text%3E%3C/svg%3E")`,
			// Sparkles
			`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30'%3E%3Ctext y='20' font-size='20'%3E%E2%9C%A8%3C/text%3E%3C/svg%3E")`,
			// Fire
			`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='25'%3E%3Ctext y='18' font-size='18'%3E%F0%9F%94%A5%3C/text%3E%3C/svg%3E")`,
			// Skulls
			`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='25'%3E%3Ctext y='18' font-size='18'%3E%F0%9F%92%80%3C/text%3E%3C/svg%3E")`,
			// Aliens
			`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='25'%3E%3Ctext y='18' font-size='18'%3E%F0%9F%91%BD%3C/text%3E%3C/svg%3E")`,
			// Raccoons!
			`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30'%3E%3Ctext y='22' font-size='22'%3E%F0%9F%A6%9D%3C/text%3E%3C/svg%3E")`,
		];

		// Crazy body backgrounds - pick a random style
		// Probabilities bumped up for maximum chaos
		// Use backgroundImage + backgroundColor separately to avoid shorthand resetting backgroundSize
		const bgStyle = Math.random();
		const body = document.body;

		// Reset first
		body.style.backgroundImage = "";
		body.style.backgroundColor = "";
		body.style.backgroundSize = "";
		body.style.backgroundRepeat = "";
		body.classList.remove("geocities-gradient-shift");

		if (bgStyle < 0.08) {
			// Animated gradient (boring, rare now)
			const bg1 = T.randomColor();
			const bg2 = T.randomColor();
			const bg3 = T.randomColor();
			body.style.backgroundImage = `linear-gradient(${T.rand(0, 360)}deg, ${bg1}, ${bg2}, ${bg3})`;
			body.classList.add("geocities-gradient-shift");
		} else if (bgStyle < 0.25) {
			// Tiled emoji pattern with animation (17%)
			const bgColor = T.randomColor();
			const animType = T.pick(["drift", "pulse", "rotate", "none", "none"]);
			const duration = T.rand(10, 30);
			const opacity = T.randFloat(0.3, 0.8);

			// Pick 1-3 different emoji patterns with varying sizes and offsets
			const numLayers = T.rand(1, 3);
			const layers = [];
			const usedPatterns = [];
			for (let i = 0; i < numLayers; i++) {
				let pattern;
				do {
					pattern = T.pick(patterns);
				} while (
					usedPatterns.includes(pattern) &&
					usedPatterns.length < patterns.length
				);
				usedPatterns.push(pattern);

				const size = T.rand(20, 70);
				const offsetX = T.rand(0, size);
				const offsetY = T.rand(0, size);
				layers.push({ pattern, size, offsetX, offsetY });
			}

			const bgImages = layers.map((l) => l.pattern).join(", ");
			const bgSizes = layers.map((l) => `${l.size}px ${l.size}px`).join(", ");
			const bgPositions = layers
				.map((l) => `${l.offsetX}px ${l.offsetY}px`)
				.join(", ");

			body.style.backgroundColor = bgColor;

			// Use pseudo-element for animatable emoji background
			const styleId = "geocities-emoji-bg";
			let style = document.getElementById(styleId);
			if (!style) {
				style = document.createElement("style");
				style.id = styleId;
				document.head.appendChild(style);
			}

			let animation = "";
			let keyframes = "";
			if (animType === "drift") {
				keyframes = `@keyframes emoji-drift {
					0% { background-position: ${bgPositions}; }
					100% { background-position: ${layers.map((l) => `${l.offsetX + l.size * 2}px ${l.offsetY + l.size * 2}px`).join(", ")}; }
				}`;
				animation = `emoji-drift ${duration}s linear infinite`;
			} else if (animType === "pulse") {
				keyframes = `@keyframes emoji-pulse {
					0%, 100% { opacity: ${opacity}; }
					50% { opacity: ${Math.min(1, opacity + 0.3)}; }
				}`;
				animation = `emoji-pulse ${duration / 3}s ease-in-out infinite`;
			} else if (animType === "rotate") {
				keyframes = `@keyframes emoji-rotate {
					from { transform: rotate(0deg); }
					to { transform: rotate(360deg); }
				}`;
				animation = `emoji-rotate ${duration * 6}s linear infinite`;
			}

			style.textContent = `
				${keyframes}
				body::before {
					content: "";
					position: fixed;
					top: -50%;
					left: -50%;
					width: 200%;
					height: 200%;
					background-image: ${bgImages};
					background-size: ${bgSizes};
					background-position: ${bgPositions};
					background-repeat: repeat;
					opacity: ${opacity};
					pointer-events: none;
					z-index: -1;
					${animation ? `animation: ${animation};` : ""}
				}
			`;
		} else if (bgStyle < 0.38) {
			// Radial gradient explosion (13%)
			const numStops = T.rand(3, 6);
			const stops = [];
			for (let i = 0; i < numStops; i++) {
				stops.push(`${T.randomColor()} ${Math.round((i / numStops) * 100)}%`);
			}
			body.style.backgroundImage = `radial-gradient(circle at ${T.rand(20, 80)}% ${T.rand(20, 80)}%, ${stops.join(", ")})`;
		} else if (bgStyle < 0.52) {
			// Conic gradient (pie chart chaos) (14%)
			const numSlices = T.rand(4, 12);
			const slices = [];
			for (let i = 0; i < numSlices; i++) {
				slices.push(T.randomColor());
			}
			body.style.backgroundImage = `conic-gradient(from ${T.rand(0, 360)}deg, ${slices.join(", ")})`;
		} else if (bgStyle < 0.65) {
			// Multiple layered patterns (13%)
			const size = T.rand(25, 60);
			body.style.backgroundColor = T.randomColor();
			body.style.backgroundImage = `${T.pick(patterns)}, linear-gradient(${T.rand(0, 360)}deg, ${T.randomColor(0.3)}, ${T.randomColor(0.3)})`;
			body.style.backgroundSize = `${size}px ${size}px, 100% 100%`;
			body.style.backgroundRepeat = "repeat, no-repeat";
		} else if (bgStyle < 0.78) {
			// Striped madness (13%)
			const numColors = T.rand(3, 7);
			const colors = [];
			for (let i = 0; i < numColors; i++) {
				const pct = Math.round((i / numColors) * 100);
				const nextPct = Math.round(((i + 1) / numColors) * 100);
				colors.push(
					`${T.randomColor()} ${pct}%`,
					`${T.randomColor()} ${nextPct}%`,
				);
			}
			body.style.backgroundImage = `repeating-linear-gradient(${T.rand(0, 180)}deg, ${colors.join(", ")})`;
		} else if (bgStyle < 0.9) {
			// MAXIMUM CHAOS - multiple conic gradients (12%)
			body.style.backgroundColor = T.randomColor();
			body.style.backgroundImage = `
				conic-gradient(from ${T.rand(0, 360)}deg at ${T.rand(0, 100)}% ${T.rand(0, 100)}%, ${T.randomColor(0.5)}, ${T.randomColor(0.5)}, ${T.randomColor(0.5)}, ${T.randomColor(0.5)}),
				conic-gradient(from ${T.rand(0, 360)}deg at ${T.rand(0, 100)}% ${T.rand(0, 100)}%, ${T.randomColor(0.5)}, ${T.randomColor(0.5)}, ${T.randomColor(0.5)}, ${T.randomColor(0.5)})
			`;
		} else {
			// Noise-like pattern with tiny gradients (10%)
			body.style.backgroundColor = T.randomColor();
			body.style.backgroundImage = `
				repeating-conic-gradient(${T.randomColor()} 0% 25%, ${T.randomColor()} 0% 50%),
				repeating-conic-gradient(${T.randomColor(0.5)} 0% 25%, transparent 0% 50%)
			`;
			body.style.backgroundSize = "10px 10px, 10px 10px";
			body.style.backgroundPosition = "0 0, 5px 5px";
		}

		// Random patterns on some elements
		document
			.querySelectorAll("header, footer, nav, .theme-switcher")
			.forEach((el) => {
				if (Math.random() > 0.5) {
					el.style.background = T.pick(patterns);
				}
			});
	}

	function addHrStyling() {
		document.querySelectorAll("hr").forEach((hr) => {
			const styles = [
				// Rainbow gradient
				`height: 5px; border: none; background: linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet);`,
				// 3D bevel
				`height: 4px; border: none; border-top: 2px solid ${T.randomColor()}; border-bottom: 2px solid ${T.randomColor()};`,
				// Dotted rainbow
				`border: none; border-top: 3px dotted ${T.randomColor()};`,
				// Double line
				`border: none; border-top: double 5px ${T.randomColor()};`,
				// Wavy (via shadow)
				`height: 3px; border: none; background: ${T.randomColor()}; box-shadow: 0 3px 0 ${T.randomColor()}, 0 6px 0 ${T.randomColor()};`,
			];
			hr.style.cssText = T.pick(styles);
		});
	}

	function spinAndBounce() {
		const animations = [
			"geocities-spin",
			"geocities-bounce",
			"geocities-pulse",
			"geocities-wiggle",
		];
		document.querySelectorAll(".tag, img, button").forEach((el) => {
			if (Math.random() > 0.6) {
				el.classList.add(T.pick(animations));
			}
		});
	}

	function addStatusBar() {
		const visitorCount = T.rand(1, 999999);
		const statusBar = document.createElement("div");
		statusBar.className = "geocities-status-bar";

		// Random status bar styles - MORE OF THEM
		const statusBarStyles = [
			// Classic Windows 95
			`background: linear-gradient(to bottom, #dfdfdf, #c0c0c0); border-top: 2px outset #fff; color: #000080;`,
			// Windows 98
			`background: linear-gradient(to bottom, #d4d0c8, #808080); border-top: 2px solid #fff; border-left: 2px solid #fff; color: #000;`,
			// Neon green
			`background: #000; border-top: 2px solid #0ff; color: #0f0; text-shadow: 0 0 5px #0f0, 0 0 10px #0f0;`,
			// Neon pink
			`background: #000; border-top: 2px solid #f0f; color: #f0f; text-shadow: 0 0 5px #f0f, 0 0 10px #f0f;`,
			// Rainbow
			`background: linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet); color: #fff; text-shadow: 1px 1px 2px #000;`,
			// Hot pink
			`background: #ff1493; border-top: 3px double #ff69b4; color: #fff;`,
			// Matrix
			`background: #000; border-top: 1px solid #0f0; color: #0f0; font-family: "Courier New", monospace; letter-spacing: 2px;`,
			// Vaporwave
			`background: linear-gradient(90deg, #ff71ce, #01cdfe, #05ffa1, #b967ff); color: #fff; font-family: "Times New Roman", serif;`,
			// Fire
			`background: linear-gradient(to top, #ff0000, #ff7700, #ffff00); color: #000; font-weight: bold;`,
			// Ocean
			`background: linear-gradient(90deg, #000428, #004e92); color: #7fdbff; border-top: 2px solid #7fdbff;`,
			// Sunset
			`background: linear-gradient(90deg, #f12711, #f5af19); color: #fff; text-shadow: 1px 1px 0 #000;`,
			// Galaxy
			`background: linear-gradient(90deg, #0f0c29, #302b63, #24243e); color: #e0e0e0; border-top: 1px solid #9d50bb;`,
			// Toxic
			`background: #1a1a1a; border-top: 3px solid #39ff14; color: #39ff14; font-family: "Impact", sans-serif;`,
			// Barbie
			`background: linear-gradient(90deg, #ff69b4, #ff1493, #ff69b4); color: #fff; font-family: "Comic Sans MS", cursive;`,
			// Construction
			`background: repeating-linear-gradient(45deg, #000, #000 10px, #ff0 10px, #ff0 20px); color: #fff; text-shadow: 1px 1px 0 #000, -1px -1px 0 #000;`,
			// USA
			`background: linear-gradient(90deg, #002868 33%, #fff 33%, #fff 66%, #bf0a30 66%); color: #fff; text-shadow: 1px 1px 0 #000;`,
			// Hacker
			`background: #0a0a0a; color: #00ff00; font-family: "Lucida Console", monospace; border-top: 1px solid #003300; text-shadow: 0 0 3px #00ff00;`,
			// Retro
			`background: #f4a460; border-top: 3px ridge #8b4513; color: #8b0000; font-family: "Georgia", serif;`,
			// Cyberpunk
			`background: linear-gradient(90deg, #00d4ff, #090979, #ff00ff); color: #fff; font-family: "Arial Black", sans-serif;`,
			// Glitch
			`background: #000; color: #fff; border-top: 2px solid #f00; text-shadow: 2px 0 #0ff, -2px 0 #f0f;`,
			// Christmas
			`background: repeating-linear-gradient(90deg, #c41e3a 0px, #c41e3a 20px, #165b33 20px, #165b33 40px); color: #fff;`,
			// Halloween
			`background: linear-gradient(90deg, #000, #1a0a00, #000); color: #ff6600; border-top: 2px solid #ff6600;`,
			// Outrun
			`background: linear-gradient(to top, #1a0a2e, #16213e); border-top: 2px solid #f72585; color: #4cc9f0;`,
			// MS-DOS
			`background: #000080; color: #aaa; font-family: "Courier New", monospace; border: none;`,
			// Acid
			`background: linear-gradient(90deg, #f0f, #0ff, #f0f, #0ff); color: #000; animation: geocities-gradient-shift 1s linear infinite; background-size: 200% 100%;`,
			// Random chaos
			`background: ${T.randomBackground()}; color: ${T.randomColor()}; border-top: ${T.rand(1, 5)}px ${T.pick(T.geocitiesBorders)} ${T.randomColor()};`,
		];
		statusBar.style.cssText = T.pick(statusBarStyles);

		// MANY more messages
		const separators = [
			" \u2605 ", // star
			" \u2665 ", // heart
			" \u266B ", // music note
			" \u2600 ", // sun
			" \u2602 ", // umbrella
			" \u2708 ", // airplane
			" \u2622 ", // radioactive
			" \u262E ", // peace
			" \u263A ", // smiley
			" \u2764 ", // heart
			" ~ ",
			" * ",
			" | ",
			" :: ",
			" >>> ",
			" <<< ",
			" -=*=- ",
			" ~~~ ",
			" <3 ",
			" xXx ",
		];
		const sep = T.pick(separators);

		const midiFiles = [
			"canyon.mid",
			"passport.mid",
			"flourish.mid",
			"onestop.mid",
			"town.mid",
			"jungle.mid",
			"rickroll.mid",
			"doom_e1m1.mid",
			"zelda_theme.mid",
			"mario_underground.mid",
			"sandstorm.mid",
			"nyan_cat.mid",
			"all_star.mid",
			"never_gonna.mid",
		];

		const webringNames = [
			"Raccoon WebRing",
			"90s Nostalgia Ring",
			"Cool Homepages United",
			"Under Construction Club",
			"Blink Tag Enthusiasts",
			"Animated GIF Alliance",
			"MIDI Music Lovers",
			"Netscape Forever",
			"GeoCities Survivors",
			"Table Layout Masters",
			"Frames Are Cool Ring",
			"Visitor Counter Club",
		];

		const messages = [
			// Classic welcomes
			`Welcome to my homepage!!!`,
			`WELCOME TO MY SITE`,
			`~*~Welcome~*~`,
			`.:. Welcome to my corner of the web .:.`,
			`** ENTER AT YOUR OWN RISK **`,

			// Visitor counters
			`You are visitor #${visitorCount}`,
			`Visitor count: ${visitorCount.toLocaleString()}`,
			`${visitorCount} people have visited since ${T.rand(1995, 2002)}`,
			`You are the ${visitorCount}th visitor!!!`,

			// Guestbook
			`Sign my guestbook!`,
			`PLEASE sign the guestbook!!!`,
			`Don't forget to sign the guestbook before you leave!`,
			`Guestbook entries: ${T.rand(50, 9999)}`,

			// Browser recommendations
			`Best viewed in Netscape Navigator 4.0`,
			`Best viewed in Internet Explorer 5.0`,
			`Best viewed at 800x600 resolution`,
			`Best viewed at 1024x768 with 16-bit color`,
			`Get Netscape NOW!`,
			`Download Internet Explorer FREE`,
			`This site requires JavaScript`,
			`This site requires Shockwave Flash`,
			`Best viewed with eyes closed`,
			`Best viewed on a CRT monitor`,

			// Dates and updates
			`Last updated: ${new Date().toLocaleDateString()}`,
			`Last updated: ${T.pick(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"])} ${T.rand(1, 28)}, ${T.rand(1997, 2003)}`,
			`Site established ${T.rand(1995, 2000)}`,
			`Under construction since 1999`,
			`Coming soon: more content!`,

			// Y2K
			`This site is Y2K compliant!`,
			`Y2K READY`,
			`Survived Y2K!`,

			// Contact & social
			`ICQ#: ${T.rand(10000000, 99999999)}`,
			`AIM: xX_${T.pick(["cool", "dark", "fire", "ice", "rad", "epic"])}_${T.pick(["dude", "gurl", "wolf", "angel", "demon", "ninja"])}${T.rand(69, 99)}Xx`,
			`Email me: webmaster@geocities.com`,
			`MSN: coolwebmaster@hotmail.com`,

			// Music
			`\u266B Now playing: ${T.pick(midiFiles)} \u266B`,
			`\u266B MIDI music enabled \u266B`,
			`Turn on your speakers!`,
			`Click here for MIDI music!`,

			// Software & downloads
			`Download Winamp NOW!`,
			`Get Flash Player`,
			`Download RealPlayer`,
			`Powered by FrontPage`,
			`Made with Notepad`,
			`Created in Microsoft Word`,
			`Built with Dreamweaver`,

			// Webrings
			`Join my webring!`,
			`Member of the ${T.pick(webringNames)}`,
			`[ Previous | Random | Next ]`,
			`<< Prev | Hub | Next >>`,

			// Misc chaos
			`Made with \u2665 and GeoCities`,
			`FREE web hosting!`,
			`Add me to your favorites!`,
			`Bookmark this page!`,
			`Press Ctrl+D to bookmark!`,
			`Tell your friends!`,
			`Link to me!`,
			`Steal my graphics!`,
			`Do NOT steal my graphics!!!`,
			`All graphics (c) ME`,
			`No right-clicking allowed!`,
			`This page is FRAMES FREE`,
			`Best experienced with FRAMES`,
			`Java-enhanced experience!`,
			`ActiveX inside!`,
			`Powered by CGI`,
			`Perl scripts by ME`,
			`DHTML enabled!`,
			`WAP version available`,
			`Palm Pilot friendly!`,
			`WebTV compatible!`,
			`AOL Keyword: ${T.pick(["awesome", "cool", "radical", "excellent", "tubular"])}`,
			`Vote for my site!`,
			`Rate this site 5 stars!`,
			`Click the monkey to win a prize!`,
			`You have won $1,000,000!!!`,
			`Congratulations!!!`,
			`\u26A0 UNDER CONSTRUCTION \u26A0`,
			`Page views: ${T.rand(100, 999999).toLocaleString()}`,
			`Online since ${T.rand(1995, 2001)}`,
			`Hits today: ${T.rand(1, 500)}`,
			`Currently ${T.rand(1, 50)} users online`,
			`Server time: ${new Date().toLocaleTimeString()}`,
			`[NEW!]`,
			`[HOT!]`,
			`[COOL!]`,
			`>>> CLICK HERE <<<`,
			`!!! IMPORTANT !!!`,
			`*** UPDATED ***`,
			`FREE stuff inside!`,
			`Enter to win!`,
			`You won't believe this!`,
			`Doctors HATE this!`,
			`One weird trick...`,
		];

		// Pick random subset of messages
		const numMessages = T.rand(5, 12);
		const shuffled = messages.sort(() => Math.random() - 0.5);
		const selectedMessages = shuffled.slice(0, numMessages);

		// Random marquee settings
		const direction = T.pick(["left", "right"]);
		const behavior = T.pick(["scroll", "scroll", "scroll", "alternate"]); // mostly scroll
		const speed = T.rand(1, 15); // some VERY slow, some VERY fast

		// Sometimes double marquee (nested for chaos)
		const useNestedMarquee = Math.random() > 0.85;

		let content = selectedMessages.join(sep);
		if (useNestedMarquee) {
			// Outer marquee goes one way, inner goes the other
			const innerDirection = direction === "left" ? "right" : "left";
			content = `<marquee direction="${innerDirection}" scrollamount="${T.rand(2, 8)}">${content}</marquee>`;
		}

		statusBar.innerHTML = `<marquee direction="${direction}" behavior="${behavior}" scrollamount="${speed}">${content}</marquee>`;

		// Sometimes add extra flair to the status bar
		if (Math.random() > 0.7) {
			statusBar.style.fontWeight = "bold";
		}
		if (Math.random() > 0.8) {
			statusBar.style.fontStyle = "italic";
		}
		if (Math.random() > 0.85) {
			statusBar.style.textTransform = T.pick(["uppercase", "lowercase"]);
		}
		if (Math.random() > 0.9) {
			statusBar.style.letterSpacing = `${T.rand(1, 5)}px`;
		}

		document.body.appendChild(statusBar);
		document.body.style.paddingBottom = "30px";
	}

	function isContentArea(el) {
		// Element is inside content area
		if (el.closest(".post-content, .page-content")) return true;
		// Element contains content area (parent elements like main, article)
		if (el.querySelector(".post-content, .page-content")) return true;
		return false;
	}

	function addLensFlare() {
		// 40% chance of lens flare
		if (Math.random() > 0.4) return;

		const flares = [];
		// Random flare style
		const style = T.pick(["rainbow", "warm", "cool", "mono", "chaos"]);
		const colorSets = {
			rainbow: [
				"rgba(255, 100, 100, 0.4)",
				"rgba(100, 255, 100, 0.3)",
				"rgba(100, 100, 255, 0.3)",
				"rgba(255, 255, 100, 0.4)",
				"rgba(255, 100, 255, 0.3)",
			],
			warm: [
				"rgba(255, 200, 100, 0.4)",
				"rgba(255, 150, 50, 0.3)",
				"rgba(255, 100, 100, 0.3)",
				"rgba(255, 220, 150, 0.4)",
				"rgba(255, 180, 80, 0.3)",
			],
			cool: [
				"rgba(100, 200, 255, 0.4)",
				"rgba(150, 100, 255, 0.3)",
				"rgba(100, 255, 200, 0.3)",
				"rgba(200, 150, 255, 0.4)",
				"rgba(100, 180, 255, 0.3)",
			],
			mono: [
				"rgba(255, 255, 255, 0.5)",
				"rgba(255, 255, 255, 0.3)",
				"rgba(255, 255, 255, 0.4)",
				"rgba(255, 255, 255, 0.2)",
				"rgba(255, 255, 255, 0.35)",
			],
			chaos: [
				T.randomColor(0.4),
				T.randomColor(0.3),
				T.randomColor(0.3),
				T.randomColor(0.4),
				T.randomColor(0.3),
			],
		};
		const colors = colorSets[style];
		const numFlares = T.rand(2, 5);

		for (let i = 0; i < numFlares; i++) {
			const size = T.rand(20, 100);
			const flare = document.createElement("div");
			flare.className = "geocities-lens-flare";
			flare.style.width = `${size}px`;
			flare.style.height = `${size}px`;
			flare.style.background = `radial-gradient(circle, ${colors[i % colors.length]}, transparent 70%)`;
			document.body.appendChild(flare);
			flares.push({
				el: flare,
				offset: { x: T.rand(-80, 80), y: T.rand(-60, 60) },
				size,
			});
		}

		document.addEventListener("mousemove", (e) => {
			for (const { el, offset, size } of flares) {
				el.style.left = `${e.clientX + offset.x - size / 2}px`;
				el.style.top = `${e.clientY + offset.y - size / 2}px`;
			}
		});
	}

	function addPageEntryAnimation() {
		// 30% chance of entry animation
		if (Math.random() > 0.3) return;

		const elements = document.querySelectorAll("header, nav, main, footer");

		const entryTransforms = [
			"translateX(-100vw) rotate(-30deg)",
			"translateX(100vw) rotate(30deg)",
			"translateY(-100vh) scale(0.1)",
			"translateY(100vh) scale(0.1)",
			"translateX(-100vw) translateY(-50vh)",
			"translateX(100vw) translateY(50vh)",
			"scale(3) rotate(180deg)",
			"scale(0) rotate(-180deg)",
			"translateY(-100vh) rotate(720deg)",
			"skewX(45deg) translateX(-100vw)",
			"skewY(45deg) translateY(100vh)",
		];

		// Random entry style: all same direction, or chaos
		const chaosMode = Math.random() > 0.5;
		const sharedTransform = T.pick(entryTransforms);

		elements.forEach((el, index) => {
			const transform = chaosMode ? T.pick(entryTransforms) : sharedTransform;
			el.style.setProperty("--entry-transform", transform);
			el.style.animationDelay = `${index * 0.05}s`;
			el.classList.add("geocities-entry");
		});
	}

	function addRandomAnimations() {
		const elements = document.querySelectorAll(
			"h1, h2, h3, img, .tag, button, a, li, p, span, strong, em, code",
		);

		const timingFunctions = [
			"linear",
			"ease",
			"ease-in",
			"ease-out",
			"ease-in-out",
			"cubic-bezier(0.68, -0.55, 0.265, 1.55)", // Back
			"cubic-bezier(0.175, 0.885, 0.32, 1.275)", // Elastic-ish
		];

		const directions = ["normal", "reverse", "alternate", "alternate-reverse"];

		elements.forEach((el) => {
			// Only animate ~15% of elements
			if (Math.random() > 0.15) return;

			const duration = T.randFloat(2, 15);
			const delay = T.randFloat(0, 5);
			const timing = T.pick(timingFunctions);
			const direction = T.pick(directions);
			const id = Math.random().toString(36).slice(2, 9);

			// Pick a random animation type
			const animationType = T.pick([
				"spin",
				"pulse",
				"bounce",
				"shake",
				"wobble",
				"float",
				"swing",
				"rubber",
				"jello",
			]);

			let keyframes = "";
			switch (animationType) {
				case "spin":
					keyframes = `
						@keyframes spin-${id} {
							to { transform: rotate(${T.pick([360, -360, 720, -720])}deg); }
						}
					`;
					break;
				case "pulse": {
					const scaleMin = T.randFloat(0.9, 1);
					const scaleMax = T.randFloat(1, 1.2);
					keyframes = `
						@keyframes pulse-${id} {
							0%, 100% { transform: scale(${scaleMin}); }
							50% { transform: scale(${scaleMax}); }
						}
					`;
					break;
				}
				case "bounce": {
					const bounceHeight = T.rand(5, 20);
					keyframes = `
						@keyframes bounce-${id} {
							0%, 100% { transform: translateY(0); }
							50% { transform: translateY(-${bounceHeight}px); }
						}
					`;
					break;
				}
				case "shake": {
					const shakeX = T.rand(2, 8);
					keyframes = `
						@keyframes shake-${id} {
							0%, 100% { transform: translateX(0); }
							25% { transform: translateX(-${shakeX}px); }
							75% { transform: translateX(${shakeX}px); }
						}
					`;
					break;
				}
				case "wobble": {
					const wobbleAngle = T.rand(3, 10);
					keyframes = `
						@keyframes wobble-${id} {
							0%, 100% { transform: rotate(0deg); }
							25% { transform: rotate(-${wobbleAngle}deg); }
							75% { transform: rotate(${wobbleAngle}deg); }
						}
					`;
					break;
				}
				case "float": {
					const floatY = T.rand(5, 15);
					const floatX = T.rand(-5, 5);
					keyframes = `
						@keyframes float-${id} {
							0%, 100% { transform: translate(0, 0); }
							50% { transform: translate(${floatX}px, -${floatY}px); }
						}
					`;
					break;
				}
				case "swing": {
					const swingAngle = T.rand(5, 15);
					keyframes = `
						@keyframes swing-${id} {
							0%, 100% { transform: rotate(0deg); transform-origin: top center; }
							25% { transform: rotate(${swingAngle}deg); }
							75% { transform: rotate(-${swingAngle}deg); }
						}
					`;
					break;
				}
				case "rubber":
					keyframes = `
						@keyframes rubber-${id} {
							0%, 100% { transform: scale(1, 1); }
							30% { transform: scale(1.25, 0.75); }
							40% { transform: scale(0.75, 1.25); }
							50% { transform: scale(1.15, 0.85); }
							65% { transform: scale(0.95, 1.05); }
							75% { transform: scale(1.05, 0.95); }
						}
					`;
					break;
				case "jello":
					keyframes = `
						@keyframes jello-${id} {
							0%, 100% { transform: skewX(0deg) skewY(0deg); }
							22% { transform: skewX(-${T.rand(5, 12)}deg) skewY(-${T.rand(2, 5)}deg); }
							44% { transform: skewX(${T.rand(4, 10)}deg) skewY(${T.rand(2, 4)}deg); }
							66% { transform: skewX(-${T.rand(2, 6)}deg) skewY(-${T.rand(1, 3)}deg); }
							88% { transform: skewX(${T.rand(1, 3)}deg) skewY(${T.rand(1, 2)}deg); }
						}
					`;
					break;
			}

			const style = document.createElement("style");
			style.textContent = keyframes;
			document.head.appendChild(style);

			const animName = `${animationType}-${id}`;
			el.style.animation = `${animName} ${duration}s ${timing} ${delay}s infinite ${direction}`;
			el.style.display = "inline-block"; // Needed for transforms on inline elements
		});
	}

	function addSparkleTrail() {
		// 25% chance
		if (Math.random() > 0.25) return;

		const sparkleChars = T.pick([
			["✨", "⭐", "💫", "🌟", "✦"],
			["💖", "💕", "💗", "💓", "♥"],
			["🦝", "✨", "🌙", "⭐", "🦝"],
			["🔥", "💥", "⚡", "✨", "💫"],
			["🌸", "🌺", "🌷", "💮", "🌼"],
			["❄️", "✨", "💎", "⭐", "🌟"],
		]);

		document.addEventListener("mousemove", (e) => {
			if (Math.random() > 0.3) return; // Throttle sparkles

			const sparkle = document.createElement("div");
			sparkle.textContent = T.pick(sparkleChars);
			sparkle.style.cssText = `
				position: fixed;
				left: ${e.clientX}px;
				top: ${e.clientY}px;
				pointer-events: none;
				z-index: 9999;
				font-size: ${T.rand(12, 24)}px;
				transform: translate(-50%, -50%);
				animation: sparkle-fade 1s ease-out forwards;
			`;
			document.body.appendChild(sparkle);
			setTimeout(() => sparkle.remove(), 1000);
		});

		const style = document.createElement("style");
		style.textContent = `
			@keyframes sparkle-fade {
				0% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
				100% { opacity: 0; transform: translate(-50%, -100%) scale(0.5) rotate(${T.rand(-180, 180)}deg); }
			}
		`;
		document.head.appendChild(style);
	}

	function addFallingParticles() {
		// 20% chance
		if (Math.random() > 0.2) return;

		const particleSets = [
			["❄️", "❅", "❆", "✨"],
			["🦝", "🌙", "⭐", "✨"],
			["💖", "💕", "💗", "♥"],
			["🍂", "🍁", "🌿", "🍃"],
			["⭐", "🌟", "✨", "💫"],
			["🌸", "🌺", "💮", "🌷"],
		];
		const particles = T.pick(particleSets);
		const numParticles = T.rand(15, 30);

		const style = document.createElement("style");
		style.textContent = `
			@keyframes falling-particle {
				0% { transform: translateY(0) rotate(0deg); }
				100% { transform: translateY(calc(100vh + 50px)) rotate(360deg); }
			}
			.falling-particle {
				position: fixed;
				top: -50px;
				pointer-events: none;
				z-index: 9997;
				animation: falling-particle var(--fall-duration) linear infinite;
				animation-delay: var(--fall-delay);
			}
		`;
		document.head.appendChild(style);

		for (let i = 0; i < numParticles; i++) {
			const particle = document.createElement("div");
			particle.className = "falling-particle";
			particle.textContent = T.pick(particles);
			particle.style.cssText = `
				left: ${Math.random() * 100}vw;
				font-size: ${T.rand(12, 28)}px;
				--fall-duration: ${T.rand(8, 20)}s;
				--fall-delay: ${T.rand(0, 10)}s;
				opacity: ${T.randFloat(0.4, 0.9)};
			`;
			document.body.appendChild(particle);
		}
	}

	function addTwinklingStars() {
		// 25% chance
		if (Math.random() > 0.25) return;

		const starSets = [
			["✦", "✧", "⋆", "✶", "✷", "✸"],
			["🦝", "⭐", "🌙"],
			["💫", "⭐", "🌟", "✨"],
			["✿", "❀", "✾", "❁"],
		];
		const stars = T.pick(starSets);
		const numStars = T.rand(20, 50);

		const style = document.createElement("style");
		style.textContent = `
			@keyframes twinkle {
				0%, 100% { opacity: var(--twinkle-min); transform: scale(1); }
				50% { opacity: var(--twinkle-max); transform: scale(1.2); }
			}
			.twinkle-star {
				position: fixed;
				pointer-events: none;
				z-index: 1;
				animation: twinkle var(--twinkle-duration) ease-in-out infinite;
				animation-delay: var(--twinkle-delay);
			}
		`;
		document.head.appendChild(style);

		for (let i = 0; i < numStars; i++) {
			const star = document.createElement("div");
			star.className = "twinkle-star";
			star.textContent = T.pick(stars);
			star.style.cssText = `
				left: ${Math.random() * 100}vw;
				top: ${Math.random() * 100}vh;
				font-size: ${T.rand(8, 20)}px;
				--twinkle-duration: ${T.randFloat(1, 4)}s;
				--twinkle-delay: ${T.randFloat(0, 3)}s;
				--twinkle-min: ${T.randFloat(0.2, 0.5)};
				--twinkle-max: ${T.randFloat(0.7, 1)};
			`;
			document.body.appendChild(star);
		}
	}

	function addCursorRepulsion() {
		// 20% chance
		if (Math.random() > 0.2) return;

		const elements = document.querySelectorAll(
			"a, button, h1, h2, h3, .tag, img, li",
		);
		const repelDistance = T.rand(80, 150);
		const repelStrength = T.randFloat(30, 80);

		const repulsiveEls = [];
		elements.forEach((el) => {
			// 15% of elements flee
			if (Math.random() > 0.15) return;

			el.style.transition = `transform ${T.randFloat(0.1, 0.3)}s ease-out`;
			el.style.position = "relative";
			repulsiveEls.push({
				el,
				originalX: 0,
				originalY: 0,
				strength: T.randFloat(0.5, 1.5),
			});
		});

		if (repulsiveEls.length === 0) return;

		document.addEventListener("mousemove", (e) => {
			for (const item of repulsiveEls) {
				const rect = item.el.getBoundingClientRect();
				const elCenterX = rect.left + rect.width / 2;
				const elCenterY = rect.top + rect.height / 2;

				const dx = elCenterX - e.clientX;
				const dy = elCenterY - e.clientY;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (distance < repelDistance) {
					const force =
						(1 - distance / repelDistance) * repelStrength * item.strength;
					const angle = Math.atan2(dy, dx);
					const moveX = Math.cos(angle) * force;
					const moveY = Math.sin(angle) * force;
					item.el.style.transform = `translate(${moveX}px, ${moveY}px)`;
				} else {
					item.el.style.transform = "translate(0, 0)";
				}
			}
		});
	}

	function addHoverEffects() {
		// 40% chance
		if (Math.random() > 0.4) return;

		const elements = document.querySelectorAll(
			"a, button, h1, h2, h3, li, p, img, .tag, pre, code",
		);

		elements.forEach((el) => {
			// 30% of elements get hover effects
			if (Math.random() > 0.3) return;

			const id = `hover-${Math.random().toString(36).slice(2, 9)}`;
			el.classList.add(id);

			const effects = [];

			// Random scale
			if (Math.random() > 0.5) {
				const scale = T.randFloat(1.05, 1.3);
				effects.push(`transform: scale(${scale})`);
			}

			// Random rotation
			if (Math.random() > 0.6) {
				const rotate = T.rand(-15, 15);
				effects.push(`transform: rotate(${rotate}deg)`);
			}

			// Random color change
			if (Math.random() > 0.5) {
				effects.push(`color: ${T.randomColor()}`);
			}

			// Random background
			if (Math.random() > 0.6) {
				effects.push(`background: ${T.randomColor()}`);
			}

			// Random shadow
			if (Math.random() > 0.5) {
				const shadow = `${T.rand(-10, 10)}px ${T.rand(-10, 10)}px ${T.rand(5, 20)}px ${T.randomColor()}`;
				effects.push(`box-shadow: ${shadow}`);
			}

			// Random text shadow
			if (Math.random() > 0.6) {
				const textShadow = `${T.rand(-5, 5)}px ${T.rand(-5, 5)}px ${T.rand(2, 10)}px ${T.randomColor()}`;
				effects.push(`text-shadow: ${textShadow}`);
			}

			// Random filter
			if (Math.random() > 0.7) {
				const filterEffects = [
					`brightness(${T.randFloat(1.2, 1.5)})`,
					`saturate(${T.randFloat(1.5, 3)})`,
					`hue-rotate(${T.rand(30, 180)}deg)`,
					"invert(1)",
					`contrast(${T.randFloat(1.2, 2)})`,
				];
				effects.push(`filter: ${T.pick(filterEffects)}`);
			}

			// Random border
			if (Math.random() > 0.7) {
				effects.push(
					`border: ${T.rand(2, 5)}px ${T.pick(T.geocitiesBorders)} ${T.randomColor()}`,
				);
			}

			// Random outline
			if (Math.random() > 0.7) {
				effects.push(
					`outline: ${T.rand(2, 5)}px ${T.pick(["dotted", "dashed", "solid", "double"])} ${T.randomColor()}`,
				);
			}

			if (effects.length === 0) {
				effects.push(`transform: scale(1.1)`);
			}

			const transition = `all ${T.randFloat(0.1, 0.4)}s ${T.pick(["ease", "ease-in-out", "linear"])}`;

			const style = document.createElement("style");
			style.textContent = `
				.${id} { transition: ${transition}; }
				.${id}:hover { ${effects.join(" !important; ")} !important; }
			`;
			document.head.appendChild(style);
		});
	}

	function addClickBurst() {
		// 35% chance
		if (Math.random() > 0.35) return;

		const burstSets = [
			["💥", "⭐", "✨", "💫", "🌟"],
			["🦝", "🌙", "⭐", "✨", "💫"],
			["💖", "💕", "💗", "💓", "💘"],
			["🔥", "💥", "⚡", "✨", "🌟"],
			["🎉", "🎊", "✨", "⭐", "🌟"],
			["💀", "☠️", "👻", "💥", "✨"],
			["🌈", "⭐", "✨", "💫", "🦄"],
		];
		const burstChars = T.pick(burstSets);
		const numParticles = T.rand(5, 12);

		const style = document.createElement("style");
		style.textContent = `
			@keyframes click-burst {
				0% {
					opacity: 1;
					transform: translate(-50%, -50%) scale(1);
				}
				100% {
					opacity: 0;
					transform: translate(
						calc(-50% + var(--burst-x)),
						calc(-50% + var(--burst-y))
					) scale(0.5);
				}
			}
		`;
		document.head.appendChild(style);

		document.addEventListener("click", (e) => {
			for (let i = 0; i < numParticles; i++) {
				const particle = document.createElement("div");
				particle.textContent = T.pick(burstChars);
				const angle = (i / numParticles) * Math.PI * 2 + T.randFloat(-0.3, 0.3);
				const distance = T.rand(50, 150);
				const burstX = Math.cos(angle) * distance;
				const burstY = Math.sin(angle) * distance;

				particle.style.cssText = `
					position: fixed;
					left: ${e.clientX}px;
					top: ${e.clientY}px;
					pointer-events: none;
					z-index: 10000;
					font-size: ${T.rand(16, 32)}px;
					--burst-x: ${burstX}px;
					--burst-y: ${burstY}px;
					animation: click-burst ${T.randFloat(0.5, 1)}s ease-out forwards;
				`;
				document.body.appendChild(particle);
				setTimeout(() => particle.remove(), 1000);
			}
		});
	}

	function addMouseTrail() {
		// 20% chance
		if (Math.random() > 0.2) return;

		const trailLength = T.rand(5, 12);
		const trailElements = [];
		const trailStyle = T.pick(["circles", "emoji", "squares", "gradient"]);

		const trailConfigs = {
			circles: { char: "●", colors: true },
			emoji: {
				char: T.pick(["🦝", "⭐", "💖", "🔥", "👁️", "✨"]),
				colors: false,
			},
			squares: { char: "■", colors: true },
			gradient: { char: "●", colors: "rainbow" },
		};
		const config = trailConfigs[trailStyle];

		for (let i = 0; i < trailLength; i++) {
			const el = document.createElement("div");
			el.textContent = config.char;
			const size = 20 - i * 1.5;
			let color = "";
			if (config.colors === true) {
				color = `color: ${T.randomColor()};`;
			} else if (config.colors === "rainbow") {
				const hue = (i / trailLength) * 360;
				color = `color: hsl(${hue}, 100%, 50%);`;
			}
			el.style.cssText = `
				position: fixed;
				pointer-events: none;
				z-index: 9998;
				font-size: ${size}px;
				${color}
				transition: left 0.1s ease-out, top 0.1s ease-out;
				opacity: ${1 - i / trailLength};
			`;
			document.body.appendChild(el);
			trailElements.push({ el, x: 0, y: 0 });
		}

		document.addEventListener("mousemove", (e) => {
			trailElements[0].x = e.clientX;
			trailElements[0].y = e.clientY;
		});

		function updateTrail() {
			for (let i = trailElements.length - 1; i > 0; i--) {
				trailElements[i].x +=
					(trailElements[i - 1].x - trailElements[i].x) * 0.3;
				trailElements[i].y +=
					(trailElements[i - 1].y - trailElements[i].y) * 0.3;
			}
			for (const t of trailElements) {
				t.el.style.left = `${t.x}px`;
				t.el.style.top = `${t.y}px`;
			}
			requestAnimationFrame(updateTrail);
		}
		updateTrail();
	}

	function applyGeocitiesStyles() {
		injectGeocitiesStyles();

		// Large containers should be transparent/semi-transparent so body bg shows through
		const transparentContainers = ["MAIN", "ARTICLE", "SECTION"];

		const elements = document.querySelectorAll(
			"header, main, footer, nav, article, section, h1, h2, h3, p, li, a, pre, code, .post-list, .tags, .theme-switcher",
		);

		elements.forEach((el) => {
			// Make large containers transparent so body pattern is visible
			if (transparentContainers.includes(el.tagName)) {
				// 50% chance of transparent, 50% chance of semi-transparent color
				if (Math.random() > 0.5) {
					el.style.background = "transparent";
				} else {
					el.style.background = T.randomColor(T.randFloat(0.1, 0.4));
				}
			} else {
				el.style.background = T.randomBackground();
			}
			el.style.color = T.randomColor();

			if (Math.random() > 0.5) {
				const border = T.pick(T.geocitiesBorders);
				el.style.border = `${T.rand(2, 5)}px ${border} ${T.randomColor()}`;
			}

			// Use readable fonts for content, allow icon fonts elsewhere
			if (el.tagName.match(/^H[1-6]$/) || Math.random() > 0.7) {
				const fontList = isContentArea(el)
					? T.geocitiesReadableFonts
					: T.geocitiesFonts;
				el.style.fontFamily = T.pick(fontList);
			}
		});

		// Apply all the cursed extras
		marqueeifyText();
		rainbowifyHeadings();
		addCursors();
		addTooltips();
		addTypographyChaos();
		addTextEffects();
		addVisualChaos();
		addWritingModesChaos();
		addBackgroundPatterns();
		addHrStyling();
		spinAndBounce();
		addStatusBar();
		addLensFlare();
		addPageEntryAnimation();
		addRandomAnimations();
		addSparkleTrail();
		addFallingParticles();
		addTwinklingStars();
		addClickBurst();
		addMouseTrail();
		addHoverEffects();
		addCursorRepulsion();
	}

	// Expose on window for dynamic loading
	window.applyGeocitiesTheme = applyGeocitiesStyles;
})();
