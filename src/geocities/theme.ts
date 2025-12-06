import {
	addAsciiAnimation,
	addFireEffect,
	addMatrixRain,
	addSpinningShape,
	addUnderConstructionBanner,
} from "./canvas";
import {
	geocitiesBorders,
	geocitiesFonts,
	geocitiesReadableFonts,
} from "./data";
import {
	addBackgroundPatterns,
	addCursors,
	addHrStyling,
	addTextEffects,
	addTooltips,
	addTypographyChaos,
	addVisualChaos,
	addWritingModesChaos,
	marqueeifyText,
	rainbowifyHeadings,
	spinAndBounce,
} from "./dom-effects";
import {
	addClickBurst,
	addCursorRepulsion,
	addHoverEffects,
	addInteractiveCursors,
	addMouseTrail,
} from "./interactions";
import { addMusicPlayer } from "./music";
import {
	addFallingParticles,
	addLensFlare,
	addPageEntryAnimation,
	addRandomAnimations,
	addSparkleTrail,
	addTwinklingStars,
	isContentArea,
} from "./particles";
import { scoring } from "./scoring";
import { addStatusBar, statusBarOffsets } from "./status-bar";
import { injectGeocitiesStyles } from "./styles";

const T = window.ThemeUtils;

/**
 * Main entry point for the geocities theme. Applies all visual chaos: random colors,
 * fonts, borders, animations, particles, canvas effects, status bars, and the music player.
 */
export function applyGeocitiesStyles() {
	injectGeocitiesStyles();

	// Large containers should be transparent/semi-transparent so body bg shows through
	const transparentContainers = ["MAIN", "ARTICLE", "SECTION"];

	const elements = document.querySelectorAll<HTMLElement>(
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
			const border = T.pick(geocitiesBorders);
			el.style.border = `${T.rand(2, 5)}px ${border} ${T.randomColor()}`;
		}

		// Use readable fonts for content, allow icon fonts elsewhere
		if (el.tagName.match(/^H[1-6]$/) || Math.random() > 0.7) {
			const fontList = isContentArea(el)
				? geocitiesReadableFonts
				: geocitiesFonts;
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
	addInteractiveCursors();

	// Canvas and ASCII animations
	addUnderConstructionBanner();
	addSpinningShape();
	addAsciiAnimation();
	addFireEffect();
	addMatrixRain();

	// Music player (40% chance)
	if (Math.random() < 0.4) {
		addMusicPlayer(statusBarOffsets);
	}

	// Show score counter if user already has points
	if (scoring.totalScore > 0) {
		scoring.showFloatingCounter();
	}

	// Reveal content now that geocities is fully applied
	T.revealGeocitiesContent();
}
