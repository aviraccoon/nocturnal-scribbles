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
import { getCurrentStation } from "./radio";
import { getTotalBars, structures } from "./structures";
import {
	createSynthContext,
	playArp,
	playBass,
	playDrum,
	playFX,
	playNote,
	playPad,
	type SynthContext,
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
	TrackType,
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
// Chorus/reverb effect nodes (for dynamic updates)
let chorusDepthL: GainNode | null = null;
let chorusDepthR: GainNode | null = null;
let chorusMixGain: GainNode | null = null;
let chorusDryGain: GainNode | null = null;
let reverbMixGain: GainNode | null = null;
let reverbDryGain: GainNode | null = null;
// Background audio support (browsers throttle/suspend JS in background tabs)
let mediaStreamDest: MediaStreamAudioDestinationNode | null = null;
let backgroundAudioElement: HTMLAudioElement | null = null;
let wakeLock: WakeLockSentinel | null = null;
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
		// Update Media Session with new track info
		updateMediaSession();
	}
});

// ============================================
// Per-Deck Playback State
// ============================================

/** Playback state for a single deck */
type DeckPlayback = {
	song: Song | null;
	synthContext: SynthContext | null;
	/** Scheduled section index (may be ahead of playback) */
	sectionIndex: number;
	/** Scheduled step within section (may be ahead of playback) */
	sectionStep: number;
	nextNoteTime: number;
	/** When playback started (ctx.currentTime) - for calculating actual position */
	playbackStartTime: number;
	/** Has the transition been triggered for this deck (based on playback time)? */
	transitionTriggered: boolean;
};

function createEmptyDeckPlayback(): DeckPlayback {
	return {
		song: null,
		synthContext: null,
		sectionIndex: 0,
		sectionStep: 0,
		nextNoteTime: 0,
		playbackStartTime: 0,
		transitionTriggered: false,
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
	const inactiveId = getActiveDeckId() === "A" ? "B" : "A";
	const deck = getInactiveDeckPlayback();
	deck.song = song;
	deck.synthContext = createDeckSynthContext(inactiveId, song);
	deck.sectionIndex = 0;
	deck.sectionStep = 0;
	deck.transitionTriggered = false;
	if (ctx) {
		deck.nextNoteTime = ctx.currentTime + startDelay;
		deck.playbackStartTime = ctx.currentTime + startDelay;
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
	fx: false,
};

/** Pick a random value within a [min, max] range */
function pickFromRange(range: [number, number]): number {
	return range[0] + Math.random() * (range[1] - range[0]);
}

/** Check if we're on a mobile/touch device */
function isMobileDevice(): boolean {
	return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

/** Request wake lock to prevent screen from dimming (mobile only) */
async function requestWakeLock(): Promise<void> {
	if (!isMobileDevice() || !("wakeLock" in navigator)) return;
	try {
		wakeLock = await navigator.wakeLock.request("screen");
		wakeLock.addEventListener("release", () => {
			wakeLock = null;
		});
	} catch {
		// Wake lock request failed (e.g., low battery, not visible)
	}
}

// Re-request wake lock when page becomes visible again (lock is released on visibility change)
document.addEventListener("visibilitychange", () => {
	if (document.visibilityState === "visible" && isPlaying) {
		requestWakeLock();
	}
});

/** Release wake lock */
function releaseWakeLock(): void {
	if (wakeLock) {
		wakeLock.release();
		wakeLock = null;
	}
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

		// Chorus and Reverb chain (initialized off, updated per-song)
		const chorusReverb = createChorusReverbChain(ctx, 0, 0);
		effectsGain.connect(chorusReverb.input);
		chorusReverb.output.connect(analyser);
		analyser.connect(ctx.destination);

		// Store nodes for dynamic updates
		chorusDepthL = chorusReverb.chorusDepthL ?? null;
		chorusDepthR = chorusReverb.chorusDepthR ?? null;
		chorusMixGain = chorusReverb.chorusMixGain ?? null;
		chorusDryGain = chorusReverb.chorusDryGain ?? null;
		reverbMixGain = chorusReverb.reverbMixGain ?? null;
		reverbDryGain = chorusReverb.reverbDryGain ?? null;

		// Background audio support
		// Route audio through a MediaStream → <audio> element to help maintain playback
		// when browser throttles/suspends JS in background tabs
		mediaStreamDest = ctx.createMediaStreamDestination();
		analyser.connect(mediaStreamDest);
		backgroundAudioElement = document.createElement("audio");
		backgroundAudioElement.srcObject = mediaStreamDest.stream;
		backgroundAudioElement.setAttribute("playsinline", "true");

		// Vinyl noise chain (separate from main music)
		vinylNoiseGain = ctx.createGain();
		vinylNoiseGain.gain.value = 0; // Off by default
		vinylCrackleGain = ctx.createGain();
		vinylCrackleGain.gain.value = 0;
		vinylNoiseGain.connect(analyser); // Goes to analyser for visualization
		vinylCrackleGain.connect(analyser);

		// Initialize mixer for automix transitions
		initMixer(ctx, masterGain);

		// Handle audio interruption (iOS backgrounding, phone calls, etc.)
		// Pause gracefully instead of getting stuck on a sustained note
		// User must press play again to resume (iOS requires user interaction)
		ctx.addEventListener("statechange", () => {
			if (ctx?.state === "interrupted" && isPlaying) {
				stop();
				musicEvents.emit({ type: "interrupted" });
			}
		});
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
 * Create an impulse response for convolution reverb.
 * Generates a simple algorithmic reverb tail.
 */
function createReverbImpulse(
	audioContext: BaseAudioContext,
	duration = 2,
	decay = 2,
): AudioBuffer {
	const sampleRate = audioContext.sampleRate;
	const length = sampleRate * duration;
	const buffer = audioContext.createBuffer(2, length, sampleRate);
	const leftChannel = buffer.getChannelData(0);
	const rightChannel = buffer.getChannelData(1);

	for (let i = 0; i < length; i++) {
		// Exponential decay
		const envelope = (1 - i / length) ** decay;
		// Add some randomness for diffusion
		leftChannel[i] = (Math.random() * 2 - 1) * envelope;
		rightChannel[i] = (Math.random() * 2 - 1) * envelope;
	}

	return buffer;
}

export type ChorusReverbChain = {
	input: GainNode;
	output: GainNode;
	// For live playback: expose nodes for dynamic updates
	chorusDepthL?: GainNode;
	chorusDepthR?: GainNode;
	chorusMixGain?: GainNode;
	chorusDryGain?: GainNode;
	reverbMixGain?: GainNode;
	reverbDryGain?: GainNode;
};

/**
 * Create chorus and reverb effects chain.
 * Shared between live playback (generator.ts) and offline export (recorder.ts).
 */
export function createChorusReverbChain(
	ctx: BaseAudioContext,
	chorusDepth: number,
	reverbMix: number,
): ChorusReverbChain {
	// Input node
	const input = ctx.createGain();
	input.gain.value = 1;

	// Output node
	const output = ctx.createGain();
	output.gain.value = 1;

	// ============================================
	// Chorus Effect (stereo modulated delay)
	// ============================================
	const chorusDelayL = ctx.createDelay(0.1);
	const chorusDelayR = ctx.createDelay(0.1);
	chorusDelayL.delayTime.value = 0.02;
	chorusDelayR.delayTime.value = 0.025;

	const chorusLfoL = ctx.createOscillator();
	const chorusLfoR = ctx.createOscillator();
	chorusLfoL.type = "sine";
	chorusLfoR.type = "sine";
	chorusLfoL.frequency.value = 0.5;
	chorusLfoR.frequency.value = 0.6;

	const chorusDepthL = ctx.createGain();
	const chorusDepthR = ctx.createGain();
	const chorusModAmount = chorusDepth * 0.005;
	chorusDepthL.gain.value = chorusModAmount;
	chorusDepthR.gain.value = chorusModAmount;

	chorusLfoL.connect(chorusDepthL);
	chorusLfoR.connect(chorusDepthR);
	chorusDepthL.connect(chorusDelayL.delayTime);
	chorusDepthR.connect(chorusDelayR.delayTime);
	chorusLfoL.start();
	chorusLfoR.start();

	const chorusMixGain = ctx.createGain();
	chorusMixGain.gain.value = chorusDepth * 0.5;
	const chorusDryGain = ctx.createGain();
	chorusDryGain.gain.value = 1 - chorusDepth * 0.2;

	const stereoMerger = ctx.createChannelMerger(2);

	input.connect(chorusDryGain);
	input.connect(chorusDelayL);
	input.connect(chorusDelayR);
	chorusDelayL.connect(stereoMerger, 0, 0);
	chorusDelayR.connect(stereoMerger, 0, 1);
	stereoMerger.connect(chorusMixGain);

	// ============================================
	// Reverb Effect (convolution)
	// ============================================
	const reverbNode = ctx.createConvolver();
	reverbNode.buffer = createReverbImpulse(ctx, 2.5, 2.5);

	const reverbMixGain = ctx.createGain();
	reverbMixGain.gain.value = reverbMix;
	const reverbDryGain = ctx.createGain();
	reverbDryGain.gain.value = 1 - reverbMix * 0.3;

	chorusDryGain.connect(reverbDryGain);
	chorusMixGain.connect(reverbDryGain);
	chorusDryGain.connect(reverbNode);
	chorusMixGain.connect(reverbNode);
	reverbNode.connect(reverbMixGain);

	// Output
	reverbDryGain.connect(output);
	reverbMixGain.connect(output);

	return {
		input,
		output,
		chorusDepthL,
		chorusDepthR,
		chorusMixGain,
		chorusDryGain,
		reverbMixGain,
		reverbDryGain,
	};
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

/** Create a synth context for a deck with its output routing */
function createDeckSynthContext(deckId: DeckId, song: Song): SynthContext {
	const output = getDeckOutput(deckId);
	if (!output) {
		throw new Error(`Deck ${deckId} has no output - mixer not initialized`);
	}
	return createSynthContext(getContext(), output, song, sidechainGain);
}

/**
 * Internal helper to load a song after transitioning (used by automix and ad breaks).
 */
function loadSongInternal(song: Song) {
	const deckId = getActiveDeckId();
	const deck = getActiveDeckPlayback();
	deck.song = song;
	deck.synthContext = createDeckSynthContext(deckId, song);
	deck.sectionIndex = 0;
	deck.sectionStep = 0;
	deck.transitionTriggered = false;

	// Reset timing to start from now
	if (ctx) {
		deck.nextNoteTime = ctx.currentTime;
		deck.playbackStartTime = ctx.currentTime;
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
	updateReverb();
	updateChorus();

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
	// In radio mode, use genre's preferred scales; in tape mode, allow emoji overrides
	const scaleName =
		playerMode === "radio"
			? T.pick(genre.preferredScales)
			: selectScale(visualState, genre);
	const scale = scales[scaleName];
	// In radio mode, randomize root note; in tape mode, derive from page hue
	const rootNote =
		playerMode === "radio"
			? Math.floor(Math.random() * noteNames.length)
			: Math.floor((visualState.dominantHue / 360) * noteNames.length);

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

	// In radio mode, randomize progression; in tape mode, derive from page
	const progIndex =
		playerMode === "radio"
			? Math.floor(Math.random() * progressions.length)
			: (rootNote + visualState.elementCount) % progressions.length;
	const progression = progressions[progIndex] ?? [0, 3, 4, 4];

	// Pick random synthesis parameters from genre ranges for this song
	const delayAmount = pickFromRange(genre.delayRange);
	const filterCutoff = pickFromRange(genre.filterRange);
	const detune = pickFromRange(genre.detuneRange);
	const attack = pickFromRange(genre.attackRange);
	const swing = pickFromRange(genre.swingRange);
	const portamento = pickFromRange(genre.portamentoRange);
	const wowFlutter = pickFromRange(genre.wowFlutterRange);
	const pwmDepth = pickFromRange(genre.pwmDepthRange);
	const reverbMix = pickFromRange(genre.reverbRange);
	const chorusDepth = pickFromRange(genre.chorusRange);
	const stereoWidth = pickFromRange(genre.stereoWidthRange);

	// Generate patterns for each unique section type
	// Use the MAXIMUM bar count for each type to ensure patterns cover all instances
	const patterns = new Map<Section["type"], Pattern>();
	const maxBarsPerType = new Map<Section["type"], Section>();

	// First pass: find the section with max bars for each type
	for (const section of structure.sections) {
		const existing = maxBarsPerType.get(section.type);
		if (!existing || section.bars > existing.bars) {
			maxBarsPerType.set(section.type, section);
		}
	}

	// Second pass: generate patterns using the max-bar section for each type
	for (const section of maxBarsPerType.values()) {
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
		portamento,
		wowFlutter,
		pwmDepth,
		reverbMix,
		chorusDepth,
		stereoWidth,
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

/**
 * Update reverb mix level based on current song.
 */
function updateReverb() {
	if (!reverbMixGain || !reverbDryGain || !ctx) return;
	const currentSong = getCurrentSong();
	if (!currentSong) {
		reverbMixGain.gain.value = 0;
		reverbDryGain.gain.value = 1;
		return;
	}

	const now = ctx.currentTime;
	const wetLevel = currentSong.reverbMix;

	// Smooth transition
	reverbMixGain.gain.linearRampToValueAtTime(wetLevel, now + 0.3);
	// Reduce dry slightly when reverb is high to prevent volume buildup
	reverbDryGain.gain.linearRampToValueAtTime(1 - wetLevel * 0.3, now + 0.3);
}

/**
 * Update chorus depth based on current song.
 */
function updateChorus() {
	if (
		!chorusDepthL ||
		!chorusDepthR ||
		!chorusMixGain ||
		!chorusDryGain ||
		!ctx
	)
		return;
	const currentSong = getCurrentSong();
	if (!currentSong) {
		chorusDepthL.gain.value = 0;
		chorusDepthR.gain.value = 0;
		chorusMixGain.gain.value = 0;
		chorusDryGain.gain.value = 1;
		return;
	}

	const now = ctx.currentTime;
	const depth = currentSong.chorusDepth;

	// Chorus depth controls LFO modulation amount (in seconds)
	// At max depth (1.0), modulate delay by up to 5ms
	const modAmount = depth * 0.005;
	chorusDepthL.gain.linearRampToValueAtTime(modAmount, now + 0.3);
	chorusDepthR.gain.linearRampToValueAtTime(modAmount, now + 0.3);

	// Wet/dry mix
	chorusMixGain.gain.linearRampToValueAtTime(depth * 0.5, now + 0.3);
	chorusDryGain.gain.linearRampToValueAtTime(1 - depth * 0.2, now + 0.3);
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

// ============================================
// Media Session API (lock screen controls)
// ============================================

let mediaSessionInitialized = false;

/** Update Media Session metadata for lock screen display */
function updateMediaSession() {
	if (!("mediaSession" in navigator)) return;

	const currentSong = getCurrentSong();
	if (!currentSong) return;

	// Build artist/album based on mode
	let artist: string;
	let album: string;

	if (playerMode === "radio") {
		const station = getCurrentStation();
		artist = station.name;
		album = currentSong.genre.name;
	} else {
		artist = `Mixtape Side ${tapeSide}`;
		album = `${currentSong.genre.name} - Nocturnal Scribbles`;
	}

	// Set metadata
	navigator.mediaSession.metadata = new MediaMetadata({
		title: currentSong.trackName,
		artist,
		album,
	});

	// Set up action handlers (only once)
	if (!mediaSessionInitialized) {
		navigator.mediaSession.setActionHandler("play", () => {
			play();
		});
		navigator.mediaSession.setActionHandler("pause", () => {
			stop();
		});
		navigator.mediaSession.setActionHandler("nexttrack", () => {
			nextTrack();
		});
		// No previoustrack - procedural generation means no going back
		mediaSessionInitialized = true;
	}

	// Update playback state
	navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
}

// ============================================
// Playback-based transition checks
// ============================================

/**
 * Check for transitions based on actual playback time (not scheduled time).
 * This ensures automix triggers at the right moment even with large lookahead.
 */
function checkPlaybackTransitions(): void {
	if (!ctx || !isPlaying) return;

	const deck = getActiveDeckPlayback();
	const song = deck.song;
	if (!song || loopEnabled) return;

	// Calculate actual playback position
	const playbackTime = ctx.currentTime - deck.playbackStartTime;
	const secondsPerBar = (60 / song.tempo) * 4;
	const totalDuration = song.totalBars * secondsPerBar;
	const playbackBarsRemaining = (totalDuration - playbackTime) / secondsPerBar;

	const transitionBars = getAutomixSettings().transitionBars;

	// Check if we should START the transition (based on playback time)
	if (
		!deck.transitionTriggered &&
		playbackBarsRemaining <= transitionBars &&
		playbackBarsRemaining > 0
	) {
		deck.transitionTriggered = true;

		musicEvents.emit({
			type: "songEnding",
			song: song,
			barsRemaining: Math.ceil(playbackBarsRemaining),
			beatTime: ctx.currentTime,
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
		const nextItem = peekNext();
		if (isAutomixEnabled() && nextItem?.kind === "song" && !isInTransition()) {
			startTransition(nextItem, false, Math.ceil(playbackBarsRemaining));
			const incomingDelay = getIncomingStartDelay();
			initIncomingDeck(nextItem.song, incomingDelay);
		}
	}

	// Check if song has ENDED (based on playback time)
	if (playbackTime >= totalDuration) {
		handleSongEnded(song);
	}
}

/**
 * Handle song end - finish transition, apply effects, load next song.
 */
function handleSongEnded(song: Song): void {
	musicEvents.emit({ type: "songEnded", song: song });

	const nextItem = peekNext();
	if (isInTransition() && nextItem) {
		finishTransition();
		dequeueNext();
		// The incoming deck is now active
		const newDeck = getActiveDeckPlayback();
		if (newDeck.song) {
			if (delayNode && delayFeedback) {
				delayNode.delayTime.value = 60 / newDeck.song.tempo / 2;
				delayFeedback.gain.value = newDeck.song.delayAmount;
			}
			if (filterNode) {
				filterNode.frequency.value = newDeck.song.filterCutoff;
			}
			updateVinylNoise();
			updateBitcrusher();
			updateReverb();
			updateChorus();
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
		const queuedItem = peekNext();
		if (queuedItem) {
			dequeueNext();
			if (queuedItem.kind === "song") {
				loadSongInternal(queuedItem.song);
			} else {
				playBreak(queuedItem).then(() => {
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
			// Fallback: generate on the fly
			const visualState = sampleVisualState();
			loadSongInternal(generateSong(visualState));
		}
	}
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
	const synth = deck.synthContext;
	if (!song || !synth) return false;

	const c = getContext();
	const secondsPerStep = 60 / song.tempo / 4;
	// Schedule 15 seconds ahead to support background playback
	// Browsers throttle/suspend JS in background tabs, but pre-scheduled
	// Web Audio nodes continue playing
	const scheduleAhead = 15;

	let scheduled = false;

	while (deck.nextNoteTime < c.currentTime + scheduleAhead) {
		// Fetch current section inside loop - it may change as we schedule ahead
		const current = getSectionForDeck(deck);
		if (!current) break;

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
					playNote(synth, noteToFreq(n.note), noteTime, duration, {
						type: T.pick(song.genre.oscTypes.melody),
						volume: 0.1 * velocityHuman,
						detune: chaosDetune,
						attack: song.attack,
						vibrato: duration > 0.4,
						portamento: song.portamento,
						wowFlutter: song.wowFlutter,
						pwmDepth: song.pwmDepth,
					});
				}
			}
		}

		// Schedule bass notes
		if (!trackMutes.bass) {
			for (const n of pattern.bass) {
				if (n.step === step) {
					const noteTime = deck.nextNoteTime + swingOffset;
					playBass(
						synth,
						noteToFreq(n.note),
						noteTime,
						n.duration * secondsPerStep,
					);
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
					playArp(
						synth,
						noteToFreq(n.note),
						noteTime,
						n.duration * secondsPerStep,
					);
				}
			}
		}

		// Schedule pad chords
		if (!trackMutes.pad) {
			for (const p of pattern.pad) {
				if (p.step === step) {
					playPad(
						synth,
						p.notes,
						deck.nextNoteTime,
						p.duration * secondsPerStep,
					);
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
					playDrum(synth, d.type, drumTime, velocityHuman, d.pitch ?? null);
				}
			}
		}

		// Schedule FX (risers, impacts, sweeps)
		if (!trackMutes.fx) {
			for (const f of pattern.fx) {
				if (f.step === step) {
					const fxDuration = f.duration * secondsPerStep;
					playFX(synth, f.type, deck.nextNoteTime, fxDuration, f.intensity);
				}
			}
		}

		deck.nextNoteTime += secondsPerStep;
		deck.sectionStep++;

		// Check if we've finished this section
		if (deck.sectionStep >= sectionSteps) {
			deck.sectionStep = 0;
			deck.sectionIndex++;

			// Check for song end (for scheduling purposes)
			if (deck.sectionIndex >= song.structure.sections.length) {
				if (loopEnabled) {
					deck.sectionIndex = 0;
				}
				// Actual song end handling is done by checkPlaybackTransitions()
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
	checkPlaybackTransitions();
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
	// synthContext is created lazily in play() after mixer is initialized
	deck.sectionIndex = 0;
	deck.sectionStep = 0;
	deck.transitionTriggered = false;

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

	const deckId = getActiveDeckId();

	if (nextSong) {
		// Start and immediately finish transition for manual skip
		startTransition({ kind: "song", song: nextSong }, true);
		finishTransition();
		deck.song = nextSong;
		deck.synthContext = createDeckSynthContext(deckId, nextSong);
	} else {
		// Generate new song
		const visualState = sampleVisualState();
		deck.song = generateSong(visualState);
		deck.synthContext = createDeckSynthContext(deckId, deck.song);

		// Maybe queue a break before next song
		const breakItem = shouldTriggerBreak(playerMode);
		if (breakItem) {
			queueItem(breakItem);
		}
	}

	deck.sectionIndex = 0;
	deck.sectionStep = 0;
	deck.transitionTriggered = false;

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
	updateReverb();
	updateChorus();
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

	// Handle iOS interrupted state - must resume in user interaction call stack
	if (ctx?.state === "interrupted" || ctx?.state === "suspended") {
		ctx.resume();
	}

	const deck = getActiveDeckPlayback();
	if (!deck.song) generate();
	const c = getContext(); // Initializes mixer
	const currentSong = deck.song;
	if (!currentSong || !masterGain) return;

	// Create synthContext now that mixer is initialized
	const deckId = getActiveDeckId();
	if (!deck.synthContext) {
		deck.synthContext = createDeckSynthContext(deckId, currentSong);
	}

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
	deck.playbackStartTime = c.currentTime;

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

	// Apply reverb and chorus effects
	updateReverb();
	updateChorus();

	// Start background audio element to help maintain playback in background tabs
	if (backgroundAudioElement) {
		backgroundAudioElement.play().catch(() => {
			// Ignore autoplay errors - user interaction already happened
		});
	}

	// Update Media Session metadata for lock screen controls
	updateMediaSession();

	// Prevent screen from dimming on mobile
	requestWakeLock();

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
		// Pause background audio element
		if (backgroundAudioElement) {
			backgroundAudioElement.pause();
		}
		// Allow screen to dim again
		releaseWakeLock();
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
export function setTrackMute(track: TrackType, muted: boolean) {
	trackMutes[track] = muted;
}

export function getTrackMute(track: TrackType): boolean {
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
	if (!currentSong || !ctx) return 0;
	// Use actual playback time, not scheduled position
	// This correctly shows position even when scheduler is far ahead
	return Math.max(0, ctx.currentTime - deck.playbackStartTime);
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

	// Reset transitionTriggered so the ending check can trigger again
	deck.transitionTriggered = false;

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

/** Calculate current section index based on actual playback time */
function getPlaybackSectionIndex(deck: DeckPlayback, song: Song): number {
	if (!ctx) return 0;

	const playbackTime = Math.max(0, ctx.currentTime - deck.playbackStartTime);
	const secondsPerBar = (60 / song.tempo) * 4;

	let barsAccum = 0;
	for (let i = 0; i < song.structure.sections.length; i++) {
		const section = song.structure.sections[i];
		if (!section) continue;
		const sectionEnd = (barsAccum + section.bars) * secondsPerBar;
		if (playbackTime < sectionEnd) {
			return i;
		}
		barsAccum += section.bars;
	}

	// Past the end, return last section
	return Math.max(0, song.structure.sections.length - 1);
}

export function getCurrentSectionInfo(): SectionState | null {
	const deck = getActiveDeckPlayback();
	const currentSong = deck.song;
	if (!currentSong) return null;

	// Use playback-based section index, not scheduled index
	const sectionIndex = isPlaying
		? getPlaybackSectionIndex(deck, currentSong)
		: deck.sectionIndex;
	const section = currentSong.structure.sections[sectionIndex];
	if (!section) return null;

	const pattern = currentSong.patterns.get(section.type);

	return {
		type: section.type,
		index: sectionIndex,
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
			fx: section.hasFX,
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
