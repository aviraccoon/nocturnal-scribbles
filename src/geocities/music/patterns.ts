import { drumPatterns, STEPS_PER_BAR } from "./data";
import type {
	ArpPatternType,
	BassPatternType,
	FXNote,
	FXType,
	Genre,
	GenreType,
	MelodyNote,
	MelodyPatternType,
	Pattern,
	RhythmVariationType,
	Section,
} from "./types";

const T = window.ThemeUtils;

/** Convert a scale degree to a MIDI note offset, handling octave wrapping. */
export function getScaleNote(scale: number[], degree: number, octaveShift = 0) {
	const octave = Math.floor(degree / scale.length);
	const note = scale[((degree % scale.length) + scale.length) % scale.length];
	return (note ?? 0) + (octave + octaveShift) * 12;
}

export type PatternParams = {
	section: Section;
	genre: Genre;
	scale: number[];
	rootNote: number;
	progression: number[];
	tempo: number;
	delayAmount: number;
	filterCutoff: number;
};

// Melody pattern type weights by genre
const melodyPatternWeights: Record<
	GenreType,
	Partial<Record<MelodyPatternType, number>>
> = {
	chiptune: {
		free: 2,
		sequence: 3,
		riff: 4,
		trill: 2,
		scaleRun: 2,
		staccato: 3,
		intervallic: 2,
	},
	ambient: {
		free: 3,
		sequence: 1,
		pedal: 4,
		ostinato: 3,
		motifDevelopment: 2,
		counterpoint: 2,
		echo: 3,
	},
	synthwave: {
		free: 2,
		sequence: 3,
		octaveJumps: 2,
		riff: 2,
		pedal: 2,
		scaleRun: 1,
		echo: 2,
		intervallic: 2,
	},
	lofi: {
		free: 3,
		callResponse: 2,
		sequence: 1,
		syncopated: 3,
		motifDevelopment: 2,
		chromaticApproach: 3,
		counterpoint: 1,
	},
	techno: {
		riff: 4,
		sequence: 2,
		octaveJumps: 1,
		ostinato: 4,
		syncopated: 2,
		staccato: 3,
		intervallic: 2,
	},
	trance: {
		sequence: 3,
		octaveJumps: 3,
		riff: 2,
		trill: 1,
		pedal: 3,
		scaleRun: 2,
		echo: 4,
	},
	midi: {
		free: 3,
		sequence: 2,
		riff: 2,
		scaleRun: 2,
		motifDevelopment: 1,
		staccato: 2,
		counterpoint: 1,
	},
	happycore: {
		sequence: 2,
		octaveJumps: 4,
		riff: 3,
		trill: 2,
		scaleRun: 3,
		staccato: 3,
	},
	vaporwave: {
		free: 3,
		sequence: 2,
		callResponse: 1,
		pedal: 2,
		ostinato: 2,
		echo: 3,
		chromaticApproach: 2,
	},
};

// Pick a weighted random melody pattern for a genre
function pickMelodyPattern(genre: Genre): MelodyPatternType {
	const weights = melodyPatternWeights[genre.name] ?? { free: 1 };
	const entries = Object.entries(weights) as [MelodyPatternType, number][];
	const total = entries.reduce((sum, [, w]) => sum + w, 0);
	let r = Math.random() * total;
	for (const [pattern, weight] of entries) {
		r -= weight;
		if (r <= 0) return pattern;
	}
	return "free";
}

// Bass pattern weights by genre - ensures stylistic coherence
const bassPatternWeights: Record<
	GenreType,
	Partial<Record<BassPatternType, number>>
> = {
	chiptune: { simple: 3, octave: 3, fifth: 2, driving: 2 },
	ambient: { simple: 4, fifth: 2, melodic: 2 },
	synthwave: { octave: 3, driving: 2, pump: 2, disco: 2, syncopated: 1 },
	lofi: { simple: 2, walking: 3, melodic: 2, reggae: 2, syncopated: 1 },
	techno: { driving: 4, pump: 3, simple: 2, syncopated: 1 },
	trance: { driving: 3, pump: 3, octave: 2, fifth: 1 },
	midi: { simple: 3, octave: 2, fifth: 2, walking: 1 },
	happycore: { driving: 3, octave: 3, disco: 2, pump: 1 },
	vaporwave: { simple: 3, melodic: 2, walking: 2, reggae: 1 },
};

// Arp pattern weights by genre
const arpPatternWeights: Record<
	GenreType,
	Partial<Record<ArpPatternType, number>>
> = {
	chiptune: { up: 3, down: 2, updown: 2, skipUp: 2, twoOctave: 1 },
	ambient: { spread: 4, cascade: 3, brokenChord: 2, thumb: 1 },
	synthwave: { up: 2, updown: 2, twoOctave: 2, spread: 1, pingpong: 1 },
	lofi: { brokenChord: 3, thumb: 3, spread: 2, random: 1 },
	techno: { up: 3, pingpong: 2, skipUp: 2, cascade: 1 },
	trance: { up: 3, updown: 3, twoOctave: 2, skipUp: 1 },
	midi: { up: 3, down: 2, updown: 2, random: 1 },
	happycore: { up: 3, updown: 2, twoOctave: 2, skipUp: 2 },
	vaporwave: { spread: 3, brokenChord: 3, thumb: 2, cascade: 1 },
};

// Pick bass pattern based on genre and section energy
function pickBassPattern(genre: Genre, energy: number): BassPatternType {
	const weights = bassPatternWeights[genre.name] ?? { simple: 1 };

	// Filter patterns by energy - high energy sections get more complex patterns
	const energyFiltered: Partial<Record<BassPatternType, number>> = {};
	const complexPatterns: BassPatternType[] = [
		"walking",
		"slap",
		"melodic",
		"syncopated",
	];
	const simplePatterns: BassPatternType[] = ["simple", "fifth", "octave"];

	for (const [pattern, weight] of Object.entries(weights) as [
		BassPatternType,
		number,
	][]) {
		// Boost simple patterns for low energy, complex for high energy
		if (energy < 0.4 && complexPatterns.includes(pattern)) {
			energyFiltered[pattern] = weight * 0.3;
		} else if (energy > 0.7 && simplePatterns.includes(pattern)) {
			energyFiltered[pattern] = weight * 0.5;
		} else {
			energyFiltered[pattern] = weight;
		}
	}

	const entries = Object.entries(energyFiltered) as [BassPatternType, number][];
	const total = entries.reduce((sum, [, w]) => sum + w, 0);
	let r = Math.random() * total;
	for (const [pattern, weight] of entries) {
		r -= weight;
		if (r <= 0) return pattern;
	}
	return "simple";
}

// Pick arp pattern based on genre and section energy
function pickArpPattern(genre: Genre, energy: number): ArpPatternType {
	const weights = arpPatternWeights[genre.name] ?? { up: 1 };

	// Filter by energy - faster/complex patterns for high energy
	const energyFiltered: Partial<Record<ArpPatternType, number>> = {};
	const fastPatterns: ArpPatternType[] = [
		"twoOctave",
		"skipUp",
		"skipDown",
		"cascade",
	];
	const slowPatterns: ArpPatternType[] = ["spread", "brokenChord", "thumb"];

	for (const [pattern, weight] of Object.entries(weights) as [
		ArpPatternType,
		number,
	][]) {
		if (energy < 0.4 && fastPatterns.includes(pattern)) {
			energyFiltered[pattern] = weight * 0.3;
		} else if (energy > 0.7 && slowPatterns.includes(pattern)) {
			energyFiltered[pattern] = weight * 0.5;
		} else {
			energyFiltered[pattern] = weight;
		}
	}

	const entries = Object.entries(energyFiltered) as [ArpPatternType, number][];
	const total = entries.reduce((sum, [, w]) => sum + w, 0);
	let r = Math.random() * total;
	for (const [pattern, weight] of entries) {
		r -= weight;
		if (r <= 0) return pattern;
	}
	return "up";
}

// Generate a short melodic phrase (for call/response and riffs)
function generatePhrase(
	scale: number[],
	rootNote: number,
	startStep: number,
	length: number,
	startDegree: number,
	energy: number,
): MelodyNote[] {
	const notes: MelodyNote[] = [];
	let degree = startDegree;
	let step = startStep;

	while (step < startStep + length) {
		const movements = [-2, -1, -1, 0, 1, 1, 2];
		degree = Math.max(0, Math.min(9, degree + T.pick(movements)));
		const note = getScaleNote(scale, degree, 1) + rootNote;
		const duration = T.pick([0.5, 1, 1, 1.5]);

		notes.push({
			step,
			note,
			duration,
			velocity: (0.5 + energy * 0.5) * (0.8 + Math.random() * 0.2),
		});

		step += Math.ceil(duration) + (Math.random() > 0.7 ? 1 : 0);
	}

	return notes;
}

// Generate call and response pattern
function generateCallResponse(
	scale: number[],
	rootNote: number,
	totalSteps: number,
	progression: number[],
	energy: number,
): MelodyNote[] {
	const notes: MelodyNote[] = [];
	const phraseLength = 6; // Steps per phrase
	const gapLength = 2; // Rest between call and response

	for (let barStart = 0; barStart < totalSteps; barStart += STEPS_PER_BAR) {
		const progBar = Math.floor(barStart / STEPS_PER_BAR) % progression.length;
		const chordRoot = progression[progBar] ?? 0;

		// Call phrase (first half of bar)
		const callDegree = chordRoot + T.pick([0, 2, 4]);
		const call = generatePhrase(
			scale,
			rootNote,
			barStart,
			phraseLength,
			callDegree,
			energy,
		);
		notes.push(...call);

		// Response phrase (second half, slightly lower or higher)
		const responseOffset = T.pick([-2, -1, 1, 2]);
		const responseDegree = callDegree + responseOffset;
		const response = generatePhrase(
			scale,
			rootNote,
			barStart + phraseLength + gapLength,
			phraseLength,
			responseDegree,
			energy * 0.9, // Response slightly quieter
		);
		notes.push(...response);
	}

	return notes;
}

// Generate sequence pattern (melodic idea repeated at different pitches)
function generateSequence(
	scale: number[],
	rootNote: number,
	totalSteps: number,
	progression: number[],
	energy: number,
): MelodyNote[] {
	const notes: MelodyNote[] = [];

	// Generate a short motif (2-4 notes)
	const motifLength = T.rand(2, 4);
	const motif: { interval: number; duration: number }[] = [];
	for (let i = 0; i < motifLength; i++) {
		motif.push({
			interval: T.rand(-2, 4),
			duration: T.pick([0.5, 1, 1, 1.5]),
		});
	}

	// Repeat motif at different transpositions
	let step = 0;
	let transposition = 0;

	while (step < totalSteps) {
		const bar = Math.floor(step / STEPS_PER_BAR);
		const progBar = bar % progression.length;
		const chordRoot = progression[progBar] ?? 0;

		for (const m of motif) {
			if (step >= totalSteps) break;

			const degree = chordRoot + m.interval + transposition;
			const note = getScaleNote(scale, degree, 1) + rootNote;

			notes.push({
				step,
				note,
				duration: m.duration,
				velocity: (0.5 + energy * 0.5) * (0.8 + Math.random() * 0.2),
			});

			step += Math.ceil(m.duration) + (Math.random() > 0.6 ? 1 : 0);
		}

		// Transpose for next repetition (sequence ascending or descending)
		transposition += T.pick([-2, -1, 1, 2, 2]);

		// Occasional rest between sequences
		if (Math.random() > 0.6) step += T.rand(2, 4);
	}

	return notes;
}

// Generate octave jump pattern (EDM-style wide intervals)
function generateOctaveJumps(
	scale: number[],
	rootNote: number,
	totalSteps: number,
	progression: number[],
	energy: number,
): MelodyNote[] {
	const notes: MelodyNote[] = [];
	let lastNote = T.rand(0, 4);
	let octave = 1;

	for (let i = 0; i < totalSteps; i += 2) {
		const bar = Math.floor(i / STEPS_PER_BAR);
		const progBar = bar % progression.length;
		const chordRoot = progression[progBar] ?? 0;
		const beatInBar = i % STEPS_PER_BAR;

		// Higher chance of notes on strong beats
		const beatStrength =
			beatInBar % 4 === 0 ? 1.4 : beatInBar % 2 === 0 ? 1.1 : 0.8;
		if (Math.random() > 0.5 * beatStrength) continue;

		// Octave jumps on every other note
		if (Math.random() > 0.5) {
			octave = octave === 1 ? 2 : 1;
		}

		// Sometimes jump to chord tone
		if (Math.random() > 0.7) {
			lastNote = chordRoot + T.pick([0, 2, 4, 7]);
		} else {
			lastNote = Math.max(0, Math.min(7, lastNote + T.pick([-2, -1, 0, 1, 2])));
		}

		const note = getScaleNote(scale, lastNote, octave) + rootNote;
		const duration = T.pick([0.5, 1, 1]);

		notes.push({
			step: i,
			note,
			duration,
			velocity: (0.6 + energy * 0.4) * (0.85 + Math.random() * 0.15),
		});
	}

	return notes;
}

// Generate trill/mordent pattern
function generateTrill(
	scale: number[],
	rootNote: number,
	totalSteps: number,
	progression: number[],
	energy: number,
): MelodyNote[] {
	const notes: MelodyNote[] = [];

	for (let bar = 0; bar < Math.floor(totalSteps / STEPS_PER_BAR); bar++) {
		const progBar = bar % progression.length;
		const chordRoot = progression[progBar] ?? 0;
		const barStart = bar * STEPS_PER_BAR;

		// Place 1-2 trills per bar
		const trillCount = T.rand(1, 2);
		const trillPositions = [0, 4, 8, 12]
			.sort(() => Math.random() - 0.5)
			.slice(0, trillCount);

		for (const pos of trillPositions) {
			const step = barStart + pos;
			const mainDegree = chordRoot + T.pick([0, 2, 4]);
			const trillDegree = mainDegree + T.pick([1, 2]); // Trill to adjacent scale note

			const mainNote = getScaleNote(scale, mainDegree, 1) + rootNote;
			const trillNote = getScaleNote(scale, trillDegree, 1) + rootNote;

			// Trill: rapid alternation (4 quick notes)
			const trillSpeed = 0.25;
			for (let t = 0; t < 4; t++) {
				notes.push({
					step: step + t * trillSpeed,
					note: t % 2 === 0 ? mainNote : trillNote,
					duration: trillSpeed,
					velocity: (0.4 + energy * 0.4) * (t === 0 ? 1 : 0.7),
				});
			}

			// Resolve to main note
			notes.push({
				step: step + 1,
				note: mainNote,
				duration: 1.5,
				velocity: (0.5 + energy * 0.5) * 0.9,
			});
		}

		// Fill remaining space with regular notes
		const usedSteps = new Set(
			notes
				.filter((n) => n.step >= barStart && n.step < barStart + STEPS_PER_BAR)
				.map((n) => Math.floor(n.step)),
		);
		for (let i = barStart; i < barStart + STEPS_PER_BAR; i += 4) {
			if (!usedSteps.has(i) && Math.random() > 0.5) {
				const degree = chordRoot + T.pick([0, 2, 4, 5]);
				notes.push({
					step: i,
					note: getScaleNote(scale, degree, 1) + rootNote,
					duration: T.pick([1, 2]),
					velocity: (0.4 + energy * 0.4) * (0.8 + Math.random() * 0.2),
				});
			}
		}
	}

	return notes;
}

// Generate riff pattern (short repeating melodic fragment)
function generateRiff(
	scale: number[],
	rootNote: number,
	totalSteps: number,
	progression: number[],
	energy: number,
): MelodyNote[] {
	const notes: MelodyNote[] = [];

	// Create a riff (4-8 note pattern that repeats)
	const riffLength = T.rand(4, 8);
	const riff: { stepOffset: number; degree: number; duration: number }[] = [];

	let step = 0;
	for (let i = 0; i < riffLength; i++) {
		riff.push({
			stepOffset: step,
			degree: T.rand(-2, 6),
			duration: T.pick([0.5, 0.5, 1, 1]),
		});
		step += riff[i]?.duration ?? 1;
		if (Math.random() > 0.7) step += 0.5; // Occasional gap
	}

	const riffTotalSteps = step;

	// Repeat riff, transposing to follow chord progression
	for (let barStart = 0; barStart < totalSteps; barStart += STEPS_PER_BAR) {
		const progBar = Math.floor(barStart / STEPS_PER_BAR) % progression.length;
		const chordRoot = progression[progBar] ?? 0;

		// Play riff twice per bar (or once if riff is long)
		const repetitions = riffTotalSteps > 8 ? 1 : 2;
		for (let rep = 0; rep < repetitions; rep++) {
			const repOffset = rep * (STEPS_PER_BAR / repetitions);

			for (const r of riff) {
				const absStep = barStart + repOffset + r.stepOffset;
				if (absStep >= totalSteps) break;

				const note = getScaleNote(scale, chordRoot + r.degree, 1) + rootNote;
				notes.push({
					step: absStep,
					note,
					duration: r.duration,
					velocity: (0.5 + energy * 0.5) * (0.85 + Math.random() * 0.15),
				});
			}
		}
	}

	return notes;
}

// Generate pedal point pattern (melody dances over a sustained drone note)
function generatePedal(
	scale: number[],
	rootNote: number,
	totalSteps: number,
	progression: number[],
	energy: number,
): MelodyNote[] {
	const notes: MelodyNote[] = [];

	// Pedal note: usually root or fifth of the key
	const pedalDegree = T.pick([0, 4]); // Root or fifth
	const pedalNote = getScaleNote(scale, pedalDegree, 0) + rootNote;

	for (let bar = 0; bar < Math.floor(totalSteps / STEPS_PER_BAR); bar++) {
		const barStart = bar * STEPS_PER_BAR;
		const progBar = bar % progression.length;
		const chordRoot = progression[progBar] ?? 0;

		// Sustained pedal note (plays on beat 1, long duration)
		notes.push({
			step: barStart,
			note: pedalNote,
			duration: 8, // Half bar sustain
			velocity: (0.3 + energy * 0.3) * 0.9,
		});

		// Dancing melody above the pedal
		let melodyDegree = chordRoot + T.pick([2, 4, 5, 7]);
		for (let beat = 0; beat < 4; beat++) {
			const stepOffset = beat * 4;
			// Skip beat 1 sometimes to let pedal breathe
			if (beat === 0 && Math.random() > 0.4) continue;

			// Move melody by step or small leap
			const movement = T.pick([-2, -1, -1, 1, 1, 2]);
			melodyDegree = Math.max(2, Math.min(10, melodyDegree + movement));

			const melodyNote = getScaleNote(scale, melodyDegree, 1) + rootNote;
			const duration = T.pick([1, 1.5, 2]);

			notes.push({
				step: barStart + stepOffset + T.pick([0, 1, 2]),
				note: melodyNote,
				duration,
				velocity: (0.5 + energy * 0.5) * (0.8 + Math.random() * 0.2),
			});

			// Sometimes add a quick passing tone
			if (Math.random() > 0.7) {
				notes.push({
					step: barStart + stepOffset + 2,
					note:
						getScaleNote(scale, melodyDegree + T.pick([-1, 1]), 1) + rootNote,
					duration: 0.5,
					velocity: (0.4 + energy * 0.3) * 0.8,
				});
			}
		}
	}

	return notes;
}

// Generate ostinato pattern (fixed repeating pattern that doesn't transpose with chords)
function generateOstinato(
	scale: number[],
	rootNote: number,
	totalSteps: number,
	_progression: number[],
	energy: number,
): MelodyNote[] {
	const notes: MelodyNote[] = [];

	// Create a fixed ostinato pattern (2-4 notes, very short cycle)
	const ostinatoLength = T.rand(2, 4);
	const ostinato: { stepOffset: number; degree: number; duration: number }[] =
		[];

	// Build ostinato from scale degrees (doesn't follow chord changes)
	const baseDegree = T.rand(0, 4);
	let step = 0;
	for (let i = 0; i < ostinatoLength; i++) {
		ostinato.push({
			stepOffset: step,
			degree: baseDegree + T.pick([0, 1, 2, 3, 4]),
			duration: T.pick([0.5, 1]),
		});
		step += ostinato[i]?.duration ?? 1;
	}

	const cycleLength = step;

	// Repeat the fixed pattern throughout (hypnotic, minimal feel)
	let currentStep = 0;
	while (currentStep < totalSteps) {
		for (const o of ostinato) {
			const absStep = currentStep + o.stepOffset;
			if (absStep >= totalSteps) break;

			// Ostinato stays fixed - no transposition
			const note = getScaleNote(scale, o.degree, 1) + rootNote;
			notes.push({
				step: absStep,
				note,
				duration: o.duration,
				velocity: (0.4 + energy * 0.4) * (0.85 + Math.random() * 0.15),
			});
		}
		currentStep += cycleLength;
	}

	return notes;
}

// Generate scale run pattern (quick ascending/descending scale passages)
function generateScaleRun(
	scale: number[],
	rootNote: number,
	totalSteps: number,
	progression: number[],
	energy: number,
): MelodyNote[] {
	const notes: MelodyNote[] = [];

	for (let bar = 0; bar < Math.floor(totalSteps / STEPS_PER_BAR); bar++) {
		const barStart = bar * STEPS_PER_BAR;
		const progBar = bar % progression.length;
		const chordRoot = progression[progBar] ?? 0;

		// Decide: ascending run, descending run, or held note
		const runType = T.pick(["up", "down", "hold", "hold"]);

		if (runType === "hold") {
			// Simple held chord tone
			const degree = chordRoot + T.pick([0, 2, 4]);
			notes.push({
				step: barStart,
				note: getScaleNote(scale, degree, 1) + rootNote,
				duration: 4,
				velocity: (0.5 + energy * 0.4) * 0.9,
			});
			// Maybe a second note later in the bar
			if (Math.random() > 0.5) {
				notes.push({
					step: barStart + 8,
					note: getScaleNote(scale, degree + T.pick([-2, 2, 3]), 1) + rootNote,
					duration: 3,
					velocity: (0.4 + energy * 0.4) * 0.85,
				});
			}
		} else {
			// Scale run
			const runLength = T.rand(4, 8);
			const startDegree =
				runType === "up" ? chordRoot : chordRoot + runLength - 1;
			const direction = runType === "up" ? 1 : -1;
			const startStep = T.pick([0, 4, 8]); // Start on different beats

			for (let i = 0; i < runLength; i++) {
				const step = barStart + startStep + i;
				if (step >= totalSteps) break;

				const degree = startDegree + i * direction;
				notes.push({
					step,
					note: getScaleNote(scale, degree, 1) + rootNote,
					duration: 0.5,
					velocity:
						(0.4 + energy * 0.5) *
						(runType === "up" ? 0.7 + i * 0.04 : 1 - i * 0.04),
				});
			}

			// Land on a longer note after the run
			const landDegree = startDegree + runLength * direction;
			notes.push({
				step: barStart + startStep + runLength,
				note: getScaleNote(scale, landDegree, 1) + rootNote,
				duration: 2,
				velocity: (0.5 + energy * 0.5) * 0.95,
			});
		}
	}

	return notes;
}

// Generate syncopated groove pattern (heavy offbeat emphasis)
function generateSyncopated(
	scale: number[],
	rootNote: number,
	totalSteps: number,
	progression: number[],
	energy: number,
): MelodyNote[] {
	const notes: MelodyNote[] = [];
	let lastNote = T.rand(2, 6);

	// Syncopated positions: offbeats and anticipations
	const syncopatedPositions = [1, 3, 5, 7, 9, 11, 13, 15]; // All offbeats
	const anticipationPositions = [15, 7]; // Anticipate next bar or beat 3

	for (let bar = 0; bar < Math.floor(totalSteps / STEPS_PER_BAR); bar++) {
		const barStart = bar * STEPS_PER_BAR;
		const progBar = bar % progression.length;
		const chordRoot = progression[progBar] ?? 0;

		// Place notes on syncopated positions
		for (const pos of syncopatedPositions) {
			if (Math.random() > 0.5 + energy * 0.2) continue; // Density based on energy

			// Move by step, with occasional chord tone jump
			if (Math.random() > 0.8) {
				lastNote = chordRoot + T.pick([0, 2, 4]);
			} else {
				lastNote = Math.max(0, Math.min(8, lastNote + T.pick([-2, -1, 1, 2])));
			}

			const note = getScaleNote(scale, lastNote, 1) + rootNote;
			// Shorter notes on syncopated beats for that funky feel
			const duration = T.pick([0.5, 0.75, 1]);

			notes.push({
				step: barStart + pos,
				note,
				duration,
				velocity: (0.5 + energy * 0.5) * (0.85 + Math.random() * 0.15),
			});
		}

		// Add anticipations (notes that "push" into the next beat)
		for (const pos of anticipationPositions) {
			if (Math.random() > 0.3) continue;
			const nextChordRoot =
				progression[(progBar + (pos === 15 ? 1 : 0)) % progression.length] ?? 0;
			const degree = nextChordRoot + T.pick([0, 2, 4]);
			notes.push({
				step: barStart + pos,
				note: getScaleNote(scale, degree, 1) + rootNote,
				duration: 1.5, // Ties over the barline
				velocity: (0.6 + energy * 0.4) * 0.9,
			});
		}
	}

	return notes;
}

// Generate motif development pattern (introduces motif then varies it)
function generateMotifDevelopment(
	scale: number[],
	rootNote: number,
	totalSteps: number,
	progression: number[],
	energy: number,
): MelodyNote[] {
	const notes: MelodyNote[] = [];

	// Create the original motif (3-5 notes)
	const motifLength = T.rand(3, 5);
	const motif: { interval: number; duration: number }[] = [];
	for (let i = 0; i < motifLength; i++) {
		motif.push({
			interval: T.rand(-3, 5),
			duration: T.pick([0.5, 1, 1, 1.5]),
		});
	}

	// Variation types
	type VariationType =
		| "original"
		| "transposed"
		| "inverted"
		| "augmented"
		| "fragmented";
	const variations: VariationType[] = [
		"original",
		"transposed",
		"inverted",
		"augmented",
		"fragmented",
	];

	let barIndex = 0;
	for (let barStart = 0; barStart < totalSteps; barStart += STEPS_PER_BAR) {
		const progBar = barIndex % progression.length;
		const chordRoot = progression[progBar] ?? 0;

		// Pick a variation for this bar
		const variation = variations[barIndex % variations.length] ?? "original";
		let step = barStart;
		let baseDegree = chordRoot + T.pick([0, 2, 4]);

		switch (variation) {
			case "original":
				// Play motif as-is
				for (const m of motif) {
					if (step >= totalSteps) break;
					notes.push({
						step,
						note: getScaleNote(scale, baseDegree + m.interval, 1) + rootNote,
						duration: m.duration,
						velocity: (0.5 + energy * 0.5) * 0.9,
					});
					step += m.duration + (Math.random() > 0.7 ? 0.5 : 0);
				}
				break;

			case "transposed":
				// Play motif transposed up or down
				baseDegree += T.pick([-3, -2, 2, 3, 4]);
				for (const m of motif) {
					if (step >= totalSteps) break;
					notes.push({
						step,
						note: getScaleNote(scale, baseDegree + m.interval, 1) + rootNote,
						duration: m.duration,
						velocity: (0.5 + energy * 0.5) * 0.85,
					});
					step += m.duration + (Math.random() > 0.7 ? 0.5 : 0);
				}
				break;

			case "inverted":
				// Invert the intervals (up becomes down)
				for (const m of motif) {
					if (step >= totalSteps) break;
					notes.push({
						step,
						note: getScaleNote(scale, baseDegree - m.interval, 1) + rootNote,
						duration: m.duration,
						velocity: (0.5 + energy * 0.5) * 0.85,
					});
					step += m.duration + (Math.random() > 0.7 ? 0.5 : 0);
				}
				break;

			case "augmented":
				// Double the durations (slower)
				for (const m of motif) {
					if (step >= totalSteps) break;
					notes.push({
						step,
						note: getScaleNote(scale, baseDegree + m.interval, 1) + rootNote,
						duration: m.duration * 2,
						velocity: (0.5 + energy * 0.5) * 0.9,
					});
					step += m.duration * 2;
				}
				break;

			case "fragmented": {
				// Only play part of the motif, repeated
				const fragment = motif.slice(0, 2);
				for (let rep = 0; rep < 3; rep++) {
					for (const m of fragment) {
						if (step >= totalSteps) break;
						notes.push({
							step,
							note:
								getScaleNote(scale, baseDegree + m.interval + rep, 1) +
								rootNote,
							duration: m.duration * 0.75,
							velocity: (0.4 + energy * 0.4) * (0.8 + rep * 0.05),
						});
						step += m.duration * 0.75;
					}
				}
				break;
			}
		}

		barIndex++;
	}

	return notes;
}

// Generate counterpoint pattern (two independent melodic lines)
function generateCounterpoint(
	scale: number[],
	rootNote: number,
	totalSteps: number,
	progression: number[],
	energy: number,
): MelodyNote[] {
	const notes: MelodyNote[] = [];

	// Generate two voice lines that move independently
	let upperDegree = T.rand(4, 7);
	let lowerDegree = T.rand(0, 3);

	for (let bar = 0; bar < Math.floor(totalSteps / STEPS_PER_BAR); bar++) {
		const barStart = bar * STEPS_PER_BAR;
		const progBar = bar % progression.length;
		const chordRoot = progression[progBar] ?? 0;

		// Upper voice - tends to move when lower is still
		for (let beat = 0; beat < 4; beat++) {
			const stepOffset = beat * 4;

			if (beat % 2 === 0) {
				// Upper voice moves on beats 1 and 3
				upperDegree = Math.max(
					4,
					Math.min(10, upperDegree + T.pick([-2, -1, 1, 2])),
				);
				notes.push({
					step: barStart + stepOffset,
					note: getScaleNote(scale, upperDegree, 1) + rootNote,
					duration: T.pick([2, 3]),
					velocity: (0.5 + energy * 0.4) * 0.9,
				});
			}

			if (beat % 2 === 1) {
				// Lower voice moves on beats 2 and 4
				lowerDegree = Math.max(
					0,
					Math.min(4, lowerDegree + T.pick([-2, -1, 1, 2])),
				);
				notes.push({
					step: barStart + stepOffset,
					note: getScaleNote(scale, chordRoot + lowerDegree, 0) + rootNote,
					duration: T.pick([2, 3]),
					velocity: (0.4 + energy * 0.4) * 0.85,
				});
			}
		}

		// Occasional consonant meeting point
		if (Math.random() > 0.7) {
			const meetStep = barStart + 8;
			notes.push({
				step: meetStep,
				note: getScaleNote(scale, chordRoot + 4, 1) + rootNote,
				duration: 2,
				velocity: (0.5 + energy * 0.4) * 0.9,
			});
			notes.push({
				step: meetStep,
				note: getScaleNote(scale, chordRoot, 0) + rootNote,
				duration: 2,
				velocity: (0.4 + energy * 0.4) * 0.85,
			});
		}
	}

	return notes;
}

// Generate staccato pattern (short punchy bursts with rests)
function generateStaccato(
	scale: number[],
	rootNote: number,
	totalSteps: number,
	progression: number[],
	energy: number,
): MelodyNote[] {
	const notes: MelodyNote[] = [];
	let lastDegree = T.rand(2, 6);

	for (let bar = 0; bar < Math.floor(totalSteps / STEPS_PER_BAR); bar++) {
		const barStart = bar * STEPS_PER_BAR;
		const progBar = bar % progression.length;
		const chordRoot = progression[progBar] ?? 0;

		// Create bursts of 2-4 short notes with gaps
		const burstCount = T.rand(2, 4);
		const burstStart = T.rand(0, 4);

		for (let b = 0; b < burstCount; b++) {
			const step = barStart + burstStart + b * 2;
			if (step >= totalSteps) break;

			// Move by step or jump to chord tone
			if (Math.random() > 0.7) {
				lastDegree = chordRoot + T.pick([0, 2, 4]);
			} else {
				lastDegree = Math.max(
					0,
					Math.min(8, lastDegree + T.pick([-2, -1, 1, 2])),
				);
			}

			notes.push({
				step,
				note: getScaleNote(scale, lastDegree, 1) + rootNote,
				duration: 0.25, // Very short, staccato
				velocity: (0.6 + energy * 0.4) * (0.9 + Math.random() * 0.1),
			});
		}

		// Sometimes add a second burst later in the bar
		if (Math.random() > 0.5) {
			const burst2Start = burstStart + 8;
			const burst2Count = T.rand(1, 3);
			for (let b = 0; b < burst2Count; b++) {
				const step = barStart + burst2Start + b * 2;
				if (step >= totalSteps || step >= barStart + STEPS_PER_BAR) break;

				lastDegree = Math.max(0, Math.min(8, lastDegree + T.pick([-1, 1, 2])));
				notes.push({
					step,
					note: getScaleNote(scale, lastDegree, 1) + rootNote,
					duration: 0.25,
					velocity: (0.5 + energy * 0.4) * 0.85,
				});
			}
		}
	}

	return notes;
}

// Generate chromatic approach pattern (approach chord tones chromatically)
function generateChromaticApproach(
	scale: number[],
	rootNote: number,
	totalSteps: number,
	progression: number[],
	energy: number,
): MelodyNote[] {
	const notes: MelodyNote[] = [];

	for (let bar = 0; bar < Math.floor(totalSteps / STEPS_PER_BAR); bar++) {
		const barStart = bar * STEPS_PER_BAR;
		const progBar = bar % progression.length;
		const chordRoot = progression[progBar] ?? 0;

		// Pick target chord tones
		const targets = [chordRoot, chordRoot + 2, chordRoot + 4].map((d) =>
			getScaleNote(scale, d, 1),
		);

		for (let beat = 0; beat < 4; beat++) {
			const target = targets[beat % 3] ?? targets[0] ?? 0;
			const stepOffset = beat * 4;

			// Approach from half step above or below
			const approach = Math.random() > 0.5 ? 1 : -1;

			// Chromatic approach note
			notes.push({
				step: barStart + stepOffset,
				note: target + approach + rootNote,
				duration: 0.5,
				velocity: (0.4 + energy * 0.3) * 0.8,
			});

			// Target note (longer, accented)
			notes.push({
				step: barStart + stepOffset + 1,
				note: target + rootNote,
				duration: T.pick([1.5, 2, 2.5]),
				velocity: (0.5 + energy * 0.5) * 0.95,
			});
		}
	}

	return notes;
}

// Generate echo pattern (melody repeats offset creating self-harmony)
function generateEcho(
	scale: number[],
	rootNote: number,
	totalSteps: number,
	progression: number[],
	energy: number,
): MelodyNote[] {
	const notes: MelodyNote[] = [];
	const echoDelay = T.pick([2, 3, 4]); // Steps of delay
	const echoInterval = T.pick([0, 3, 4, 7]); // Harmony interval (unison, 3rd, 4th, 5th)

	for (let bar = 0; bar < Math.floor(totalSteps / STEPS_PER_BAR); bar++) {
		const barStart = bar * STEPS_PER_BAR;
		const progBar = bar % progression.length;
		const chordRoot = progression[progBar] ?? 0;

		// Generate primary melody for this bar
		const barMelody: { step: number; degree: number; duration: number }[] = [];
		let degree = chordRoot + T.pick([0, 2, 4]);

		for (let i = 0; i < 4; i++) {
			degree = Math.max(0, Math.min(8, degree + T.pick([-2, -1, 0, 1, 2])));
			barMelody.push({
				step: i * 3,
				degree,
				duration: T.pick([1, 1.5, 2]),
			});
		}

		// Add primary melody
		for (const m of barMelody) {
			notes.push({
				step: barStart + m.step,
				note: getScaleNote(scale, m.degree, 1) + rootNote,
				duration: m.duration,
				velocity: (0.5 + energy * 0.5) * 0.9,
			});
		}

		// Add echo (delayed and harmonized)
		for (const m of barMelody) {
			const echoStep = barStart + m.step + echoDelay;
			if (echoStep < totalSteps && echoStep < barStart + STEPS_PER_BAR + 4) {
				notes.push({
					step: echoStep,
					note: getScaleNote(scale, m.degree + echoInterval, 1) + rootNote,
					duration: m.duration * 0.8, // Slightly shorter
					velocity: (0.4 + energy * 0.3) * 0.7, // Quieter echo
				});
			}
		}
	}

	return notes;
}

// Generate intervallic pattern (built on specific intervals like 4ths and 5ths)
function generateIntervallic(
	scale: number[],
	rootNote: number,
	totalSteps: number,
	progression: number[],
	energy: number,
): MelodyNote[] {
	const notes: MelodyNote[] = [];

	// Choose the primary interval for this section
	const intervals = [3, 4, 5, 7]; // 4th, 5th, 6th, octave in scale degrees
	const primaryInterval = T.pick(intervals);
	let baseDegree = T.rand(0, 4);

	for (let bar = 0; bar < Math.floor(totalSteps / STEPS_PER_BAR); bar++) {
		const barStart = bar * STEPS_PER_BAR;
		const progBar = bar % progression.length;
		const chordRoot = progression[progBar] ?? 0;

		// Build melody using the interval
		for (let beat = 0; beat < 4; beat++) {
			const stepOffset = beat * 4;

			// Alternate between base note and interval
			if (beat % 2 === 0) {
				baseDegree = chordRoot + T.pick([0, 2, 4]);
			}

			// Low note
			notes.push({
				step: barStart + stepOffset,
				note: getScaleNote(scale, baseDegree, 1) + rootNote,
				duration: 1,
				velocity: (0.5 + energy * 0.4) * 0.9,
			});

			// Jump up by interval
			notes.push({
				step: barStart + stepOffset + 2,
				note: getScaleNote(scale, baseDegree + primaryInterval, 1) + rootNote,
				duration: 1,
				velocity: (0.5 + energy * 0.4) * 0.85,
			});

			// Sometimes add the middle note for a triad feel
			if (Math.random() > 0.6) {
				notes.push({
					step: barStart + stepOffset + 1,
					note:
						getScaleNote(
							scale,
							baseDegree + Math.floor(primaryInterval / 2),
							1,
						) + rootNote,
					duration: 0.5,
					velocity: (0.4 + energy * 0.3) * 0.75,
				});
			}
		}
	}

	return notes;
}

// Add grace notes to existing melody
function addGraceNotes(notes: MelodyNote[], scale: number[]): MelodyNote[] {
	const result: MelodyNote[] = [];

	for (const note of notes) {
		// 15% chance to add a grace note before this note
		if (Math.random() < 0.15 && note.duration >= 1) {
			const graceDegree = T.pick([-1, 1, 2]); // Step above or below
			const graceNote =
				note.note +
				(scale[Math.abs(graceDegree) % scale.length] ?? 0) *
					Math.sign(graceDegree);

			result.push({
				step: note.step - 0.125,
				note: graceNote,
				duration: 0.125,
				velocity: note.velocity * 0.6,
				isGraceNote: true,
			});
		}
		result.push(note);
	}

	return result;
}

// Rhythm variation type weights by section
const rhythmVariationWeights: Record<
	string,
	Partial<Record<RhythmVariationType, number>>
> = {
	intro: { normal: 4, breakdown: 1 },
	verse: { normal: 5, polyrhythm: 1 },
	chorus: { normal: 5, polyrhythm: 1 },
	bridge: { normal: 3, breakdown: 2, polyrhythm: 1 },
	breakdown: { breakdown: 5, dropout: 2 },
	drop: { normal: 4, polyrhythm: 2 },
	outro: { normal: 3, breakdown: 2, dropout: 1 },
};

function pickRhythmVariation(sectionType: string): RhythmVariationType {
	const weights = rhythmVariationWeights[sectionType] ?? { normal: 1 };
	const entries = Object.entries(weights) as [RhythmVariationType, number][];
	const total = entries.reduce((sum, [, w]) => sum + w, 0);
	let r = Math.random() * total;
	for (const [variation, weight] of entries) {
		r -= weight;
		if (r <= 0) return variation;
	}
	return "normal";
}

// Generate fill patterns
type FillType =
	| "snareRoll"
	| "tomFill"
	| "crash"
	| "flam"
	| "ghostNotes"
	| "buildup";

function generateFill(
	barStart: number,
	fillType: FillType,
	energy: number,
): { step: number; type: string; velocity?: number; pitch?: number }[] {
	const hits: {
		step: number;
		type: string;
		velocity?: number;
		pitch?: number;
	}[] = [];

	switch (fillType) {
		case "snareRoll":
			// 16th note snare roll
			for (let i = 12; i < 16; i++) {
				hits.push({
					step: barStart + i,
					type: "snare",
					velocity: (0.5 + (i - 12) * 0.15) * energy,
				});
			}
			break;

		case "tomFill":
			// Descending tom pattern
			hits.push({
				step: barStart + 12,
				type: "tom",
				pitch: 200,
				velocity: energy,
			});
			hits.push({
				step: barStart + 13,
				type: "tom",
				pitch: 150,
				velocity: energy,
			});
			hits.push({
				step: barStart + 14,
				type: "tom",
				pitch: 100,
				velocity: energy,
			});
			hits.push({ step: barStart + 15, type: "kick", velocity: energy });
			break;

		case "crash":
			hits.push({ step: barStart + 15, type: "crash", velocity: energy });
			break;

		case "flam":
			// Flams: quick double hits
			hits.push({ step: barStart + 12, type: "snare", velocity: energy * 0.4 });
			hits.push({
				step: barStart + 12.1,
				type: "snare",
				velocity: energy * 0.9,
			});
			hits.push({ step: barStart + 14, type: "snare", velocity: energy * 0.4 });
			hits.push({
				step: barStart + 14.1,
				type: "snare",
				velocity: energy * 0.9,
			});
			break;

		case "ghostNotes":
			// Quiet ghost notes leading into next bar
			for (let i = 12; i < 16; i++) {
				hits.push({
					step: barStart + i,
					type: "snare",
					velocity: 0.2 + (i - 12) * 0.1,
				});
			}
			break;

		case "buildup":
			// Accelerating snare buildup
			hits.push({ step: barStart + 8, type: "snare", velocity: energy * 0.5 });
			hits.push({ step: barStart + 10, type: "snare", velocity: energy * 0.6 });
			hits.push({ step: barStart + 12, type: "snare", velocity: energy * 0.7 });
			hits.push({ step: barStart + 13, type: "snare", velocity: energy * 0.8 });
			hits.push({ step: barStart + 14, type: "snare", velocity: energy * 0.9 });
			hits.push({ step: barStart + 15, type: "snare", velocity: energy });
			break;
	}

	return hits;
}

// Pick fill type based on energy and genre
function pickFillType(energy: number, genre: Genre): FillType {
	const fillTypes: FillType[] = [
		"snareRoll",
		"tomFill",
		"crash",
		"flam",
		"ghostNotes",
		"buildup",
	];

	// Weight by energy and genre
	if (energy < 0.4) {
		return T.pick(["ghostNotes", "crash"]);
	}
	if (genre.name === "techno" || genre.name === "trance") {
		return T.pick(["buildup", "snareRoll", "flam"]);
	}
	if (genre.name === "lofi") {
		return T.pick(["ghostNotes", "crash"]);
	}
	return T.pick(fillTypes);
}

// Generate free melody (original random movement style)
function generateFreeMelody(
	scale: number[],
	rootNote: number,
	totalSteps: number,
	progression: number[],
	energy: number,
): MelodyNote[] {
	const notes: MelodyNote[] = [];
	const density = 0.3 + energy * 0.5;
	let lastNote = T.rand(2, 5);
	let restCounter = 0;

	for (let i = 0; i < totalSteps; i++) {
		if (restCounter > 0) {
			restCounter--;
			continue;
		}

		const bar = Math.floor(i / STEPS_PER_BAR);
		const beatInBar = i % STEPS_PER_BAR;
		const progBar = bar % progression.length;

		const beatStrength =
			beatInBar % 4 === 0 ? 1.3 : beatInBar % 2 === 0 ? 1.1 : 1;
		if (Math.random() < density * beatStrength) {
			const movements = [-3, -2, -1, -1, 0, 0, 1, 1, 2, 3];
			const chordRoot = progression[progBar] ?? 0;
			if (Math.random() > 0.85) {
				lastNote = chordRoot + T.pick([0, 2, 4]);
			} else {
				lastNote = Math.max(0, Math.min(9, lastNote + T.pick(movements)));
			}
			const note = getScaleNote(scale, lastNote, 1) + rootNote;

			let duration: number;
			if (beatInBar % 4 === 0 && Math.random() > 0.5) {
				duration = T.pick([2, 3, 4]);
			} else {
				duration = T.pick([0.5, 1, 1, 1.5, 2]);
			}

			notes.push({
				step: i,
				note,
				duration,
				velocity: (0.5 + energy * 0.5) * (0.7 + Math.random() * 0.3),
			});

			if (duration >= 2 && Math.random() > 0.6) {
				restCounter = Math.floor(duration);
			}
		}
	}

	return notes;
}

/** Generate melody, bass, drums, arpeggio, and pad patterns for a song section. */
export function generatePattern(params: PatternParams): Pattern {
	const {
		section,
		genre,
		scale,
		rootNote,
		progression,
		tempo,
		delayAmount,
		filterCutoff,
	} = params;
	const bars = section.bars;
	const totalSteps = bars * STEPS_PER_BAR;

	// Pick rhythm variation for this section
	const rhythmVariation = pickRhythmVariation(section.type);

	const pattern: Pattern = {
		tempo,
		melody: [],
		bass: [],
		drums: [],
		arpeggio: [],
		pad: [],
		fx: [],
		delayAmount,
		filterCutoff,
		rhythmVariation,
	};

	// Generate melody using pattern-based generation
	if (section.hasMelody) {
		const melodyPattern = pickMelodyPattern(genre);
		pattern.melodyPattern = melodyPattern;
		let melodyNotes: MelodyNote[];

		switch (melodyPattern) {
			case "callResponse":
				melodyNotes = generateCallResponse(
					scale,
					rootNote,
					totalSteps,
					progression,
					section.energy,
				);
				break;
			case "sequence":
				melodyNotes = generateSequence(
					scale,
					rootNote,
					totalSteps,
					progression,
					section.energy,
				);
				break;
			case "octaveJumps":
				melodyNotes = generateOctaveJumps(
					scale,
					rootNote,
					totalSteps,
					progression,
					section.energy,
				);
				break;
			case "trill":
				melodyNotes = generateTrill(
					scale,
					rootNote,
					totalSteps,
					progression,
					section.energy,
				);
				break;
			case "riff":
				melodyNotes = generateRiff(
					scale,
					rootNote,
					totalSteps,
					progression,
					section.energy,
				);
				break;
			case "pedal":
				melodyNotes = generatePedal(
					scale,
					rootNote,
					totalSteps,
					progression,
					section.energy,
				);
				break;
			case "ostinato":
				melodyNotes = generateOstinato(
					scale,
					rootNote,
					totalSteps,
					progression,
					section.energy,
				);
				break;
			case "scaleRun":
				melodyNotes = generateScaleRun(
					scale,
					rootNote,
					totalSteps,
					progression,
					section.energy,
				);
				break;
			case "syncopated":
				melodyNotes = generateSyncopated(
					scale,
					rootNote,
					totalSteps,
					progression,
					section.energy,
				);
				break;
			case "motifDevelopment":
				melodyNotes = generateMotifDevelopment(
					scale,
					rootNote,
					totalSteps,
					progression,
					section.energy,
				);
				break;
			case "counterpoint":
				melodyNotes = generateCounterpoint(
					scale,
					rootNote,
					totalSteps,
					progression,
					section.energy,
				);
				break;
			case "staccato":
				melodyNotes = generateStaccato(
					scale,
					rootNote,
					totalSteps,
					progression,
					section.energy,
				);
				break;
			case "chromaticApproach":
				melodyNotes = generateChromaticApproach(
					scale,
					rootNote,
					totalSteps,
					progression,
					section.energy,
				);
				break;
			case "echo":
				melodyNotes = generateEcho(
					scale,
					rootNote,
					totalSteps,
					progression,
					section.energy,
				);
				break;
			case "intervallic":
				melodyNotes = generateIntervallic(
					scale,
					rootNote,
					totalSteps,
					progression,
					section.energy,
				);
				break;
			default:
				// Original random movement style
				melodyNotes = generateFreeMelody(
					scale,
					rootNote,
					totalSteps,
					progression,
					section.energy,
				);
				break;
		}

		// Optionally add grace notes (more common in certain genres)
		const graceNoteChance =
			genre.name === "lofi" ? 0.4 : genre.name === "midi" ? 0.3 : 0.2;
		if (Math.random() < graceNoteChance) {
			melodyNotes = addGraceNotes(melodyNotes, scale);
		}

		pattern.melody = melodyNotes;
	}

	// Generate bass with genre-appropriate pattern
	if (section.hasBass) {
		const bassPatternType = pickBassPattern(genre, section.energy);
		pattern.bassPattern = bassPatternType;

		for (let bar = 0; bar < bars; bar++) {
			const progBar = bar % progression.length;
			const chordRoot = progression[progBar] ?? 0;
			const bassNote = getScaleNote(scale, chordRoot, -1) + rootNote;
			const fifthNote = getScaleNote(scale, chordRoot + 4, -1) + rootNote;
			const thirdNote = getScaleNote(scale, chordRoot + 2, -1) + rootNote;
			const nextRoot =
				getScaleNote(
					scale,
					progression[(progBar + 1) % progression.length] ?? 0,
					-1,
				) + rootNote;

			switch (bassPatternType) {
				case "simple":
					// Basic root notes on 1 and 3
					pattern.bass.push({
						step: bar * STEPS_PER_BAR,
						note: bassNote,
						duration: 4,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 8,
						note: bassNote,
						duration: 4,
					});
					break;

				case "walking":
					// Jazz walking bass: chromatic approach to next chord
					pattern.bass.push({
						step: bar * STEPS_PER_BAR,
						note: bassNote,
						duration: 2,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 4,
						note: thirdNote,
						duration: 2,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 8,
						note: fifthNote,
						duration: 2,
					});
					// Chromatic approach to next chord
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 12,
						note: nextRoot + (Math.random() > 0.5 ? 1 : -1),
						duration: 2,
					});
					break;

				case "octave":
					// Octave jumps
					pattern.bass.push({
						step: bar * STEPS_PER_BAR,
						note: bassNote,
						duration: 2,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 4,
						note: bassNote + 12,
						duration: 2,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 8,
						note: bassNote,
						duration: 2,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 12,
						note: bassNote + 12,
						duration: 2,
					});
					break;

				case "fifth":
					// Root-fifth pattern
					pattern.bass.push({
						step: bar * STEPS_PER_BAR,
						note: bassNote,
						duration: 4,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 8,
						note: fifthNote,
						duration: 4,
					});
					break;

				case "syncopated":
					// Offbeat syncopation
					pattern.bass.push({
						step: bar * STEPS_PER_BAR,
						note: bassNote,
						duration: 1.5,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 3,
						note: bassNote,
						duration: 1,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 6,
						note: fifthNote,
						duration: 1.5,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 10,
						note: bassNote,
						duration: 1,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 13,
						note: bassNote,
						duration: 1.5,
					});
					break;

				case "driving":
					// Relentless 8th notes (techno/rock)
					for (let i = 0; i < 8; i++) {
						pattern.bass.push({
							step: bar * STEPS_PER_BAR + i * 2,
							note: i % 4 === 2 ? fifthNote : bassNote,
							duration: 1,
						});
					}
					break;

				case "melodic":
					// Melodic bass line with movement
					pattern.bass.push({
						step: bar * STEPS_PER_BAR,
						note: bassNote,
						duration: 2,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 3,
						note: bassNote + 2,
						duration: 1,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 5,
						note: thirdNote,
						duration: 1.5,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 8,
						note: fifthNote,
						duration: 2,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 11,
						note: thirdNote,
						duration: 1,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 13,
						note: bassNote,
						duration: 1.5,
					});
					break;

				case "pump":
					// Sidechained pump feel (short notes on every beat)
					for (let i = 0; i < 4; i++) {
						pattern.bass.push({
							step: bar * STEPS_PER_BAR + i * 4,
							note: bassNote,
							duration: 0.75,
						});
					}
					break;

				case "disco":
					// Octave disco pattern
					for (let i = 0; i < 8; i++) {
						pattern.bass.push({
							step: bar * STEPS_PER_BAR + i * 2,
							note: i % 2 === 0 ? bassNote : bassNote + 12,
							duration: 1,
						});
					}
					break;

				case "reggae":
					// Offbeat reggae bass (hits on the "and")
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 2,
						note: bassNote,
						duration: 2,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 6,
						note: bassNote,
						duration: 2,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 10,
						note: fifthNote,
						duration: 2,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 14,
						note: bassNote,
						duration: 2,
					});
					break;

				case "slap":
					// Funky slap bass with ghost notes and pops
					pattern.bass.push({
						step: bar * STEPS_PER_BAR,
						note: bassNote,
						duration: 0.5,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 2,
						note: bassNote + 12, // Pop (octave)
						duration: 0.5,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 4,
						note: bassNote,
						duration: 0.5,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 6,
						note: fifthNote,
						duration: 1,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 8,
						note: bassNote,
						duration: 0.5,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 10,
						note: bassNote + 12,
						duration: 0.5,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 12,
						note: thirdNote,
						duration: 1,
					});
					pattern.bass.push({
						step: bar * STEPS_PER_BAR + 14,
						note: bassNote,
						duration: 1,
					});
					break;
			}
		}
	}

	// Generate arpeggio with genre-appropriate pattern
	if (section.hasArpeggio) {
		const arpPattern = pickArpPattern(genre, section.energy);
		pattern.arpPattern = arpPattern;

		for (let bar = 0; bar < bars; bar++) {
			const progBar = bar % progression.length;
			const chordRoot = progression[progBar] ?? 0;
			// Extended chord tones: root, 3rd, 5th, 7th, octave, 9th
			const chordNotes = [0, 2, 4, 6, 7, 9].map(
				(d) => getScaleNote(scale, chordRoot + d, 1) + rootNote,
			);
			const bassNote = getScaleNote(scale, chordRoot, 0) + rootNote;

			// Different patterns use different note counts and rhythms
			switch (arpPattern) {
				case "up":
					// Classic ascending: 1-3-5-7 repeating
					for (let i = 0; i < 8; i++) {
						pattern.arpeggio.push({
							step: bar * STEPS_PER_BAR + i * 2,
							note: chordNotes[i % 4] ?? 0,
							duration: 0.75,
						});
					}
					break;

				case "down":
					// Classic descending: 7-5-3-1 repeating
					for (let i = 0; i < 8; i++) {
						pattern.arpeggio.push({
							step: bar * STEPS_PER_BAR + i * 2,
							note: chordNotes[3 - (i % 4)] ?? 0,
							duration: 0.75,
						});
					}
					break;

				case "updown":
					// Up then down: 1-3-5-7-5-3-1-3
					for (let i = 0; i < 8; i++) {
						const idx = i < 4 ? i : 6 - i;
						pattern.arpeggio.push({
							step: bar * STEPS_PER_BAR + i * 2,
							note: chordNotes[Math.abs(idx)] ?? 0,
							duration: 0.75,
						});
					}
					break;

				case "random":
					// Random chord tones
					for (let i = 0; i < 8; i++) {
						pattern.arpeggio.push({
							step: bar * STEPS_PER_BAR + i * 2,
							note: chordNotes[T.rand(0, 3)] ?? 0,
							duration: 0.75,
						});
					}
					break;

				case "pingpong":
					// Alternates low-high: 1-7-3-5-1-7-3-5
					for (let i = 0; i < 8; i++) {
						const pingpongOrder = [0, 3, 1, 2, 0, 3, 1, 2];
						pattern.arpeggio.push({
							step: bar * STEPS_PER_BAR + i * 2,
							note: chordNotes[pingpongOrder[i] ?? 0] ?? 0,
							duration: 0.75,
						});
					}
					break;

				case "thumb":
					// Alberti bass style: bass note repeats, upper notes dance (1-3-5-3)
					for (let i = 0; i < 16; i++) {
						const thumbOrder = [0, 2, 3, 2]; // Bass, mid, high, mid
						const noteIdx = thumbOrder[i % 4] ?? 0;
						pattern.arpeggio.push({
							step: bar * STEPS_PER_BAR + i,
							note: noteIdx === 0 ? bassNote : (chordNotes[noteIdx] ?? 0),
							duration: 0.5,
						});
					}
					break;

				case "skipUp":
					// Skip pattern ascending: 1-5-3-7-5-9 (skips create wider intervals)
					for (let i = 0; i < 8; i++) {
						const skipOrder = [0, 2, 1, 3, 2, 4, 3, 5];
						pattern.arpeggio.push({
							step: bar * STEPS_PER_BAR + i * 2,
							note: chordNotes[skipOrder[i] ?? 0] ?? chordNotes[0] ?? 0,
							duration: 0.75,
						});
					}
					break;

				case "skipDown":
					// Skip pattern descending
					for (let i = 0; i < 8; i++) {
						const skipOrder = [4, 2, 3, 1, 2, 0, 1, 0];
						pattern.arpeggio.push({
							step: bar * STEPS_PER_BAR + i * 2,
							note: chordNotes[skipOrder[i] ?? 0] ?? chordNotes[0] ?? 0,
							duration: 0.75,
						});
					}
					break;

				case "cascade":
					// Cascading triplet feel: groups of 3 ascending then reset
					for (let i = 0; i < 12; i++) {
						const cascadeIdx = i % 3;
						const groupOffset = Math.floor(i / 3);
						pattern.arpeggio.push({
							step: bar * STEPS_PER_BAR + i * 1.33,
							note: chordNotes[(cascadeIdx + groupOffset) % 4] ?? 0,
							duration: 0.5,
						});
					}
					break;

				case "spread":
					// Wide voicing: bass, then spread upper notes with gaps
					pattern.arpeggio.push({
						step: bar * STEPS_PER_BAR,
						note: bassNote,
						duration: 2,
					});
					pattern.arpeggio.push({
						step: bar * STEPS_PER_BAR + 4,
						note: chordNotes[2] ?? 0, // 5th
						duration: 1.5,
					});
					pattern.arpeggio.push({
						step: bar * STEPS_PER_BAR + 7,
						note: chordNotes[4] ?? 0, // Octave
						duration: 1,
					});
					pattern.arpeggio.push({
						step: bar * STEPS_PER_BAR + 10,
						note: chordNotes[3] ?? 0, // 7th
						duration: 1.5,
					});
					pattern.arpeggio.push({
						step: bar * STEPS_PER_BAR + 13,
						note: chordNotes[1] ?? 0, // 3rd
						duration: 1,
					});
					break;

				case "twoOctave":
					// Two octave sweep: up one octave, up another, then back down
					for (let i = 0; i < 8; i++) {
						const octaveOffset = i < 4 ? 0 : 12;
						pattern.arpeggio.push({
							step: bar * STEPS_PER_BAR + i * 2,
							note: (chordNotes[i % 4] ?? 0) + octaveOffset,
							duration: 0.75,
						});
					}
					break;

				case "brokenChord": {
					// Broken chord with varying rhythm: long-short-short pattern
					const brokenRhythm = [3, 1, 2, 2, 3, 1, 2, 2]; // Step durations
					let step = 0;
					for (let i = 0; i < 6 && step < STEPS_PER_BAR; i++) {
						const noteIdx = [0, 2, 1, 3, 2, 0][i] ?? 0;
						pattern.arpeggio.push({
							step: bar * STEPS_PER_BAR + step,
							note: chordNotes[noteIdx] ?? 0,
							duration: (brokenRhythm[i] ?? 2) * 0.4,
						});
						step += brokenRhythm[i] ?? 2;
					}
					break;
				}
			}
		}
	}

	// Generate pad chords
	if (section.hasPad) {
		for (let bar = 0; bar < bars; bar++) {
			const progBar = bar % progression.length;
			const chordRoot = progression[progBar] ?? 0;
			const chordNotes = [0, 2, 4].map(
				(d) => getScaleNote(scale, chordRoot + d, 0) + rootNote,
			);
			pattern.pad.push({
				step: bar * STEPS_PER_BAR,
				notes: chordNotes,
				duration: STEPS_PER_BAR,
			});
		}
	}

	// Generate drums with rhythm variations
	if (section.hasDrums) {
		const patternName = T.pick(genre.drumPatterns);
		pattern.drumPattern = patternName;
		const dp = drumPatterns[patternName];
		if (!dp) return pattern; // Safety check

		for (let bar = 0; bar < bars; bar++) {
			const barStart = bar * STEPS_PER_BAR;
			const isLastBar = bar === bars - 1;

			// Apply rhythm variations
			if (rhythmVariation === "dropout") {
				// Random dropout: skip some bars entirely
				if (Math.random() < 0.4 && !isLastBar) {
					continue; // Skip this bar for dramatic silence
				}
			}

			if (rhythmVariation === "breakdown") {
				// Breakdown: only kick drum, sparse
				for (const k of dp.kick.slice(0, 2)) {
					// Use fewer kicks
					pattern.drums.push({
						step: barStart + k,
						type: "kick",
						velocity: section.energy * 0.7,
					});
				}
				// Skip other drums, continue to next bar
				if (isLastBar) {
					// Build back up on last bar
					const fill = generateFill(barStart, "buildup", section.energy);
					pattern.drums.push(...fill);
				}
				continue;
			}

			// Normal and polyrhythm variations
			const usePolyrhythm = rhythmVariation === "polyrhythm";

			// Kick drum
			if (usePolyrhythm && Math.random() > 0.5) {
				// 3-against-4 kick pattern
				const polyKicks = [0, 5, 10]; // Triplet feel
				for (const k of polyKicks) {
					if (!isLastBar || k < 12) {
						pattern.drums.push({
							step: barStart + k,
							type: "kick",
							velocity: section.energy,
						});
					}
				}
			} else {
				for (const k of dp.kick) {
					if (!isLastBar || k < 12) {
						pattern.drums.push({
							step: barStart + k,
							type: "kick",
							velocity: section.energy,
						});
					}
				}
			}

			// Snare
			for (const s of dp.snare) {
				if (!isLastBar || s < 12) {
					pattern.drums.push({
						step: barStart + s,
						type: "snare",
						velocity: section.energy,
					});
				}
			}

			// Hi-hats with polyrhythm option
			if (usePolyrhythm && Math.random() > 0.6) {
				// 5-against-4 hi-hat pattern
				const polySteps = [0, 3, 6, 10, 13];
				for (const step of polySteps) {
					if (!isLastBar || step < 12) {
						pattern.drums.push({
							step: barStart + step,
							type: "hihat",
							velocity: section.energy * 0.75,
						});
					}
				}
			} else if (dp.hihat === "8ths") {
				for (let i = 0; i < 16; i += 2) {
					if (!isLastBar || i < 12) {
						const isOpen = i === 6 || i === 14;
						pattern.drums.push({
							step: barStart + i,
							type: isOpen ? "hihatOpen" : "hihat",
							velocity: section.energy * 0.8,
						});
					}
				}
			} else if (dp.hihat === "16ths") {
				for (let i = 0; i < 16; i++) {
					if (!isLastBar || i < 12) {
						const velocity = (i % 2 === 0 ? 1 : 0.6) * section.energy;
						pattern.drums.push({
							step: barStart + i,
							type: "hihat",
							velocity,
						});
					}
				}
			} else if (dp.hihat === "offbeat") {
				for (let i = 1; i < 16; i += 2) {
					if (!isLastBar || i < 12) {
						pattern.drums.push({
							step: barStart + i,
							type: "hihat",
							velocity: section.energy * 0.8,
						});
					}
				}
			} else if (dp.hihat === "sparse") {
				for (let i = 0; i < 16; i += 4) {
					pattern.drums.push({
						step: barStart + i,
						type: "hihat",
						velocity: section.energy * 0.7,
					});
				}
			}

			// Add cowbell if pattern has it
			if (dp.cowbell) {
				for (const c of dp.cowbell) {
					if (!isLastBar || c < 12) {
						pattern.drums.push({
							step: barStart + c,
							type: "cowbell",
							velocity: section.energy * 0.6,
						});
					}
				}
			}

			// Add clap if pattern has it (layer with snare)
			if (dp.clap) {
				for (const c of dp.clap) {
					if (!isLastBar || c < 12) {
						pattern.drums.push({
							step: barStart + c,
							type: "clap",
							velocity: section.energy * 0.7,
						});
					}
				}
			}

			// Add ride cymbal if pattern has it
			if (dp.ride) {
				for (const r of dp.ride) {
					if (!isLastBar || r < 12) {
						pattern.drums.push({
							step: barStart + r,
							type: "ride",
							velocity: section.energy * 0.5,
						});
					}
				}
			}

			// Add rimshot if pattern has it
			if (dp.rimshot) {
				for (const r of dp.rimshot) {
					if (!isLastBar || r < 12) {
						pattern.drums.push({
							step: barStart + r,
							type: "rimshot",
							velocity: section.energy * 0.6,
						});
					}
				}
			}

			// Add shaker if pattern has it
			if (dp.shaker === "16ths") {
				for (let s = 0; s < 16; s++) {
					if (!isLastBar || s < 12) {
						pattern.drums.push({
							step: barStart + s,
							type: "shaker",
							velocity: section.energy * 0.4,
						});
					}
				}
			} else if (dp.shaker === "8ths") {
				for (let s = 0; s < 8; s++) {
					if (!isLastBar || s * 2 < 12) {
						pattern.drums.push({
							step: barStart + s * 2,
							type: "shaker",
							velocity: section.energy * 0.5,
						});
					}
				}
			}

			// Add conga if pattern has it
			if (dp.conga) {
				for (const c of dp.conga) {
					if (!isLastBar || c < 12) {
						// Alternate between conga and bongo for variety
						const type = c % 4 < 2 ? "conga" : "bongo";
						pattern.drums.push({
							step: barStart + c,
							type,
							velocity: section.energy * 0.55,
						});
					}
				}
			}

			// Add 808 sub if pattern has it
			if (dp.sub808) {
				for (const s of dp.sub808) {
					if (!isLastBar || s < 12) {
						pattern.drums.push({
							step: barStart + s,
							type: "sub808",
							velocity: section.energy * 0.8,
						});
					}
				}
			}

			// Fill on last bar - use improved fill system
			if (isLastBar && section.energy > 0.5) {
				const fillType = pickFillType(section.energy, genre);
				const fill = generateFill(barStart, fillType, section.energy);
				pattern.drums.push(...fill);
			}
		}
	}

	// Generate FX (risers, impacts, sweeps) for transitions
	if (section.hasFX) {
		const fxNotes = generateFX(section, genre, bars);
		pattern.fx.push(...fxNotes);
	}

	return pattern;
}

/**
 * Generate FX events for a section.
 * - Breakdowns: risers/reverse cymbals building to the next section
 * - Drops: impacts on the downbeat
 * - Intros: reverse cymbal building into the song
 * - Choruses: impact for punch (high energy only)
 */
function generateFX(section: Section, genre: Genre, bars: number): FXNote[] {
	const fx: FXNote[] = [];
	const totalSteps = bars * STEPS_PER_BAR;

	// FX preferences by genre
	const isEDM =
		genre.name === "techno" ||
		genre.name === "trance" ||
		genre.name === "happycore";
	const isChillGenre =
		genre.name === "ambient" ||
		genre.name === "lofi" ||
		genre.name === "vaporwave";

	if (section.type === "breakdown") {
		// Breakdowns: build tension for the upcoming drop

		if (bars >= 4) {
			// Long breakdown: riser spanning most of the section
			const riserType: FXType = isEDM
				? T.pick(["riser", "riser", "reverseCymbal"])
				: T.pick(["reverseCymbal", "sweep"]);

			// Start riser partway through, building to the end
			const riserStart = Math.floor(bars / 2) * STEPS_PER_BAR;
			const riserDuration = totalSteps - riserStart;

			fx.push({
				step: riserStart,
				type: riserType,
				duration: riserDuration,
				intensity: section.energy,
			});
		} else if (bars >= 2) {
			// Short breakdown: quick riser in the last bar
			const riserType: FXType = isEDM ? "riser" : "reverseCymbal";
			fx.push({
				step: (bars - 1) * STEPS_PER_BAR,
				type: riserType,
				duration: STEPS_PER_BAR,
				intensity: section.energy * 0.8,
			});
		}

		// Optional: add a sweep in the first half for extra movement
		if (bars >= 4 && Math.random() < 0.4 && !isChillGenre) {
			fx.push({
				step: 0,
				type: "sweep",
				duration: STEPS_PER_BAR * 2,
				intensity: section.energy * 0.5,
			});
		}
	} else if (section.type === "drop") {
		// Drops: impact on the downbeat, optional downlifter later

		fx.push({
			step: 0,
			type: "impact",
			duration: STEPS_PER_BAR / 2,
			intensity: section.energy,
		});

		// Optional downlifter after the initial impact settles
		if (bars >= 4 && Math.random() < 0.5 && isEDM) {
			fx.push({
				step: STEPS_PER_BAR * 2,
				type: "downlifter",
				duration: STEPS_PER_BAR * 2,
				intensity: section.energy * 0.6,
			});
		}

		// For very high energy, add a second impact mid-drop
		if (bars >= 8 && section.energy > 0.8 && Math.random() < 0.3) {
			fx.push({
				step: Math.floor(bars / 2) * STEPS_PER_BAR,
				type: "impact",
				duration: STEPS_PER_BAR / 2,
				intensity: section.energy * 0.7,
			});
		}
	} else if (section.type === "intro") {
		// Intros: reverse cymbal building into the song
		if (bars >= 4) {
			fx.push({
				step: (bars - 2) * STEPS_PER_BAR,
				type: "reverseCymbal",
				duration: STEPS_PER_BAR * 2,
				intensity: 0.6,
			});
		} else if (bars >= 2) {
			fx.push({
				step: (bars - 1) * STEPS_PER_BAR,
				type: "reverseCymbal",
				duration: STEPS_PER_BAR,
				intensity: 0.5,
			});
		}
	} else if (section.type === "chorus" && section.energy >= 0.8) {
		// High-energy choruses: impact on downbeat for punch
		fx.push({
			step: 0,
			type: "impact",
			duration: STEPS_PER_BAR / 2,
			intensity: section.energy * 0.7,
		});
	}

	return fx;
}
