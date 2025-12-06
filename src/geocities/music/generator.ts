import {
	isBreakPlaying,
	playBreak,
	shouldTriggerBreak,
	skipBreak,
} from "./breaks";
import {
	FADE_TIME,
	noteNames,
	progressions,
	STEPS_PER_BAR,
	scales,
} from "./data";
import { musicEvents } from "./events";
import { genres, selectGenre } from "./genres";
import { announceSection, randomizeVoice, setLyricsPlayerMode } from "./lyrics";
import {
	dequeueNext,
	finishTransition,
	getActiveDeckId,
	getAutomixSettings,
	getDeckOutput,
	getIncomingStartDelay,
	initMixer,
	isAutomixEnabled,
	isInTransition,
	peekNext,
	queueItem,
	startPlayback,
	startTransition,
	stopMixer,
} from "./mixer";
import { getPostAgeEffect } from "./mood";
import { generatePattern } from "./patterns";
import { getTotalBars, structures } from "./structures";
import {
	playArp,
	playBass,
	playDrum,
	playNote,
	playPad,
	setSynthContext,
	setSynthOutput,
	setSynthSong,
} from "./synths";
import { generateTrackName } from "./track-names";
import type {
	DeckId,
	Genre,
	GenreType,
	Pattern,
	PlayableItem,
	ScaleType,
	Section,
	SectionState,
	Song,
	SongStructure,
	VisualState,
} from "./types";

const T = window.ThemeUtils;

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let effectsGain: GainNode | null = null;
let sidechainGain: GainNode | null = null; // For kick ducking
let delayNode: DelayNode | null = null;
let delayFeedback: GainNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let filterLFO: OscillatorNode | null = null;
let filterLFOGain: GainNode | null = null;
let analyser: AnalyserNode | null = null;
// Vinyl crackle / tape hiss for lofi and vaporwave
let vinylNoiseSource: AudioBufferSourceNode | null = null;
let vinylNoiseGain: GainNode | null = null;
let vinylCrackleGain: GainNode | null = null;
// Bitcrusher for chiptune/midi crunch
let bitcrusherNode: WaveShaperNode | null = null;
let bitcrusherMix: GainNode | null = null;
let cleanMix: GainNode | null = null;
let isPlaying = false;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let pageEmojis: string[] = [];
let lockedGenre: GenreType | null = null;
let radioGenres: GenreType[] = []; // Current station's preferred genres
let loopEnabled = false;
let chaosLevel = 0.5; // 0-1, affects density, detuning, filter wobble
let postAgeEffect = 0; // 0-1, dusty tape treatment for old posts

// When mixer transition completes, prepare the next item for the queue
musicEvents.on("transitionComplete", () => {
	const song = getCurrentSong();
	if (song) {
		prepareNextItem(song.tempo);
	}
});

// ============================================
// Per-Deck Playback State
// ============================================

/** Playback state for a single deck */
type DeckPlayback = {
	song: Song | null;
	sectionIndex: number;
	sectionStep: number;
	nextNoteTime: number;
	songEndingEmitted: boolean;
};

function createEmptyDeckPlayback(): DeckPlayback {
	return {
		song: null,
		sectionIndex: 0,
		sectionStep: 0,
		nextNoteTime: 0,
		songEndingEmitted: false,
	};
}

/** Playback state per deck for dual-deck mixing */
const deckPlayback: Record<DeckId, DeckPlayback> = {
	A: createEmptyDeckPlayback(),
	B: createEmptyDeckPlayback(),
};

/** Get playback state for the active deck */
function getActiveDeckPlayback(): DeckPlayback {
	return deckPlayback[getActiveDeckId()];
}

/** Get playback state for the inactive deck (used in dual scheduling) */
function getInactiveDeckPlayback(): DeckPlayback {
	const inactiveId = getActiveDeckId() === "A" ? "B" : "A";
	return deckPlayback[inactiveId];
}

/** Get playback state for a specific deck */
function getDeckPlayback(deckId: DeckId): DeckPlayback {
	return deckPlayback[deckId];
}

/** Initialize the inactive deck with a song for transition overlap */
function initIncomingDeck(song: Song, startDelay = 0): void {
	const deck = getInactiveDeckPlayback();
	deck.song = song;
	deck.sectionIndex = 0;
	deck.sectionStep = 0;
	deck.songEndingEmitted = false;
	if (ctx) {
		deck.nextNoteTime = ctx.currentTime + startDelay;
	}
}

// Legacy accessor for backwards compatibility
function getCurrentSong(): Song | null {
	return getActiveDeckPlayback().song;
}

// Tape vs Radio mode
type PlayerMode = "tape" | "radio";
type TapeSide = "A" | "B";
let playerMode: PlayerMode = "tape"; // Default to tape mode (page-reactive)
let tapeSide: TapeSide = "A";
const trackMutes = {
	melody: false,
	bass: false,
	drums: false,
	arpeggio: false,
	pad: false,
};

/** Pick a random value within a [min, max] range */
function pickFromRange(range: [number, number]): number {
	return range[0] + Math.random() * (range[1] - range[0]);
}

function getContext() {
	if (!ctx) {
		ctx = new (
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext })
				.webkitAudioContext
		)();

		// Create analyser for visualizer
		analyser = ctx.createAnalyser();
		analyser.fftSize = 64;
		analyser.smoothingTimeConstant = 0.8;

		// Create effects chain: source -> sidechain -> filter -> delay -> master -> analyser -> destination
		masterGain = ctx.createGain();
		masterGain.gain.value = 0;

		// Sidechain gain - will be ducked by kick drum
		sidechainGain = ctx.createGain();
		sidechainGain.gain.value = 1;

		effectsGain = ctx.createGain();
		effectsGain.gain.value = 0.4;

		// Delay for spacey feel
		delayNode = ctx.createDelay(0.5);
		delayNode.delayTime.value = 0.25;

		delayFeedback = ctx.createGain();
		delayFeedback.gain.value = 0.3;

		// Global filter for warmth (with LFO modulation)
		filterNode = ctx.createBiquadFilter();
		filterNode.type = "lowpass";
		filterNode.frequency.value = 8000;
		filterNode.Q.value = 0.5;

		// Filter LFO for wobble effect
		filterLFO = ctx.createOscillator();
		filterLFOGain = ctx.createGain();
		filterLFO.type = "sine";
		filterLFO.frequency.value = 0.25; // Slow wobble
		filterLFOGain.gain.value = 0; // Off by default, enabled during drops
		filterLFO.connect(filterLFOGain);
		filterLFOGain.connect(filterNode.frequency);
		filterLFO.start();

		// Bitcrusher waveshaper (staircase curve for bit reduction)
		bitcrusherNode = ctx.createWaveShaper();
		bitcrusherNode.curve = createBitcrusherCurve(6);
		bitcrusherNode.oversample = "none"; // No oversampling for that aliasing crunch

		// Mix nodes for wet/dry bitcrusher
		bitcrusherMix = ctx.createGain();
		bitcrusherMix.gain.value = 0; // Off by default
		cleanMix = ctx.createGain();
		cleanMix.gain.value = 1;

		// Connect effects chain
		// Melodic content goes through sidechain
		masterGain.connect(sidechainGain);
		sidechainGain.connect(filterNode);

		// Split to clean and crushed paths
		filterNode.connect(cleanMix);
		filterNode.connect(bitcrusherNode);
		bitcrusherNode.connect(bitcrusherMix);

		// Merge paths
		cleanMix.connect(effectsGain);
		bitcrusherMix.connect(effectsGain);

		// Delay
		filterNode.connect(delayNode);
		delayNode.connect(delayFeedback);
		delayFeedback.connect(delayNode);
		delayNode.connect(effectsGain);

		// Output
		effectsGain.connect(analyser);
		analyser.connect(ctx.destination);

		// Vinyl noise chain (separate from main music)
		vinylNoiseGain = ctx.createGain();
		vinylNoiseGain.gain.value = 0; // Off by default
		vinylCrackleGain = ctx.createGain();
		vinylCrackleGain.gain.value = 0;
		vinylNoiseGain.connect(analyser); // Goes to analyser for visualization
		vinylCrackleGain.connect(analyser);

		// Initialize mixer for automix transitions
		initMixer(ctx, masterGain);

		// Initialize synth context
		setSynthContext(ctx, masterGain, sidechainGain);
	}
	if (ctx.state === "suspended") {
		ctx.resume();
	}
	return ctx;
}

function noteToFreq(note: number) {
	// note 0 = C4 (middle C)
	return 261.63 * 2 ** (note / 12);
}

/**
 * Create a staircase waveshaper curve for bit reduction effect.
 * Lower bits = more crunch.
 */
function createBitcrusherCurve(bits: number): Float32Array<ArrayBuffer> | null {
	const steps = 2 ** bits;
	const samples = 8192;
	// Explicitly create with ArrayBuffer for type compatibility
	const buffer = new ArrayBuffer(samples * 4); // 4 bytes per float32
	const curve = new Float32Array(buffer);

	for (let i = 0; i < samples; i++) {
		// Map index to -1 to 1
		const x = (i * 2) / samples - 1;
		// Quantize to steps
		curve[i] = Math.round(x * steps) / steps;
	}

	return curve;
}

/**
 * Internal helper to load a song after transitioning (used by automix and ad breaks).
 */
function loadSongInternal(song: Song) {
	const deck = getActiveDeckPlayback();
	deck.song = song;
	setSynthSong(song);
	deck.sectionIndex = 0;
	deck.sectionStep = 0;
	deck.songEndingEmitted = false;

	// Reset timing to start from now
	if (ctx) {
		deck.nextNoteTime = ctx.currentTime;
	}

	// Apply new song's effects
	if (delayNode && delayFeedback) {
		delayNode.delayTime.value = 60 / song.tempo / 2;
		delayFeedback.gain.value = song.delayAmount;
	}
	if (filterNode) {
		filterNode.frequency.value = song.filterCutoff;
	}
	updateVinylNoise();
	updateBitcrusher();

	// Prepare what's coming next (for "Next up" display)
	prepareNextItem(song.tempo);
}

/**
 * Pre-queue what's coming next after the current song.
 * This is called when a song starts so the queue has items for "Next up" display.
 */
function prepareNextItem(currentTempo?: number) {
	// Don't prepare if loop is enabled or queue already has items
	if (loopEnabled || peekNext()) {
		return;
	}

	// Determine if we should have a break
	const breakItem = shouldTriggerBreak(playerMode);
	if (breakItem) {
		queueItem(breakItem);
	}

	// Generate and queue the next song
	const visualState = sampleVisualState();
	const nextSong = generateSong(visualState, currentTempo);
	queueItem({ kind: "song", song: nextSong });
}

/**
 * Update bitcrusher amount based on current genre and chaos level.
 */
function updateBitcrusher() {
	if (!bitcrusherMix || !cleanMix || !ctx) return;
	const currentSong = getCurrentSong();
	if (!currentSong) {
		bitcrusherMix.gain.value = 0;
		cleanMix.gain.value = 1;
		return;
	}

	const genre = currentSong.genre.name;
	const now = ctx.currentTime;

	// Bitcrusher amount by genre
	let crushAmount = 0;
	if (genre === "chiptune") {
		crushAmount = 0.4 + chaosLevel * 0.3; // 40-70% crush
	} else if (genre === "midi") {
		crushAmount = 0.3 + chaosLevel * 0.2; // 30-50% crush
	} else if (genre === "happycore") {
		crushAmount = 0.15 + chaosLevel * 0.2; // 15-35% crush
	} else {
		crushAmount = chaosLevel * 0.1; // 0-10% based on chaos only
	}

	// Smooth transition
	bitcrusherMix.gain.linearRampToValueAtTime(crushAmount, now + 0.3);
	cleanMix.gain.linearRampToValueAtTime(1 - crushAmount * 0.5, now + 0.3);
}

/** Get current time slot for mood influence */
function getTimeSlot(): VisualState["timeSlot"] {
	const hour = new Date().getHours();
	if (hour >= 2 && hour < 5) return "lateNight";
	if (hour >= 5 && hour < 9) return "earlyMorning";
	if (hour >= 9 && hour < 12) return "morning";
	if (hour >= 12 && hour < 17) return "afternoon";
	if (hour >= 17 && hour < 21) return "evening";
	return "night"; // 9 PM - 2 AM
}

/** Check if it's a weekend night (Fri/Sat after 9 PM) */
function isWeekendNight(): boolean {
	const now = new Date();
	const day = now.getDay();
	const hour = now.getHours();
	// Friday (5) or Saturday (6) after 9 PM, or Sunday (0) before 5 AM
	return ((day === 5 || day === 6) && hour >= 21) || (day === 0 && hour < 5);
}

/** Get post age in days from article:published_time meta tag */
function getPostAgeDays(): number | null {
	const meta = document.querySelector(
		'meta[property="article:published_time"]',
	);
	if (!meta) return null;
	const published = meta.getAttribute("content");
	if (!published) return null;
	const publishDate = new Date(published);
	if (Number.isNaN(publishDate.getTime())) return null;
	const now = new Date();
	const diffMs = now.getTime() - publishDate.getTime();
	return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** Sample visual state from the page for content-aware music generation */
function sampleVisualState(): VisualState {
	const state: VisualState = {
		// Visual properties
		dominantHue: 0,
		saturation: 50,
		lightness: 50,
		hasStripes: false,
		hasGradient: false,

		// Page structure
		elementCount: 0,
		marqueesCount: 0,
		emojiTypes: [],
		chaosLevel: 0,

		// Content-aware analysis
		codeBlockCount: 0,
		blockquoteCount: 0,
		avgParagraphLength: 0,
		listCount: 0,
		headerCount: 0,
		externalLinkCount: 0,
		imageCount: 0,

		// Time-based
		timeSlot: getTimeSlot(),
		isWeekendNight: isWeekendNight(),

		// Post-specific
		postAgeDays: getPostAgeDays(),
	};

	// Extract color from background
	const htmlStyle = getComputedStyle(document.documentElement);
	const bgImage = htmlStyle.backgroundImage;
	const bgColor = htmlStyle.backgroundColor;

	if (bgColor && bgColor !== "rgba(0, 0, 0, 0)") {
		const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
		if (match) {
			const r = Number.parseInt(match[1] ?? "0", 10) / 255;
			const g = Number.parseInt(match[2] ?? "0", 10) / 255;
			const b = Number.parseInt(match[3] ?? "0", 10) / 255;
			const max = Math.max(r, g, b);
			const min = Math.min(r, g, b);
			const l = (max + min) / 2;
			let h = 0;
			let s = 0;
			if (max !== min) {
				const d = max - min;
				s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
				if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
				else if (max === g) h = ((b - r) / d + 2) / 6;
				else h = ((r - g) / d + 4) / 6;
			}
			state.dominantHue = Math.round(h * 360);
			state.saturation = Math.round(s * 100);
			state.lightness = Math.round(l * 100);
		}
	}

	if (bgImage) {
		state.hasStripes = bgImage.includes("repeating-linear-gradient");
		state.hasGradient = bgImage.includes("gradient");
	}

	// Page structure
	state.elementCount = document.querySelectorAll("*").length;
	state.marqueesCount = document.querySelectorAll("marquee").length;

	// Emoji detection
	const pageText = document.body.innerText || "";
	const emojiMatches = pageText.match(/[\u{1F300}-\u{1F9FF}]/gu) || [];
	state.emojiTypes = [...new Set(emojiMatches)].slice(0, 10);

	// Chaos level from animations
	const animations = document.querySelectorAll('[class*="geocities-"]').length;
	const particles = document.querySelectorAll(
		".twinkle-star, .falling-particle, .sparkle-trail",
	).length;
	state.chaosLevel = Math.min(
		100,
		animations * 2 + particles + state.marqueesCount * 5,
	);

	// Content-aware analysis (focus on main content area if present)
	const contentArea =
		document.querySelector(".post-content, main, article") || document.body;

	// Code blocks → digital, chiptune vibe
	state.codeBlockCount = contentArea.querySelectorAll(
		"pre code, pre, code",
	).length;

	// Blockquotes → reflective, nostalgic
	state.blockquoteCount = contentArea.querySelectorAll("blockquote").length;

	// Paragraph analysis → longer = slower, more ambient
	const paragraphs = contentArea.querySelectorAll("p");
	if (paragraphs.length > 0) {
		let totalLength = 0;
		for (let i = 0; i < paragraphs.length; i++) {
			totalLength += (paragraphs[i]?.textContent || "").trim().length;
		}
		state.avgParagraphLength = Math.round(totalLength / paragraphs.length);
	}

	// Lists → rhythmic, structured patterns
	state.listCount = contentArea.querySelectorAll("ul, ol").length;

	// Headers → more song structure changes
	state.headerCount = contentArea.querySelectorAll(
		"h1, h2, h3, h4, h5, h6",
	).length;

	// External links → exploratory, wandering melodies
	const links = contentArea.querySelectorAll("a[href]");
	let externalCount = 0;
	for (let i = 0; i < links.length; i++) {
		const link = links[i];
		if (!link) continue;
		const href = link.getAttribute("href") || "";
		// External if starts with http and different host, or has target="_blank"
		if (
			link.getAttribute("target") === "_blank" ||
			(href.startsWith("http") && !href.includes(window.location.host))
		) {
			externalCount++;
		}
	}
	state.externalLinkCount = externalCount;

	// Images → visual density
	state.imageCount = contentArea.querySelectorAll("img").length;

	return state;
}

// Select scale based on visual state and genre preferences
function selectScale(visualState: VisualState, genre: Genre): ScaleType {
	// Some visual cues override genre preferences
	const hasSpooky = visualState.emojiTypes.some((e) =>
		["👻", "💀", "🎃", "🦇"].includes(e),
	);
	if (hasSpooky) return "phrygian";

	const hasLoveEmoji = visualState.emojiTypes.some((e) =>
		["💖", "💕", "❤️", "💗", "✨"].includes(e),
	);
	if (hasLoveEmoji) return "major";

	// Otherwise pick from genre's preferred scales
	return T.pick(genre.preferredScales);
}

// Select structure based on genre
function selectStructure(genre: Genre): SongStructure {
	const find = (name: string) =>
		structures.find((s) => s.name === name) ?? T.pick(structures);

	// Match structures to genres with some randomization
	if (genre.name === "ambient") {
		return T.pick([
			find("Ambient"),
			find("Chill"),
			find("Minimal"),
			find("Drone"),
		]);
	}
	if (genre.name === "vaporwave") {
		return T.pick([
			find("Ambient"),
			find("Chill"),
			find("Loop"),
			find("Drone"),
		]);
	}
	if (genre.name === "techno") {
		return T.pick([
			find("Build-Drop"),
			find("Minimal"),
			find("Rave"),
			find("Breakdown-Heavy"),
		]);
	}
	if (genre.name === "trance") {
		return T.pick([
			find("Build-Drop"),
			find("Epic"),
			find("Rave"),
			find("Breakdown-Heavy"),
			find("Double Drop"),
		]);
	}
	if (genre.name === "happycore") {
		return T.pick([
			find("Rave"),
			find("Build-Drop"),
			find("Loop"),
			find("Double Drop"),
		]);
	}
	if (genre.name === "lofi") {
		return T.pick([
			find("Loop"),
			find("Chill"),
			find("AABA"),
			find("12-Bar Blues"),
			find("Rondo"),
		]);
	}
	if (genre.name === "midi") {
		return T.pick([
			find("Loop"),
			find("Verse-Chorus"),
			find("AABA"),
			find("Rondo"),
		]);
	}
	if (genre.name === "synthwave") {
		return T.pick([
			find("Verse-Chorus"),
			find("Epic"),
			find("Through-Composed"),
			find("Rondo"),
		]);
	}
	if (genre.name === "chiptune") {
		return T.pick([
			find("Loop"),
			find("Verse-Chorus"),
			find("AABA"),
			find("Rondo"),
		]);
	}
	// Fallback: random structure
	return T.pick(structures);
}

/**
 * Generate a complete song with all sections.
 * @param visualState - Page visual state for genre/scale selection
 * @param targetTempo - Optional tempo to match (for automix beatmatching)
 */
function generateSong(visualState: VisualState, targetTempo?: number): Song {
	// Store emojis for announcements
	pageEmojis = visualState.emojiTypes;

	// Calculate post age effect for dusty tape treatment
	postAgeEffect = getPostAgeEffect(visualState.postAgeDays);

	// Pick a random voice for this song's announcements
	randomizeVoice();

	// Genre selection depends on mode:
	// - Radio mode with lock: use locked genre
	// - Radio mode without lock: pick from station's preferred genres
	// - Tape mode: use page analysis, with B-side inversion if on side B
	let genre: Genre;
	if (playerMode === "radio") {
		if (lockedGenre) {
			genre = genres[lockedGenre];
		} else if (radioGenres.length > 0) {
			genre = genres[T.pick(radioGenres)];
		} else {
			genre = genres.lofi; // Fallback
		}
	} else {
		// Tape mode: page-reactive with B-side support
		// Chaos slider controls genre variety (how surprising the genre picks are)
		const bSide = tapeSide === "B";
		const variety = 0.15 + chaosLevel * 0.5; // Range: 0.15-0.65
		genre = selectGenre(visualState, bSide, variety);
	}
	const structure = selectStructure(genre);
	const scaleName = selectScale(visualState, genre);
	const scale = scales[scaleName];
	const rootNote = Math.floor((visualState.dominantHue / 360) * 12);

	// Tempo selection: match target if provided (for automix), otherwise random
	let tempo: number;
	if (targetTempo !== undefined) {
		// Clamp target to genre's range, with small variation for natural feel
		const [minTempo, maxTempo] = genre.tempoRange;
		const clampedTempo = Math.max(minTempo, Math.min(maxTempo, targetTempo));
		// Add slight variation (±3%) to avoid exact match sounding robotic
		const variation = clampedTempo * (0.97 + Math.random() * 0.06);
		tempo = Math.max(minTempo, Math.min(maxTempo, variation));
	} else {
		tempo = pickFromRange(genre.tempoRange);
	}

	const progIndex = (rootNote + visualState.elementCount) % progressions.length;
	const progression = progressions[progIndex] ?? [0, 3, 4, 4];

	// Pick random synthesis parameters from genre ranges for this song
	const delayAmount = pickFromRange(genre.delayRange);
	const filterCutoff = pickFromRange(genre.filterRange);
	const detune = pickFromRange(genre.detuneRange);
	const attack = pickFromRange(genre.attackRange);
	const swing = pickFromRange(genre.swingRange);

	// Generate patterns for each unique section type
	const patterns = new Map<Section["type"], Pattern>();
	const seenTypes = new Set<Section["type"]>();

	for (const section of structure.sections) {
		if (!seenTypes.has(section.type)) {
			seenTypes.add(section.type);
			patterns.set(
				section.type,
				generatePattern({
					section,
					genre,
					scale,
					rootNote,
					progression,
					tempo,
					delayAmount,
					filterCutoff,
				}),
			);
		}
	}

	return {
		genre,
		structure,
		tempo,
		rootNote,
		scale,
		scaleName,
		progression,
		patterns,
		totalBars: getTotalBars(structure),
		trackName: generateTrackName(visualState, genre, rootNote, playerMode),
		delayAmount,
		filterCutoff,
		detune,
		attack,
		swing,
	};
}

// Calculate swing timing offset for a step
// Swing delays every other 16th note (odd steps) by a fraction of the step duration
function getSwingOffset(
	step: number,
	swing: number,
	stepDuration: number,
): number {
	// Only apply swing to odd 16th notes (off-beats)
	if (step % 2 === 1 && swing > 0) {
		return swing * stepDuration;
	}
	return 0;
}

// Calculate humanization jitter (small random timing variations)
function getHumanizeOffset(stepDuration: number): number {
	// Small random offset, up to 5% of step duration
	return (Math.random() - 0.5) * stepDuration * 0.05;
}

// Start vinyl crackle / tape hiss noise
function startVinylNoise() {
	const c = getContext();
	if (!vinylNoiseGain || !vinylCrackleGain) return;

	// Stop existing noise if any
	stopVinylNoise();

	// Create continuous tape hiss (filtered white noise)
	const hissBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
	const hissData = hissBuffer.getChannelData(0);
	for (let i = 0; i < hissData.length; i++) {
		hissData[i] = (Math.random() * 2 - 1) * 0.3;
	}

	vinylNoiseSource = c.createBufferSource();
	vinylNoiseSource.buffer = hissBuffer;
	vinylNoiseSource.loop = true;

	// Highpass filter for that tape hiss character
	const hissFilter = c.createBiquadFilter();
	hissFilter.type = "highpass";
	hissFilter.frequency.value = 4000;
	hissFilter.Q.value = 0.5;

	vinylNoiseSource.connect(hissFilter);
	hissFilter.connect(vinylNoiseGain);
	vinylNoiseSource.start();

	// Schedule random vinyl crackles/pops
	scheduleCrackles();
}

// Schedule random vinyl crackle pops
function scheduleCrackles() {
	if (!isPlaying || !ctx || !vinylCrackleGain) return;
	const currentSong = getCurrentSong();
	if (!currentSong) return;

	// Only crackle for lofi and vaporwave
	const genre = currentSong.genre.name;
	if (genre !== "lofi" && genre !== "vaporwave") return;

	const now = ctx.currentTime;

	// Random pop/click sound
	const popBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
	const popData = popBuffer.getChannelData(0);
	for (let i = 0; i < popData.length; i++) {
		// Sharp attack, quick decay
		const env = Math.exp(-i / (ctx.sampleRate * 0.003));
		popData[i] = (Math.random() * 2 - 1) * env;
	}

	const pop = ctx.createBufferSource();
	pop.buffer = popBuffer;

	// Bandpass for that vinyl character
	const popFilter = ctx.createBiquadFilter();
	popFilter.type = "bandpass";
	popFilter.frequency.value = 800 + Math.random() * 2000;
	popFilter.Q.value = 2;

	pop.connect(popFilter);
	popFilter.connect(vinylCrackleGain);
	pop.start(now);

	// Schedule next crackle (random interval 0.1-2 seconds)
	const nextCrackle = 100 + Math.random() * 1900;
	setTimeout(scheduleCrackles, nextCrackle);
}

// Stop vinyl noise
function stopVinylNoise() {
	if (vinylNoiseSource) {
		try {
			vinylNoiseSource.stop();
		} catch {
			// Already stopped
		}
		vinylNoiseSource = null;
	}
}

// Update vinyl noise level based on genre and post age
function updateVinylNoise() {
	if (!vinylNoiseGain || !vinylCrackleGain || !ctx) return;
	const currentSong = getCurrentSong();
	if (!currentSong) {
		vinylNoiseGain.gain.value = 0;
		vinylCrackleGain.gain.value = 0;
		return;
	}

	const genre = currentSong.genre.name;
	const now = ctx.currentTime;

	// Base noise levels by genre
	let hissLevel = 0;
	let crackleLevel = 0;

	if (genre === "lofi") {
		// Moderate tape hiss for lofi
		hissLevel = 0.015;
		crackleLevel = 0.08;
	} else if (genre === "vaporwave") {
		// Heavy vinyl noise for vaporwave
		hissLevel = 0.025;
		crackleLevel = 0.12;
	}

	// Post age adds dusty tape treatment to any genre
	// Older posts get more hiss and crackle (that worn cassette vibe)
	if (postAgeEffect > 0) {
		hissLevel += postAgeEffect * 0.02; // Up to +0.02 hiss
		crackleLevel += postAgeEffect * 0.06; // Up to +0.06 crackle
	}

	vinylNoiseGain.gain.linearRampToValueAtTime(hissLevel, now + 0.5);
	vinylCrackleGain.gain.linearRampToValueAtTime(crackleLevel, now + 0.5);
}

/** Get section and pattern for a specific deck */
function getSectionForDeck(
	deck: DeckPlayback,
): { section: Section; pattern: Pattern } | null {
	const song = deck.song;
	if (!song) return null;
	const sections = song.structure.sections;
	if (deck.sectionIndex >= sections.length) {
		// Song finished, loop back
		deck.sectionIndex = 0;
		deck.sectionStep = 0;
	}
	const section = sections[deck.sectionIndex];
	if (!section) return null;
	const pattern = song.patterns.get(section.type);
	if (!pattern) return null;
	return { section, pattern };
}

/**
 * Schedule notes for a single deck.
 * @param deckId - Which deck to schedule for
 * @param isOutgoing - True if this deck is fading out (outgoing in transition)
 * @returns True if more notes were scheduled, false if song ended
 */
function scheduleNotesForDeck(deckId: DeckId, isOutgoing: boolean): boolean {
	const deck = getDeckPlayback(deckId);
	const song = deck.song;
	if (!song) return false;

	const current = getSectionForDeck(deck);
	if (!current) return false;

	const c = getContext();
	const secondsPerStep = 60 / song.tempo / 4;
	const scheduleAhead = 0.1;

	// Route synth output through this deck
	setSynthOutput(getDeckOutput(deckId));

	let scheduled = false;

	while (deck.nextNoteTime < c.currentTime + scheduleAhead) {
		scheduled = true;
		const { section, pattern } = current;
		const sectionSteps = section.bars * STEPS_PER_BAR;
		const step = deck.sectionStep % sectionSteps;

		const swingOffset = getSwingOffset(step, song.swing, secondsPerStep);

		// Chaos affects various parameters
		const chaosDetune = song.detune * (0.5 + chaosLevel);
		const chaosHumanize = chaosLevel * 0.1;

		// Schedule melody notes
		if (!trackMutes.melody) {
			for (const n of pattern.melody) {
				if (n.step === step) {
					const duration = n.duration * secondsPerStep;
					const noteTime =
						deck.nextNoteTime +
						swingOffset +
						getHumanizeOffset(secondsPerStep) * (1 + chaosHumanize);
					const velocityHuman = (n.velocity || 1) * (0.9 + Math.random() * 0.2);
					playNote(noteToFreq(n.note), noteTime, duration, {
						type: T.pick(song.genre.oscTypes.melody),
						volume: 0.1 * velocityHuman,
						detune: chaosDetune,
						attack: song.attack,
						vibrato: duration > 0.4,
					});
				}
			}
		}

		// Schedule bass notes
		if (!trackMutes.bass) {
			for (const n of pattern.bass) {
				if (n.step === step) {
					const noteTime = deck.nextNoteTime + swingOffset;
					playBass(noteToFreq(n.note), noteTime, n.duration * secondsPerStep);
				}
			}
		}

		// Schedule arpeggio
		if (!trackMutes.arpeggio) {
			for (const n of pattern.arpeggio) {
				if (n.step === step) {
					const noteTime =
						deck.nextNoteTime +
						swingOffset +
						getHumanizeOffset(secondsPerStep) * (1 + chaosHumanize);
					playArp(noteToFreq(n.note), noteTime, n.duration * secondsPerStep);
				}
			}
		}

		// Schedule pad chords
		if (!trackMutes.pad) {
			for (const p of pattern.pad) {
				if (p.step === step) {
					playPad(p.notes, deck.nextNoteTime, p.duration * secondsPerStep);
				}
			}
		}

		// Schedule drums
		if (!trackMutes.drums) {
			for (const d of pattern.drums) {
				if (d.step === step) {
					const isHihat = d.type === "hihat" || d.type === "hihatOpen";
					const drumTime = isHihat
						? deck.nextNoteTime + swingOffset
						: deck.nextNoteTime;
					const velocityHuman =
						(d.velocity || 1) * (0.92 + Math.random() * 0.16);
					playDrum(d.type, drumTime, velocityHuman, d.pitch ?? null);
				}
			}
		}

		deck.nextNoteTime += secondsPerStep;
		deck.sectionStep++;

		// Only check for song ending on outgoing deck (active deck)
		if (isOutgoing && !deck.songEndingEmitted && !loopEnabled) {
			const barsRemaining = calculateBarsRemainingForDeck(deck);
			const transitionBars = getAutomixSettings().transitionBars;
			if (barsRemaining <= transitionBars && barsRemaining > 0) {
				deck.songEndingEmitted = true;
				musicEvents.emit({
					type: "songEnding",
					song: song,
					barsRemaining,
					beatTime: deck.nextNoteTime,
				});

				// Queue next song if needed
				if (isAutomixEnabled() && !peekNext()) {
					const visualState = sampleVisualState();
					const nextSong = generateSong(visualState, song.tempo);

					const breakItem = shouldTriggerBreak(playerMode);
					if (breakItem) {
						queueItem(breakItem);
					}
					queueItem({ kind: "song", song: nextSong });
				}

				// Start transition and initialize incoming deck
				// Only start transitions to songs, not breaks (breaks play after song ends)
				const nextItem = peekNext();
				if (
					isAutomixEnabled() &&
					nextItem?.kind === "song" &&
					!isInTransition()
				) {
					startTransition(nextItem, false, barsRemaining);
					// Get delay for incoming deck (e.g., echo keeps incoming silent initially)
					const incomingDelay = getIncomingStartDelay();
					initIncomingDeck(nextItem.song, incomingDelay);
				}
			}
		}

		// Check if we've finished this section
		if (deck.sectionStep >= sectionSteps) {
			deck.sectionStep = 0;
			deck.sectionIndex++;

			// Check for song end
			if (deck.sectionIndex >= song.structure.sections.length) {
				if (loopEnabled && isOutgoing) {
					deck.sectionIndex = 0;
				} else if (isOutgoing) {
					// Outgoing song ended - finish transition
					musicEvents.emit({ type: "songEnded", song: song });

					const nextItem = peekNext();
					if (isInTransition() && nextItem) {
						finishTransition();
						dequeueNext();
						// The incoming deck is now active and already has its song loaded
						// Apply effects for the new song
						const newDeck = getActiveDeckPlayback();
						if (newDeck.song) {
							setSynthSong(newDeck.song);
							if (delayNode && delayFeedback) {
								delayNode.delayTime.value = 60 / newDeck.song.tempo / 2;
								delayFeedback.gain.value = newDeck.song.delayAmount;
							}
							if (filterNode) {
								filterNode.frequency.value = newDeck.song.filterCutoff;
							}
							updateVinylNoise();
							updateBitcrusher();
							prepareNextItem(newDeck.song.tempo);
						}
					} else if (isAutomixEnabled() && nextItem) {
						startTransition(nextItem, true);
						finishTransition();
						dequeueNext();
						if (nextItem.kind === "song") {
							loadSongInternal(nextItem.song);
						} else {
							playBreak(nextItem).then(() => {
								const songItem = peekNext();
								if (songItem?.kind === "song") {
									dequeueNext();
									loadSongInternal(songItem.song);
								} else {
									const visualState = sampleVisualState();
									loadSongInternal(generateSong(visualState));
								}
							});
						}
					} else {
						// Use pre-queued items if available
						const nextItem = peekNext();
						if (nextItem) {
							dequeueNext();
							if (nextItem.kind === "song") {
								loadSongInternal(nextItem.song);
							} else {
								playBreak(nextItem).then(() => {
									const songItem = peekNext();
									if (songItem?.kind === "song") {
										dequeueNext();
										loadSongInternal(songItem.song);
									} else {
										const visualState = sampleVisualState();
										loadSongInternal(generateSong(visualState));
									}
								});
							}
						} else {
							// Fallback: generate on the fly (e.g., loop was just disabled)
							const visualState = sampleVisualState();
							loadSongInternal(generateSong(visualState));
						}
					}
					return false; // Song ended
				}
			}

			// Announce section change (only for active deck)
			if (isOutgoing || !isInTransition()) {
				const newSection = song.structure.sections[deck.sectionIndex];
				if (newSection) {
					announceSection(
						song.genre.name,
						newSection.type,
						pageEmojis,
						playerMode,
					);
					updateFilterLFO(newSection.type, newSection.energy);
				}
			}
			break; // Get fresh section on next call
		}
	}

	return scheduled;
}

/** Calculate bars remaining for a specific deck */
function calculateBarsRemainingForDeck(deck: DeckPlayback): number {
	const song = deck.song;
	if (!song) return 0;
	const sections = song.structure.sections;
	let barsRemaining = 0;

	for (let i = deck.sectionIndex; i < sections.length; i++) {
		const s = sections[i];
		if (s) {
			if (i === deck.sectionIndex) {
				const sectionBars = s.bars;
				const currentBar = Math.floor(deck.sectionStep / STEPS_PER_BAR);
				barsRemaining += sectionBars - currentBar;
			} else {
				barsRemaining += s.bars;
			}
		}
	}

	return barsRemaining;
}

// Schedule notes for the next chunk
function scheduleNotes() {
	// Don't schedule anything during breaks
	if (isBreakPlaying()) return;

	const activeDeckId = getActiveDeckId();
	const inactiveDeckId = activeDeckId === "A" ? "B" : "A";

	// Always schedule for the active deck (outgoing during transitions)
	scheduleNotesForDeck(activeDeckId, true);

	// During transitions, also schedule for the incoming deck
	if (isInTransition()) {
		const incomingDeck = getDeckPlayback(inactiveDeckId);
		if (incomingDeck.song) {
			scheduleNotesForDeck(inactiveDeckId, false);
		}
	}
}

function scheduler() {
	if (!isPlaying) return;
	scheduleNotes();
	schedulerTimer = setTimeout(scheduler, 25);
}

// Update filter LFO based on section type and energy
function updateFilterLFO(sectionType: string, energy: number) {
	const currentSong = getCurrentSong();
	if (!filterLFO || !filterLFOGain || !filterNode || !ctx || !currentSong)
		return;

	const isEDM =
		currentSong.genre.name === "techno" || currentSong.genre.name === "trance";
	const isDrop = sectionType === "drop";
	const isBreakdown = sectionType === "breakdown";
	const isChorus = sectionType === "chorus";

	if (isDrop && isEDM) {
		// Fast wobble during EDM drops
		filterLFO.frequency.setValueAtTime(2, ctx.currentTime);
		filterLFOGain.gain.linearRampToValueAtTime(
			currentSong.filterCutoff * 0.4,
			ctx.currentTime + 0.5,
		);
	} else if (isBreakdown) {
		// Slow sweep during breakdowns
		filterLFO.frequency.setValueAtTime(0.1, ctx.currentTime);
		filterLFOGain.gain.linearRampToValueAtTime(
			currentSong.filterCutoff * 0.3,
			ctx.currentTime + 0.5,
		);
	} else if (isChorus && energy > 0.7) {
		// Subtle movement during high-energy chorus
		filterLFO.frequency.setValueAtTime(0.5, ctx.currentTime);
		filterLFOGain.gain.linearRampToValueAtTime(
			currentSong.filterCutoff * 0.15,
			ctx.currentTime + 0.3,
		);
	} else {
		// Fade out LFO
		filterLFOGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
	}
}

export function generate() {
	const visualState = sampleVisualState();
	const song = generateSong(visualState);
	const deck = getActiveDeckPlayback();
	deck.song = song;
	setSynthSong(song);
	deck.sectionIndex = 0;
	deck.sectionStep = 0;
	deck.songEndingEmitted = false;

	// Prepare what's coming next (for "Next up" display)
	prepareNextItem(song.tempo);

	return song;
}

/** Skip to next track (manual skip) */
export function nextTrack() {
	if (!isPlaying) {
		generate();
		return;
	}

	// Skip any current break first
	if (isBreakPlaying()) {
		skipBreak();
	}

	const deck = getActiveDeckPlayback();

	// Emit song ended for current
	if (deck.song) {
		musicEvents.emit({ type: "songEnded", song: deck.song });
	}

	// Find next song in queue (skip any breaks)
	let nextSong: Song | null = null;
	while (peekNext()) {
		const nextItem = dequeueNext();
		if (nextItem?.kind === "song") {
			nextSong = nextItem.song;
			break;
		}
		// Skip non-song items (breaks)
	}

	if (nextSong) {
		// Start and immediately finish transition for manual skip
		startTransition({ kind: "song", song: nextSong }, true);
		finishTransition();
		deck.song = nextSong;
		setSynthSong(nextSong);
	} else {
		// Generate new song
		const visualState = sampleVisualState();
		deck.song = generateSong(visualState);
		setSynthSong(deck.song);

		// Maybe queue a break before next song
		const breakItem = shouldTriggerBreak(playerMode);
		if (breakItem) {
			queueItem(breakItem);
		}
	}

	deck.sectionIndex = 0;
	deck.sectionStep = 0;
	deck.songEndingEmitted = false;

	// Apply new song's effects
	if (deck.song && delayNode && delayFeedback) {
		delayNode.delayTime.value = 60 / deck.song.tempo / 2;
		delayFeedback.gain.value = deck.song.delayAmount;
	}
	if (deck.song && filterNode) {
		filterNode.frequency.value = deck.song.filterCutoff;
	}
	updateVinylNoise();
	updateBitcrusher();
	clearDelayBuffer();

	// Announce the first section
	if (deck.song) {
		const firstSection = deck.song.structure.sections[0];
		if (firstSection) {
			announceSection(
				deck.song.genre.name,
				firstSection.type,
				pageEmojis,
				playerMode,
			);
			updateFilterLFO(firstSection.type, firstSection.energy);
		}
	}
}

// Clear the delay buffer by temporarily killing feedback
function clearDelayBuffer() {
	if (!delayFeedback || !ctx) return;
	const savedFeedback = delayFeedback.gain.value;
	delayFeedback.gain.setValueAtTime(0, ctx.currentTime);
	delayFeedback.gain.setValueAtTime(savedFeedback, ctx.currentTime + 0.5);
}

export function play() {
	if (isPlaying) return;
	const deck = getActiveDeckPlayback();
	if (!deck.song) generate();
	const c = getContext();
	const currentSong = deck.song;
	if (!currentSong || !masterGain) return;

	// Apply song-specific effects
	if (delayNode && delayFeedback) {
		delayNode.delayTime.value = 60 / currentSong.tempo / 2;
		delayFeedback.gain.value = currentSong.delayAmount;
	}
	if (filterNode) {
		filterNode.frequency.value = currentSong.filterCutoff;
	}

	isPlaying = true;
	deck.nextNoteTime = c.currentTime + 0.1;

	// Initialize mixer deck for playback (ensures active deck gain = 1)
	startPlayback();

	// Announce the first section and set up effects
	const firstSection = currentSong.structure.sections[deck.sectionIndex];
	if (firstSection) {
		announceSection(
			currentSong.genre.name,
			firstSection.type,
			pageEmojis,
			playerMode,
		);
		updateFilterLFO(firstSection.type, firstSection.energy);
	}

	// Fade in
	masterGain.gain.cancelScheduledValues(c.currentTime);
	masterGain.gain.setValueAtTime(0, c.currentTime);
	masterGain.gain.linearRampToValueAtTime(1, c.currentTime + FADE_TIME);

	// Start vinyl noise for lofi/vaporwave
	startVinylNoise();
	updateVinylNoise();

	// Apply bitcrusher for chiptune/midi
	updateBitcrusher();

	scheduler();
}

export function stop(fadeOut = false) {
	if (!isPlaying) return;

	if (fadeOut && ctx && masterGain) {
		// Fade out for track transitions
		masterGain.gain.cancelScheduledValues(ctx.currentTime);
		masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
		masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_TIME);
	} else if (ctx && masterGain) {
		// Immediate stop (pause)
		masterGain.gain.cancelScheduledValues(ctx.currentTime);
		masterGain.gain.setValueAtTime(0, ctx.currentTime);
		clearDelayBuffer();
	}

	const cleanup = (fullReset: boolean) => {
		isPlaying = false;
		stopVinylNoise();
		if (schedulerTimer) {
			clearTimeout(schedulerTimer);
			schedulerTimer = null;
		}
		// Only reset deck and mixer state on full stop, not on pause
		if (fullReset) {
			stopMixer();
			deckPlayback.A = createEmptyDeckPlayback();
			deckPlayback.B = createEmptyDeckPlayback();
		}
	};

	if (fadeOut) {
		setTimeout(() => cleanup(true), FADE_TIME * 1000);
	} else {
		cleanup(false);
	}
}

export function setVolume(vol: number) {
	if (effectsGain) {
		effectsGain.gain.value = Math.max(0, Math.min(1, vol));
	}
}

export function getVolume() {
	return effectsGain ? effectsGain.gain.value : 0.4;
}

// Genre lock - lock to a specific genre or null to auto-detect
export function setLockedGenre(genre: GenreType | null) {
	lockedGenre = genre;
}

export function getLockedGenre(): GenreType | null {
	return lockedGenre;
}

// Radio genres - the current station's preferred genres to pick from
export function setRadioGenres(genres: GenreType[]) {
	radioGenres = genres;
}

// Loop mode - loop current song instead of generating new ones
export function setLoopEnabled(enabled: boolean) {
	loopEnabled = enabled;
}

export function getLoopEnabled(): boolean {
	return loopEnabled;
}

// Track muting
export function setTrackMute(
	track: "melody" | "bass" | "drums" | "arpeggio" | "pad",
	muted: boolean,
) {
	trackMutes[track] = muted;
}

export function getTrackMute(
	track: "melody" | "bass" | "drums" | "arpeggio" | "pad",
): boolean {
	return trackMutes[track];
}

export function getTrackMutes() {
	return { ...trackMutes };
}

// Chaos level (0-1)
export function setChaosLevel(level: number) {
	chaosLevel = Math.max(0, Math.min(1, level));
	// Apply chaos to filter LFO intensity
	if (filterLFOGain && ctx) {
		const deck = getActiveDeckPlayback();
		const currentSection = deck.song?.structure.sections[deck.sectionIndex];
		if (currentSection?.type === "drop" || currentSection?.type === "chorus") {
			filterLFOGain.gain.value =
				(deck.song?.filterCutoff ?? 5000) * 0.2 * chaosLevel;
		}
	}
	// Update bitcrusher with new chaos level
	updateBitcrusher();
}

export function getChaosLevel(): number {
	return chaosLevel;
}

// Player mode (tape vs radio)
export function setPlayerMode(mode: PlayerMode) {
	playerMode = mode;
	setLyricsPlayerMode(mode);
}

export function getPlayerMode(): PlayerMode {
	return playerMode;
}

// Tape side (A/B for mood inversion)
export function setTapeSide(side: TapeSide) {
	tapeSide = side;
}

export function getTapeSide(): TapeSide {
	return tapeSide;
}

export function flipTape(): TapeSide {
	tapeSide = tapeSide === "A" ? "B" : "A";
	return tapeSide;
}

export function getDuration() {
	const currentSong = getCurrentSong();
	if (!currentSong) return 0;
	const secondsPerStep = 60 / currentSong.tempo / 4;
	const totalSteps = currentSong.totalBars * STEPS_PER_BAR;
	return totalSteps * secondsPerStep;
}

export function getPosition() {
	const deck = getActiveDeckPlayback();
	const currentSong = deck.song;
	if (!currentSong) return 0;
	const secondsPerStep = 60 / currentSong.tempo / 4;
	// Calculate total steps played so far
	let stepsToSection = 0;
	for (let i = 0; i < deck.sectionIndex; i++) {
		const section = currentSong.structure.sections[i];
		if (section) stepsToSection += section.bars * STEPS_PER_BAR;
	}
	return (stepsToSection + deck.sectionStep) * secondsPerStep;
}

export function seek(time: number) {
	const deck = getActiveDeckPlayback();
	const currentSong = deck.song;
	if (!currentSong) return;
	const secondsPerStep = 60 / currentSong.tempo / 4;
	const targetStep = Math.floor(time / secondsPerStep);

	// Find which section this step falls into
	let stepsAccum = 0;
	let found = false;
	for (let i = 0; i < currentSong.structure.sections.length; i++) {
		const section = currentSong.structure.sections[i];
		if (!section) continue;
		const sectionSteps = section.bars * STEPS_PER_BAR;
		if (stepsAccum + sectionSteps > targetStep) {
			deck.sectionIndex = i;
			deck.sectionStep = targetStep - stepsAccum;
			found = true;
			break;
		}
		stepsAccum += sectionSteps;
	}

	// If seeking past the end, clamp to last step of last section
	if (!found) {
		const sections = currentSong.structure.sections;
		const lastSection = sections[sections.length - 1];
		if (lastSection) {
			deck.sectionIndex = sections.length - 1;
			deck.sectionStep = lastSection.bars * STEPS_PER_BAR - 1;
		}
	}

	// Reset songEndingEmitted so the ending check can trigger again
	// This ensures breaks can be scheduled even when seeking near end
	deck.songEndingEmitted = false;

	clearDelayBuffer();
	if (isPlaying && ctx) {
		deck.nextNoteTime = ctx.currentTime;
	}
}

export function getAnalyser() {
	getContext();
	return analyser;
}

export function getIsPlaying() {
	return isPlaying;
}

export function getSong() {
	return getCurrentSong();
}

export function getCurrentSectionInfo(): SectionState | null {
	const deck = getActiveDeckPlayback();
	const currentSong = deck.song;
	if (!currentSong) return null;
	const section = currentSong.structure.sections[deck.sectionIndex];
	if (!section) return null;

	const pattern = currentSong.patterns.get(section.type);

	return {
		type: section.type,
		index: deck.sectionIndex,
		melodyPattern: pattern?.melodyPattern ?? null,
		rhythmVariation: pattern?.rhythmVariation ?? "normal",
		drumPattern: pattern?.drumPattern ?? null,
		bassPattern: pattern?.bassPattern ?? null,
		arpPattern: pattern?.arpPattern ?? null,
		energy: section.energy,
		activeTracks: {
			melody: section.hasMelody,
			bass: section.hasBass,
			drums: section.hasDrums,
			arpeggio: section.hasArpeggio,
			pad: section.hasPad,
		},
	};
}

// For backwards compatibility with player
export function getPattern() {
	const currentSong = getCurrentSong();
	if (!currentSong) return null;
	// Return a pattern-like object for display purposes
	return {
		trackName: currentSong.trackName,
		scaleName: currentSong.scaleName,
		rootNote: noteNames[currentSong.rootNote],
		tempo: currentSong.tempo,
	};
}

/** Info about what's coming up next for display in the player */
export type NextUpInfo = {
	kind: PlayableItem["kind"];
	label: string; // Human-readable label
	sublabel?: string; // Additional info (e.g., genre for songs)
};

/** Get info about the next queued item for "Next up" display */
export function getNextUp(): NextUpInfo | null {
	if (loopEnabled) return null;

	const nextItem = peekNext();
	if (!nextItem) return null;

	switch (nextItem.kind) {
		case "song":
			return {
				kind: "song",
				label: nextItem.song.trackName,
				sublabel: nextItem.song.genre.name,
			};
		case "adBreak": {
			const count = nextItem.adBreak.commercials.length;
			return {
				kind: "adBreak",
				label: "Commercial Break",
				sublabel: `${count} ${count === 1 ? "spot" : "spots"}`,
			};
		}
		case "djAnnouncement":
			return {
				kind: "djAnnouncement",
				label: "DJ Break",
			};
		case "commercial":
			return {
				kind: "commercial",
				label: "Sponsor Message",
			};
		case "jingle":
			return {
				kind: "jingle",
				label: "Station ID",
			};
		case "news":
			return {
				kind: "news",
				label: "News Update",
			};
		case "silence":
			return {
				kind: "silence",
				label: "...",
			};
		default:
			return null;
	}
}
