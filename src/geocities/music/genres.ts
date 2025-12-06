import {
	calculateMoodCenter,
	genreMoodPositions,
	selectGenreFromMood,
} from "./mood";
import type { Genre, GenreType, VisualState } from "./types";

export const genres: Record<GenreType, Genre> = {
	chiptune: {
		name: "chiptune",
		tempoRange: [120, 160],
		preferredScales: ["major", "pentatonic", "mixolydian", "lydian"],
		drumPatterns: ["syncopated", "basic", "disco", "newWave"],
		oscTypes: { melody: ["square", "triangle"], bass: ["square", "triangle"] },
		delayRange: [0.15, 0.25],
		filterRange: [10000, 14000],
		detuneRange: [0, 2], // Slight variation, mostly straight
		attackRange: [0.003, 0.008],
		swingRange: [0, 0.05], // Mostly straight timing for that rigid 8-bit feel
		portamentoRange: [0, 0], // No glide - rigid 8-bit style
		wowFlutterRange: [0, 0], // No wobble
		pwmDepthRange: [0.1, 0.25], // Classic PWM for that C64 sound
		reverbRange: [0, 0.1], // Minimal reverb - clean digital sound
		chorusRange: [0, 0.05], // Very slight chorus if any
		stereoWidthRange: [0.3, 0.5], // Some stereo spread for arps
		transitions: ["drop", "hardcut"],
		buildTypes: ["acceleratingSnare", "tomCascade"],
	},
	ambient: {
		name: "ambient",
		tempoRange: [60, 90],
		preferredScales: [
			"pentatonic",
			"dorian",
			"minor",
			"wholeTone",
			"hirajoshi",
			"insen",
		],
		drumPatterns: ["minimal", "bossa"],
		oscTypes: { melody: ["sine", "triangle"], bass: ["sine"] },
		delayRange: [0.5, 0.7],
		filterRange: [2000, 4000],
		detuneRange: [5, 12],
		attackRange: [0.2, 0.4],
		swingRange: [0.05, 0.15], // Very slight swing for organic feel
		portamentoRange: [0.08, 0.2], // Slow, dreamy glides
		wowFlutterRange: [0.05, 0.15], // Subtle organic drift
		pwmDepthRange: [0, 0], // Sine/triangle don't use PWM
		reverbRange: [0.4, 0.7], // Lots of reverb - spacious and atmospheric
		chorusRange: [0.2, 0.4], // Moderate chorus for shimmer
		stereoWidthRange: [0.7, 1.0], // Wide stereo for immersion
		transitions: ["crossfade", "echo"],
		buildTypes: ["sparseToDense", "tomCascade"],
	},
	synthwave: {
		name: "synthwave",
		tempoRange: [100, 120],
		preferredScales: ["minor", "dorian", "minorPentatonic", "lydian"],
		drumPatterns: [
			"basic",
			"syncopated",
			"funk",
			"twoStep",
			"motorik",
			"newWave",
		],
		oscTypes: { melody: ["sawtooth", "square"], bass: ["sawtooth", "square"] },
		delayRange: [0.3, 0.5],
		filterRange: [4500, 7500],
		detuneRange: [3, 8],
		attackRange: [0.01, 0.03],
		swingRange: [0, 0.08], // Minimal swing
		portamentoRange: [0.03, 0.08], // Smooth synth glides
		wowFlutterRange: [0, 0.05], // Very subtle analog drift
		pwmDepthRange: [0.2, 0.4], // Animated pulse width for movement
		reverbRange: [0.25, 0.45], // Moderate reverb - 80s gated feel
		chorusRange: [0.3, 0.5], // Classic synthwave chorus for lush pads
		stereoWidthRange: [0.5, 0.8], // Wide stereo for that cinematic feel
		transitions: ["filterSweep", "beatmatch"],
		buildTypes: ["acceleratingSnare", "sparseToDense", "tomCascade"],
	},
	lofi: {
		name: "lofi",
		tempoRange: [70, 90],
		preferredScales: [
			"minorPentatonic",
			"blues",
			"dorian",
			"melodicMinor",
			"insen",
		],
		drumPatterns: [
			"jazz",
			"halftime",
			"bossa",
			"shuffle",
			"reggae",
			"afrobeat",
		],
		oscTypes: { melody: ["triangle", "sine"], bass: ["sine", "triangle"] },
		delayRange: [0.2, 0.4],
		filterRange: [2000, 3000],
		detuneRange: [8, 16],
		attackRange: [0.03, 0.08],
		swingRange: [0.25, 0.4], // Heavy swing for that jazzy lofi feel
		portamentoRange: [0.02, 0.06], // Slight jazzy slides
		wowFlutterRange: [0.15, 0.35], // That worn cassette wobble
		pwmDepthRange: [0, 0], // Triangle/sine don't use PWM
		reverbRange: [0.15, 0.3], // Subtle room reverb - intimate feel
		chorusRange: [0.1, 0.25], // Slight chorus for warmth
		stereoWidthRange: [0.4, 0.6], // Moderate stereo - cozy not huge
		transitions: ["crossfade", "filterSweep"],
		buildTypes: ["sparseToDense", "tomCascade"],
	},
	techno: {
		name: "techno",
		tempoRange: [125, 140],
		preferredScales: [
			"minorPentatonic",
			"phrygian",
			"minor",
			"phrygianDominant",
			"diminished",
			"locrian",
		],
		drumPatterns: [
			"house",
			"trap808",
			"minimal",
			"industrial",
			"dubstep",
			"drill",
			"motorik",
		],
		oscTypes: { melody: ["sawtooth", "square"], bass: ["sawtooth"] },
		delayRange: [0.25, 0.45],
		filterRange: [3500, 6500],
		detuneRange: [1, 5],
		attackRange: [0.005, 0.02],
		swingRange: [0, 0.03], // Dead straight for machine precision
		portamentoRange: [0, 0.02], // Very minimal, tight
		wowFlutterRange: [0, 0], // Clean and precise
		pwmDepthRange: [0.15, 0.35], // Moving pulse for acid sounds
		reverbRange: [0.1, 0.25], // Short reverb - warehouse feel
		chorusRange: [0.05, 0.15], // Minimal chorus - keep it tight
		stereoWidthRange: [0.3, 0.6], // Some width but focused
		transitions: ["beatmatch", "filterSweep", "drop"],
		buildTypes: ["acceleratingSnare", "sparseToDense"],
	},
	trance: {
		name: "trance",
		tempoRange: [135, 150],
		preferredScales: ["minor", "phrygian", "minorPentatonic", "harmonicMinor"],
		drumPatterns: ["disco", "house", "dnb", "dubstep"],
		oscTypes: { melody: ["sawtooth"], bass: ["square", "sawtooth"] },
		delayRange: [0.4, 0.6],
		filterRange: [6000, 10000],
		detuneRange: [4, 9],
		attackRange: [0.005, 0.02],
		swingRange: [0, 0.03], // Straight timing
		portamentoRange: [0.04, 0.1], // Iconic trance lead glides
		wowFlutterRange: [0, 0], // Clean digital sound
		pwmDepthRange: [0.2, 0.45], // Super saw movement
		reverbRange: [0.3, 0.5], // Big reverb for epic builds
		chorusRange: [0.35, 0.55], // Heavy chorus for supersaw thickness
		stereoWidthRange: [0.6, 0.9], // Wide stereo for that epic sound
		transitions: ["beatmatch", "filterSweep"],
		buildTypes: ["acceleratingSnare", "sparseToDense"],
	},
	midi: {
		name: "midi",
		tempoRange: [100, 140],
		preferredScales: ["major", "minor", "pentatonic"],
		drumPatterns: ["basic", "syncopated"],
		oscTypes: {
			melody: ["square", "triangle", "sawtooth"],
			bass: ["triangle", "square"],
		},
		delayRange: [0, 0.1], // Mostly dry MIDI sound
		filterRange: [12000, 16000], // Minimal filtering
		detuneRange: [0, 1], // No detune - that thin single-osc sound
		attackRange: [0.001, 0.005], // Instant attack
		swingRange: [0, 0.02], // Rigid timing
		portamentoRange: [0, 0], // No glide - rigid GM sound
		wowFlutterRange: [0, 0], // Clean digital
		pwmDepthRange: [0, 0.1], // Minimal PWM
		reverbRange: [0.05, 0.15], // Very dry - classic GM reverb
		chorusRange: [0, 0.1], // Minimal or none
		stereoWidthRange: [0.2, 0.4], // Narrow stereo - old school
		transitions: ["hardcut"],
		buildTypes: ["acceleratingSnare", "tomCascade"],
	},
	happycore: {
		name: "happycore",
		tempoRange: [160, 180],
		preferredScales: ["major", "pentatonic", "mixolydian", "lydian"],
		drumPatterns: ["disco", "dnb", "breakbeat"],
		oscTypes: { melody: ["square", "sawtooth"], bass: ["sawtooth", "square"] },
		delayRange: [0.15, 0.3],
		filterRange: [8000, 12000],
		detuneRange: [2, 6],
		attackRange: [0.003, 0.01],
		swingRange: [0, 0.03], // Dead straight for maximum energy
		portamentoRange: [0.01, 0.03], // Quick pitch bends
		wowFlutterRange: [0, 0], // Clean and bright
		pwmDepthRange: [0.15, 0.3], // Animated leads
		reverbRange: [0.2, 0.35], // Some reverb for energy
		chorusRange: [0.2, 0.4], // Chorus for that bright shimmery sound
		stereoWidthRange: [0.5, 0.8], // Wide for that euphoric feel
		transitions: ["drop", "beatmatch"],
		buildTypes: ["acceleratingSnare", "sparseToDense"],
	},
	vaporwave: {
		name: "vaporwave",
		tempoRange: [60, 80],
		preferredScales: [
			"major",
			"dorian",
			"mixolydian",
			"wholeTone",
			"hirajoshi",
		],
		drumPatterns: ["bossa", "halftime", "jazz", "reggae"],
		oscTypes: { melody: ["sine", "triangle"], bass: ["triangle", "sine"] },
		delayRange: [0.6, 0.8], // Lots of delay
		filterRange: [1500, 2500], // Muffled sound
		detuneRange: [12, 20], // Very detuned for that warped tape feel
		attackRange: [0.1, 0.2], // Slow attack
		swingRange: [0.15, 0.25], // Lazy swing
		portamentoRange: [0.1, 0.25], // Slow, dreamy glides
		wowFlutterRange: [0.25, 0.5], // Heavy tape warble
		pwmDepthRange: [0, 0], // Sine/triangle don't use PWM
		reverbRange: [0.35, 0.6], // Big reverb - mall muzak in empty spaces
		chorusRange: [0.3, 0.5], // Heavy chorus for that detuned shimmer
		stereoWidthRange: [0.6, 0.9], // Wide stereo for dreaminess
		transitions: ["echo", "crossfade"],
		buildTypes: ["sparseToDense", "tomCascade"],
	},
};

/**
 * Invert a genre to its opposite on the mood map (for B-side).
 * Uses the mood positions to find the genre on the opposite side.
 */
export function invertGenre(genre: Genre): Genre {
	const pos = genreMoodPositions[genre.name];

	// Invert both axes
	const invertedPos = {
		energy: -pos.energy,
		brightness: -pos.brightness,
	};

	// Find the closest genre to the inverted position
	let closestGenre: GenreType = "lofi";
	let closestDistance = Number.POSITIVE_INFINITY;

	for (const [name, moodPos] of Object.entries(genreMoodPositions)) {
		const dE = invertedPos.energy - moodPos.energy;
		const dB = invertedPos.brightness - moodPos.brightness;
		const distance = Math.sqrt(dE * dE + dB * dB);

		if (distance < closestDistance) {
			closestDistance = distance;
			closestGenre = name as GenreType;
		}
	}

	return genres[closestGenre];
}

/**
 * Pick a genre based on page visual state using the two-axis mood system.
 * Analyzes page content, time of day, and visual properties to determine mood.
 * If bSide is true, inverts the result to the opposite mood.
 *
 * @param visualState - Sampled page visual state
 * @param bSide - Whether to invert for B-side of tape
 * @param variety - How much variety in genre selection (0-1), defaults to 0.3
 */
export function selectGenre(
	visualState: VisualState,
	bSide = false,
	variety = 0.3,
): Genre {
	// Calculate mood center from page analysis
	const moodCenter = calculateMoodCenter(visualState);

	// Select genre from mood with some variety
	const genreType = selectGenreFromMood(moodCenter, variety);
	const selected = genres[genreType];

	// Invert for B-side if requested
	return bSide ? invertGenre(selected) : selected;
}
