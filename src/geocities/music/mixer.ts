/**
 * Dual-deck mixer for automix transitions between songs.
 *
 * This module manages:
 * - Two audio "decks" that can play simultaneously
 * - Smooth transitions between tracks (crossfade, beatmatch, etc.)
 * - Playback queue with support for songs, commercials, jingles, etc.
 * - Event emission for transition coordination
 */

import { musicEvents } from "./events";
import type {
	AutomixSettings,
	Deck,
	DeckId,
	PlayableItem,
	Song,
	TransitionStyle,
} from "./types";

const T = window.ThemeUtils;

// ============================================
// State
// ============================================

let audioContext: AudioContext | null = null;
let masterOutput: GainNode | null = null;

const decks: Record<DeckId, Deck> = {
	A: createEmptyDeck("A"),
	B: createEmptyDeck("B"),
};

let activeDeckId: DeckId = "A";
let playbackQueue: PlayableItem[] = [];
let isTransitioning = false;
let transitionTimeout: ReturnType<typeof setTimeout> | null = null;

/** Automix settings with defaults */
let automixSettings: AutomixSettings = {
	enabled: true,
	style: "auto",
	transitionBars: 8, // ~16 seconds at 120 BPM - enough for smooth crossfades
	matchTempo: false, // Now using tempo-matched generation instead
};

// ============================================
// Deck Management
// ============================================

function createEmptyDeck(id: DeckId): Deck {
	return {
		id,
		item: null,
		state: "idle",
		currentBar: 0,
		currentStep: 0,
		startTime: 0,
		gainNode: null,
		filterNode: null,
		delayNode: null,
	};
}

function getActiveDeck(): Deck {
	return decks[activeDeckId];
}

function getInactiveDeck(): Deck {
	return decks[activeDeckId === "A" ? "B" : "A"];
}

/** Feedback gain node for deck delay (used in echo transitions) */
const deckDelayFeedback: Record<DeckId, GainNode | null> = { A: null, B: null };

function initDeckAudio(deck: Deck): void {
	if (!audioContext || !masterOutput) return;

	// Create gain node for this deck's volume control
	deck.gainNode = audioContext.createGain();
	deck.gainNode.gain.value = deck.id === activeDeckId ? 1 : 0;
	deck.gainNode.connect(masterOutput);

	// Create filter for filter sweep transitions
	deck.filterNode = audioContext.createBiquadFilter();
	deck.filterNode.type = "lowpass";
	deck.filterNode.frequency.value = 20000; // Wide open
	deck.filterNode.Q.value = 0.5;
	deck.filterNode.connect(deck.gainNode);

	// Create delay for echo transitions
	deck.delayNode = audioContext.createDelay(1.0);
	deck.delayNode.delayTime.value = 0.375; // Dotted eighth note feel
	const feedback = audioContext.createGain();
	feedback.gain.value = 0; // Off by default
	deckDelayFeedback[deck.id] = feedback;

	// Delay routing: filter -> delay -> feedback -> delay, delay -> gain
	deck.delayNode.connect(feedback);
	feedback.connect(deck.delayNode);
	deck.delayNode.connect(deck.gainNode);
}

function resetDeck(deck: Deck): void {
	deck.item = null;
	deck.state = "idle";
	deck.currentBar = 0;
	deck.currentStep = 0;
	deck.startTime = 0;

	// Cancel any scheduled automation before resetting values
	if (audioContext) {
		const now = audioContext.currentTime;

		// Reset gain to 0 for inactive deck
		if (deck.gainNode) {
			deck.gainNode.gain.cancelScheduledValues(now);
			deck.gainNode.gain.setValueAtTime(0, now);
		}

		// Reset filter
		if (deck.filterNode) {
			deck.filterNode.frequency.cancelScheduledValues(now);
			deck.filterNode.frequency.setValueAtTime(20000, now);
		}

		// Reset delay feedback
		const feedback = deckDelayFeedback[deck.id];
		if (feedback) {
			feedback.gain.cancelScheduledValues(now);
			feedback.gain.setValueAtTime(0, now);
		}
	}
}

// ============================================
// Queue Management
// ============================================

/** Add an item to the end of the queue */
export function queueItem(item: PlayableItem): void {
	playbackQueue.push(item);
	musicEvents.emit({ type: "queueUpdated", queue: [...playbackQueue] });
}

/** Add an item to play next (front of queue) */
export function queueNext(item: PlayableItem): void {
	playbackQueue.unshift(item);
	musicEvents.emit({ type: "queueUpdated", queue: [...playbackQueue] });
}

/** Get the next item without removing it (removes duplicates of current song) */
export function peekNext(): PlayableItem | null {
	const currentItem = getActiveDeck().item;

	// Remove any queued items that match the currently playing song
	while (playbackQueue.length > 0) {
		const next = playbackQueue[0];
		if (
			next?.kind === "song" &&
			currentItem?.kind === "song" &&
			next.song.trackName === currentItem.song.trackName
		) {
			// Same song - remove it from queue
			playbackQueue.shift();
			musicEvents.emit({ type: "queueUpdated", queue: [...playbackQueue] });
		} else {
			break;
		}
	}

	return playbackQueue[0] ?? null;
}

/** Remove and return the next item */
export function dequeueNext(): PlayableItem | null {
	const item = playbackQueue.shift() ?? null;
	if (item) {
		musicEvents.emit({ type: "queueUpdated", queue: [...playbackQueue] });
	}
	return item;
}

/** Clear the entire queue */
export function clearQueue(): void {
	playbackQueue = [];
	musicEvents.emit({ type: "queueUpdated", queue: [] });
}

/** Get current queue (readonly) */
export function getQueue(): readonly PlayableItem[] {
	return playbackQueue;
}

// ============================================
// Transition Logic
// ============================================

/**
 * Determine the appropriate transition style based on current and next items.
 */
export function determineTransitionStyle(
	current: PlayableItem | null,
	next: PlayableItem,
): TransitionStyle {
	// If automix is disabled, always hard cut
	if (!automixSettings.enabled) {
		return "hardcut";
	}

	// Hard cut for non-song items
	if (next.kind !== "song") {
		return "hardcut";
	}

	// If current isn't a song, fade in the next song
	if (!current || current.kind !== "song") {
		return "crossfade";
	}

	// Both are songs - use automix style
	if (automixSettings.style === "auto") {
		// Use the outgoing song's genre to determine style
		// (transition out in a way that matches the current vibe)
		return T.pick(current.song.genre.transitions);
	}

	return automixSettings.style;
}

/**
 * Calculate transition duration in seconds based on bars and tempo.
 */
function getTransitionDuration(song: Song | null, bars: number): number {
	if (!song) return 2; // Default 2 second fade
	const beatsPerBar = 4;
	const secondsPerBeat = 60 / song.tempo;
	return bars * beatsPerBar * secondsPerBeat;
}

/**
 * Execute a crossfade transition between decks.
 */
function executeCrossfade(
	outgoing: Deck,
	incoming: Deck,
	duration: number,
): void {
	if (!audioContext) return;

	const now = audioContext.currentTime;
	const endTime = now + duration;

	// Fade out outgoing deck
	if (outgoing.gainNode) {
		outgoing.state = "fadeOut";
		outgoing.gainNode.gain.setValueAtTime(1, now);
		outgoing.gainNode.gain.linearRampToValueAtTime(0, endTime);
	}

	// Fade in incoming deck
	if (incoming.gainNode) {
		incoming.state = "fadeIn";
		incoming.gainNode.gain.setValueAtTime(0, now);
		incoming.gainNode.gain.linearRampToValueAtTime(1, endTime);
	}
}

/**
 * Execute a filter sweep transition (low-pass outgoing, high-pass incoming).
 */
function executeFilterSweep(
	outgoing: Deck,
	incoming: Deck,
	duration: number,
): void {
	if (!audioContext) return;

	const now = audioContext.currentTime;
	const endTime = now + duration;

	// Sweep outgoing filter down
	if (outgoing.filterNode) {
		outgoing.state = "fadeOut";
		outgoing.filterNode.frequency.setValueAtTime(20000, now);
		outgoing.filterNode.frequency.exponentialRampToValueAtTime(200, endTime);
	}
	// Also fade out volume slightly
	if (outgoing.gainNode) {
		outgoing.gainNode.gain.setValueAtTime(1, now);
		outgoing.gainNode.gain.linearRampToValueAtTime(0.3, endTime);
	}

	// Sweep incoming filter up
	if (incoming.filterNode) {
		incoming.state = "fadeIn";
		incoming.filterNode.frequency.setValueAtTime(200, now);
		incoming.filterNode.frequency.exponentialRampToValueAtTime(20000, endTime);
	}
	// Fade in volume
	if (incoming.gainNode) {
		incoming.gainNode.gain.setValueAtTime(0, now);
		incoming.gainNode.gain.linearRampToValueAtTime(1, endTime);
	}
}

/**
 * Execute a drop transition (hard cut on the downbeat).
 */
function executeDrop(outgoing: Deck, incoming: Deck): void {
	if (!audioContext) return;

	const now = audioContext.currentTime;

	// Instant cut
	if (outgoing.gainNode) {
		outgoing.state = "fadeOut";
		outgoing.gainNode.gain.setValueAtTime(0, now);
	}
	if (incoming.gainNode) {
		incoming.state = "fadeIn";
		incoming.gainNode.gain.setValueAtTime(1, now);
	}
}

/**
 * Execute a hard cut transition (immediate switch).
 */
function executeHardcut(outgoing: Deck, incoming: Deck): void {
	if (!audioContext) return;

	const now = audioContext.currentTime;

	if (outgoing.gainNode) {
		outgoing.state = "fadeOut";
		// Quick fade to avoid clicks
		outgoing.gainNode.gain.setValueAtTime(outgoing.gainNode.gain.value, now);
		outgoing.gainNode.gain.linearRampToValueAtTime(0, now + 0.05);
	}
	if (incoming.gainNode) {
		incoming.state = "fadeIn";
		incoming.gainNode.gain.setValueAtTime(0, now + 0.05);
		incoming.gainNode.gain.linearRampToValueAtTime(1, now + 0.1);
	}
}

/**
 * Execute a beatmatch transition (equal-power crossfade for smoother blend).
 * Uses exponential curves to maintain perceived volume during the mix.
 */
function executeBeatmatch(
	outgoing: Deck,
	incoming: Deck,
	duration: number,
): void {
	if (!audioContext) return;

	const now = audioContext.currentTime;
	const endTime = now + duration;

	// Equal-power crossfade: use exponential ramps for smoother perceived volume
	// Outgoing: hold briefly, then fade with exponential curve
	if (outgoing.gainNode) {
		outgoing.state = "fadeOut";
		outgoing.gainNode.gain.setValueAtTime(1, now);
		// Hold at full for first quarter, then fade
		outgoing.gainNode.gain.setValueAtTime(1, now + duration * 0.25);
		outgoing.gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);
	}

	// Incoming: start quiet, ramp up with exponential curve
	if (incoming.gainNode) {
		incoming.state = "fadeIn";
		incoming.gainNode.gain.setValueAtTime(0.01, now);
		// Ramp up to full by 75% point, hold
		incoming.gainNode.gain.exponentialRampToValueAtTime(
			1,
			now + duration * 0.75,
		);
		incoming.gainNode.gain.setValueAtTime(1, endTime);
	}
}

/**
 * Execute an echo transition (outgoing fades with increasing delay feedback).
 * Creates a spacey, dub-style transition.
 */
function executeEcho(outgoing: Deck, incoming: Deck, duration: number): void {
	if (!audioContext) return;

	const now = audioContext.currentTime;
	const endTime = now + duration;
	const outgoingFeedback = deckDelayFeedback[outgoing.id];

	// Outgoing: fade out while ramping up delay feedback
	if (outgoing.gainNode) {
		outgoing.state = "fadeOut";
		outgoing.gainNode.gain.setValueAtTime(1, now);
		outgoing.gainNode.gain.linearRampToValueAtTime(0, endTime);
	}

	// Ramp up delay feedback on outgoing for echo tail
	if (outgoingFeedback) {
		outgoingFeedback.gain.setValueAtTime(0, now);
		// Ramp to high feedback (but not infinite) for echo buildup
		outgoingFeedback.gain.linearRampToValueAtTime(0.7, now + duration * 0.5);
		// Then decay the feedback so echoes die out
		outgoingFeedback.gain.linearRampToValueAtTime(0.3, endTime);
	}

	// Set delay time based on tempo if available
	if (outgoing.delayNode && outgoing.item?.kind === "song") {
		const tempo = outgoing.item.song.tempo;
		const beatDuration = 60 / tempo;
		// Dotted eighth note delay (3/4 of a beat) for classic dub feel
		outgoing.delayNode.delayTime.setValueAtTime(beatDuration * 0.75, now);
	}

	// Incoming: stay silent until near the end, then quick fade in
	// This way the incoming song starts fresh when it becomes audible
	if (incoming.gainNode) {
		incoming.state = "fadeIn";
		incoming.gainNode.gain.setValueAtTime(0, now);
		// Stay at 0 for 80% of the transition while outgoing echoes out
		incoming.gainNode.gain.setValueAtTime(0, now + duration * 0.8);
		// Quick fade in for the last 20%
		incoming.gainNode.gain.linearRampToValueAtTime(1, endTime);
	}
}

/**
 * Start a transition to the next item.
 * @param skipTimer - If true, don't schedule the completion timer (caller will call finishTransition)
 * @param barsRemaining - Actual bars remaining in song (used for duration if provided)
 */
export function startTransition(
	nextItem: PlayableItem,
	skipTimer = false,
	barsRemaining?: number,
): void {
	if (isTransitioning) return;

	const outgoing = getActiveDeck();
	const incoming = getInactiveDeck();

	const style = determineTransitionStyle(outgoing.item, nextItem);
	const outgoingSong =
		outgoing.item?.kind === "song" ? outgoing.item.song : null;
	// Use actual barsRemaining if provided, otherwise fall back to setting
	const transitionBars = barsRemaining ?? automixSettings.transitionBars;
	const duration = getTransitionDuration(outgoingSong, transitionBars);

	// Load the next item into the incoming deck
	incoming.item = nextItem;
	incoming.state = "cueing";
	incoming.currentBar = 0;
	incoming.currentStep = 0;

	isTransitioning = true;

	musicEvents.emit({
		type: "transitionStart",
		from: outgoing.item,
		to: nextItem,
		style,
	});

	// Only execute audio effects if we're doing an immediate transition.
	// When skipTimer is true, we're in "early start" mode - the MIX indicator shows,
	// but we keep audio at full volume since there's no dual playback yet.
	// The actual switch happens when finishTransition() is called.
	if (!skipTimer) {
		switch (style) {
			case "crossfade":
				executeCrossfade(outgoing, incoming, duration);
				break;
			case "filterSweep":
				executeFilterSweep(outgoing, incoming, duration);
				break;
			case "drop":
				executeDrop(outgoing, incoming);
				break;
			case "beatmatch":
				executeBeatmatch(outgoing, incoming, duration);
				break;
			case "echo":
				executeEcho(outgoing, incoming, duration);
				break;
			default:
				// hardcut or unknown - immediate switch
				executeHardcut(outgoing, incoming);
				break;
		}
	}

	// Schedule transition completion (unless caller will handle it)
	if (!skipTimer) {
		const completionDelay =
			style === "drop" || style === "hardcut" ? 100 : duration * 1000;

		transitionTimeout = setTimeout(() => {
			completeTransition();
		}, completionDelay);
	}
}

/**
 * Complete the current transition.
 */
function completeTransition(): void {
	if (!isTransitioning) return;

	const outgoing = getActiveDeck();
	const incoming = getInactiveDeck();

	// Emit songEnded for outgoing song
	if (outgoing.item?.kind === "song") {
		musicEvents.emit({ type: "songEnded", song: outgoing.item.song });
	}

	// Reset outgoing deck
	resetDeck(outgoing);

	// Ensure incoming deck is at full volume with open filter
	// (transition effects should have completed, but ensure clean state)
	if (audioContext) {
		const now = audioContext.currentTime;

		if (incoming.gainNode) {
			incoming.gainNode.gain.cancelScheduledValues(now);
			incoming.gainNode.gain.setValueAtTime(1, now);
		}

		if (incoming.filterNode) {
			incoming.filterNode.frequency.cancelScheduledValues(now);
			incoming.filterNode.frequency.setValueAtTime(20000, now);
		}

		const feedback = deckDelayFeedback[incoming.id];
		if (feedback) {
			feedback.gain.cancelScheduledValues(now);
			feedback.gain.setValueAtTime(0, now);
		}
	}

	// Dequeue the item we just transitioned to
	dequeueNext();

	// Switch active deck
	activeDeckId = incoming.id;
	incoming.state = "playing";

	// Emit itemStarted for new item
	if (incoming.item) {
		musicEvents.emit({ type: "itemStarted", item: incoming.item });
	}

	isTransitioning = false;
	transitionTimeout = null;

	musicEvents.emit({ type: "transitionComplete" });
}

/**
 * Cancel an in-progress transition.
 */
export function cancelTransition(): void {
	if (!isTransitioning) return;

	if (transitionTimeout) {
		clearTimeout(transitionTimeout);
		transitionTimeout = null;
	}

	// Reset incoming deck
	const incoming = getInactiveDeck();
	resetDeck(incoming);

	// Restore outgoing deck to full volume
	const outgoing = getActiveDeck();
	if (outgoing.gainNode && audioContext) {
		outgoing.gainNode.gain.setValueAtTime(1, audioContext.currentTime);
	}
	if (outgoing.filterNode && audioContext) {
		outgoing.filterNode.frequency.setValueAtTime(
			20000,
			audioContext.currentTime,
		);
	}
	outgoing.state = "playing";

	isTransitioning = false;
}

/**
 * Finish a transition immediately (used when song ends naturally).
 * Unlike cancelTransition, this completes the transition rather than aborting it.
 */
export function finishTransition(): void {
	if (!isTransitioning) return;

	if (transitionTimeout) {
		clearTimeout(transitionTimeout);
		transitionTimeout = null;
	}

	const outgoing = getActiveDeck();
	const incoming = getInactiveDeck();

	// Reset outgoing deck (sets gain to 0, ready for next transition)
	resetDeck(outgoing);

	// Ensure incoming deck is at full volume with open filter
	// Cancel any scheduled values from transition effects (crossfade, filterSweep, etc.)
	if (audioContext) {
		const now = audioContext.currentTime;

		if (incoming.gainNode) {
			incoming.gainNode.gain.cancelScheduledValues(now);
			incoming.gainNode.gain.setValueAtTime(1, now);
		}

		if (incoming.filterNode) {
			incoming.filterNode.frequency.cancelScheduledValues(now);
			incoming.filterNode.frequency.setValueAtTime(20000, now);
		}

		// Also reset incoming delay feedback in case echo transition was in progress
		const feedback = deckDelayFeedback[incoming.id];
		if (feedback) {
			feedback.gain.cancelScheduledValues(now);
			feedback.gain.setValueAtTime(0, now);
		}
	}

	// Make incoming deck the new active deck
	activeDeckId = incoming.id;
	incoming.state = "playing";

	isTransitioning = false;
	musicEvents.emit({ type: "transitionComplete" });
}

// ============================================
// Public API
// ============================================

/** Initialize the mixer with audio context and master output */
export function initMixer(ctx: AudioContext, master: GainNode): void {
	audioContext = ctx;
	masterOutput = master;

	// Initialize deck audio nodes
	initDeckAudio(decks.A);
	initDeckAudio(decks.B);
}

/** Get current automix settings */
export function getAutomixSettings(): AutomixSettings {
	return { ...automixSettings };
}

/** Update automix settings */
export function setAutomixSettings(settings: Partial<AutomixSettings>): void {
	automixSettings = { ...automixSettings, ...settings };
}

/** Toggle automix on/off */
export function toggleAutomix(): boolean {
	automixSettings.enabled = !automixSettings.enabled;
	return automixSettings.enabled;
}

/** Check if automix is enabled */
export function isAutomixEnabled(): boolean {
	return automixSettings.enabled;
}

/** Get the currently active deck */
export function getActiveDeckId(): DeckId {
	return activeDeckId;
}

/** Get deck by ID */
export function getDeck(id: DeckId): Deck {
	return decks[id];
}

/** Check if a transition is in progress */
export function isInTransition(): boolean {
	return isTransitioning;
}

/** Get delay before incoming deck should start playing (in seconds) */
export function getIncomingStartDelay(): number {
	if (!isTransitioning) return 0;

	const outgoing = getActiveDeck();
	const incoming = getInactiveDeck();

	if (!incoming.item) return 0;

	const style = determineTransitionStyle(outgoing.item, incoming.item);

	// For echo, incoming should start 80% through the transition
	if (style === "echo") {
		const outgoingSong =
			outgoing.item?.kind === "song" ? outgoing.item.song : null;
		const duration = getTransitionDuration(
			outgoingSong,
			automixSettings.transitionBars,
		);
		return duration * 0.8;
	}

	return 0;
}

/** Get the gain node for a deck (for routing audio) */
export function getDeckOutput(id: DeckId): AudioNode | null {
	return decks[id].filterNode ?? decks[id].gainNode;
}

/** Load an item into the active deck (for initial play) */
export function loadToDeck(item: PlayableItem, deckId?: DeckId): void {
	const deck = deckId ? decks[deckId] : getActiveDeck();
	deck.item = item;
	deck.state = "cueing";
	deck.currentBar = 0;
	deck.currentStep = 0;
	deck.startTime = audioContext?.currentTime ?? 0;

	// Set gain to 1 for active deck
	if (deck.gainNode && audioContext) {
		deck.gainNode.gain.setValueAtTime(
			deck.id === activeDeckId ? 1 : 0,
			audioContext.currentTime,
		);
	}
}

/** Mark the active deck as playing */
export function startPlayback(): void {
	const deck = getActiveDeck();
	deck.state = "playing";
	deck.startTime = audioContext?.currentTime ?? 0;

	// Ensure active deck has gain = 1 (it may have been reset by stopMixer)
	if (deck.gainNode && audioContext) {
		deck.gainNode.gain.setValueAtTime(1, audioContext.currentTime);
	}

	if (deck.item) {
		musicEvents.emit({ type: "itemStarted", item: deck.item });
	}
}

/** Update deck position (called from scheduler) */
export function updateDeckPosition(
	deckId: DeckId,
	bar: number,
	step: number,
): void {
	const deck = decks[deckId];
	deck.currentBar = bar;
	deck.currentStep = step;
}

/** Cleanup on stop */
export function stopMixer(): void {
	cancelTransition();
	resetDeck(decks.A);
	resetDeck(decks.B);
	activeDeckId = "A";
	clearQueue();
}
