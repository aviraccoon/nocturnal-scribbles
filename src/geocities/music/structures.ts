import type { Section, SongStructure } from "./types";

// Helper to create sections with defaults
function section(
	type: Section["type"],
	bars: number,
	opts: Partial<Omit<Section, "type" | "bars">> = {},
): Section {
	// Auto-enable FX for breakdowns (builds tension for drops) and drops (impacts)
	const autoFX = type === "breakdown" || type === "drop";
	return {
		type,
		bars,
		hasMelody: opts.hasMelody ?? true,
		hasBass: opts.hasBass ?? true,
		hasDrums: opts.hasDrums ?? true,
		hasArpeggio: opts.hasArpeggio ?? false,
		hasPad: opts.hasPad ?? false,
		hasFX: opts.hasFX ?? autoFX,
		energy: opts.energy ?? 0.6,
	};
}

// Classic pop/rock verse-chorus structure
const verseChorus: SongStructure = {
	name: "Verse-Chorus",
	sections: [
		section("intro", 4, {
			hasMelody: false,
			hasDrums: false,
			hasPad: true,
			energy: 0.3,
		}),
		section("verse", 8, { energy: 0.5 }),
		section("chorus", 8, { hasArpeggio: true, hasPad: true, energy: 0.8 }),
		section("verse", 8, { energy: 0.6 }),
		section("chorus", 8, { hasArpeggio: true, hasPad: true, energy: 0.9 }),
		section("outro", 4, { hasMelody: false, energy: 0.4 }),
	],
};

// AABA - 32-bar jazz/pop standard form
const aaba: SongStructure = {
	name: "AABA",
	sections: [
		section("verse", 8, { energy: 0.5 }),
		section("verse", 8, { energy: 0.6 }),
		section("bridge", 8, { hasArpeggio: true, hasPad: true, energy: 0.7 }),
		section("verse", 8, { energy: 0.6 }),
	],
};

// EDM build-drop structure
const buildDrop: SongStructure = {
	name: "Build-Drop",
	sections: [
		section("intro", 4, {
			hasDrums: false,
			hasPad: true,
			hasFX: true,
			energy: 0.2,
		}),
		section("verse", 8, { hasDrums: true, energy: 0.5 }),
		section("breakdown", 4, {
			hasDrums: false,
			hasArpeggio: true,
			hasPad: true,
			energy: 0.4,
		}),
		section("drop", 8, { hasArpeggio: true, energy: 1.0 }),
		section("breakdown", 4, {
			hasDrums: false,
			hasArpeggio: true,
			hasPad: true,
			energy: 0.5,
		}),
		section("drop", 8, { hasArpeggio: true, energy: 1.0 }),
		section("outro", 4, { hasMelody: false, energy: 0.3 }),
	],
};

// Ambient/minimal - gradual evolution
const ambient: SongStructure = {
	name: "Ambient",
	sections: [
		section("intro", 8, {
			hasMelody: false,
			hasBass: false,
			hasDrums: false,
			hasPad: true,
			energy: 0.2,
		}),
		section("verse", 16, {
			hasDrums: false,
			hasPad: true,
			hasArpeggio: true,
			energy: 0.4,
		}),
		section("bridge", 8, { hasDrums: false, hasPad: true, energy: 0.5 }),
		section("outro", 8, {
			hasMelody: false,
			hasDrums: false,
			hasPad: true,
			energy: 0.2,
		}),
	],
};

// Through-composed - no repeats, keeps evolving
const throughComposed: SongStructure = {
	name: "Through-Composed",
	sections: [
		section("intro", 4, {
			hasDrums: false,
			hasPad: true,
			hasFX: true,
			energy: 0.3,
		}),
		section("verse", 8, { energy: 0.5 }),
		section("bridge", 8, { hasArpeggio: true, energy: 0.6 }),
		section("chorus", 8, {
			hasArpeggio: true,
			hasPad: true,
			hasFX: true,
			energy: 0.8,
		}),
		section("breakdown", 4, {
			hasDrums: false,
			hasArpeggio: true,
			hasPad: true,
			energy: 0.5,
		}),
		section("drop", 8, { hasArpeggio: true, energy: 1.0 }),
		section("outro", 4, { hasMelody: false, hasPad: true, energy: 0.3 }),
	],
};

// Short loop - for quick hits, just 16 bars
const shortLoop: SongStructure = {
	name: "Loop",
	sections: [
		section("intro", 2, { hasDrums: false, energy: 0.4 }),
		section("verse", 8, { hasArpeggio: true, energy: 0.7 }),
		section("chorus", 4, { hasArpeggio: true, hasPad: true, energy: 0.9 }),
		section("outro", 2, { hasMelody: false, energy: 0.5 }),
	],
};

// Rave structure - multiple drops, high energy throughout
const rave: SongStructure = {
	name: "Rave",
	sections: [
		section("intro", 4, { hasDrums: true, hasFX: true, energy: 0.6 }),
		section("drop", 8, { hasArpeggio: true, energy: 1.0 }),
		section("breakdown", 4, {
			hasDrums: false,
			hasArpeggio: true,
			hasPad: true,
			energy: 0.5,
		}),
		section("drop", 8, { hasArpeggio: true, energy: 1.0 }),
		section("breakdown", 4, {
			hasDrums: false,
			hasArpeggio: true,
			hasPad: true,
			energy: 0.5,
		}),
		section("drop", 8, { hasArpeggio: true, energy: 1.0 }),
		section("outro", 4, { energy: 0.7 }),
	],
};

// Chill structure - no high energy, laid back
const chill: SongStructure = {
	name: "Chill",
	sections: [
		section("intro", 4, { hasDrums: false, hasPad: true, energy: 0.2 }),
		section("verse", 8, { hasPad: true, energy: 0.4 }),
		section("bridge", 8, { hasArpeggio: true, hasPad: true, energy: 0.5 }),
		section("verse", 8, { hasPad: true, energy: 0.4 }),
		section("outro", 4, { hasDrums: false, hasPad: true, energy: 0.3 }),
	],
};

// Epic structure - slow build to massive climax
const epic: SongStructure = {
	name: "Epic",
	sections: [
		section("intro", 8, {
			hasMelody: false,
			hasDrums: false,
			hasPad: true,
			hasFX: true,
			energy: 0.2,
		}),
		section("verse", 8, { hasDrums: false, hasPad: true, energy: 0.3 }),
		section("verse", 8, { hasPad: true, energy: 0.5 }),
		section("breakdown", 4, { hasArpeggio: true, hasPad: true, energy: 0.6 }),
		section("chorus", 8, {
			hasArpeggio: true,
			hasPad: true,
			hasFX: true,
			energy: 0.8,
		}),
		section("drop", 8, { hasArpeggio: true, energy: 1.0 }),
		section("outro", 4, { hasPad: true, energy: 0.4 }),
	],
};

// Minimal techno - repetitive, hypnotic
const minimalStructure: SongStructure = {
	name: "Minimal",
	sections: [
		section("intro", 8, { hasMelody: false, energy: 0.4 }),
		section("verse", 16, { energy: 0.5 }),
		section("verse", 16, { hasArpeggio: true, energy: 0.6 }),
		section("outro", 8, { hasMelody: false, energy: 0.4 }),
	],
};

// 12-bar blues - classic blues form
const twelveBarBlues: SongStructure = {
	name: "12-Bar Blues",
	sections: [
		section("intro", 4, { hasDrums: false, hasPad: true, energy: 0.3 }),
		section("verse", 12, { energy: 0.5 }), // The classic 12 bars
		section("verse", 12, { energy: 0.6 }),
		section("bridge", 4, { hasArpeggio: true, hasPad: true, energy: 0.7 }),
		section("verse", 12, { energy: 0.7 }), // Final verse with more energy
		section("outro", 4, { hasMelody: false, energy: 0.4 }),
	],
};

// Rondo form (ABACA) - returns to main theme between contrasting sections
const rondo: SongStructure = {
	name: "Rondo",
	sections: [
		section("verse", 8, { energy: 0.6 }), // A
		section("bridge", 8, { hasArpeggio: true, energy: 0.7 }), // B
		section("verse", 8, { energy: 0.6 }), // A
		section("breakdown", 8, { hasDrums: false, hasPad: true, energy: 0.5 }), // C
		section("verse", 8, { hasArpeggio: true, hasPad: true, energy: 0.8 }), // A (climax)
		section("outro", 4, { energy: 0.4 }),
	],
};

// Breakdown-heavy EDM - multiple breakdowns between drops
const breakdownHeavy: SongStructure = {
	name: "Breakdown-Heavy",
	sections: [
		section("intro", 4, {
			hasDrums: false,
			hasPad: true,
			hasFX: true,
			energy: 0.3,
		}),
		section("breakdown", 4, {
			hasDrums: false,
			hasArpeggio: true,
			hasPad: true,
			energy: 0.5,
		}),
		section("drop", 8, { hasArpeggio: true, energy: 1.0 }),
		section("breakdown", 8, {
			hasDrums: false,
			hasArpeggio: true,
			hasPad: true,
			energy: 0.5,
		}),
		section("drop", 8, { hasArpeggio: true, energy: 1.0 }),
		section("breakdown", 4, {
			hasDrums: false,
			hasArpeggio: true,
			hasPad: true,
			energy: 0.5,
		}),
		section("drop", 8, { hasArpeggio: true, energy: 1.0 }),
		section("outro", 4, { hasMelody: false, hasPad: true, energy: 0.5 }),
	],
};

// Drone - single long section that gradually evolves (ambient/vaporwave)
const drone: SongStructure = {
	name: "Drone",
	sections: [
		section("intro", 8, {
			hasMelody: false,
			hasBass: false,
			hasDrums: false,
			hasPad: true,
			energy: 0.2,
		}),
		section("verse", 24, {
			hasDrums: false,
			hasPad: true,
			hasArpeggio: true,
			energy: 0.35,
		}),
		section("outro", 8, {
			hasMelody: false,
			hasBass: false,
			hasDrums: false,
			hasPad: true,
			energy: 0.2,
		}),
	],
};

// Double drop - two back-to-back drops with mini-breakdown (festival EDM)
const doubleDrop: SongStructure = {
	name: "Double Drop",
	sections: [
		section("intro", 4, {
			hasDrums: false,
			hasPad: true,
			hasFX: true,
			energy: 0.3,
		}),
		section("verse", 8, { energy: 0.5 }),
		section("breakdown", 4, {
			hasDrums: false,
			hasArpeggio: true,
			hasPad: true,
			energy: 0.6,
		}),
		section("drop", 8, { hasArpeggio: true, energy: 1.0 }), // First drop
		section("breakdown", 2, { hasDrums: false, hasPad: true, energy: 0.7 }), // Mini-breakdown
		section("drop", 8, { hasArpeggio: true, energy: 1.0 }), // Second drop (back to back)
		section("outro", 4, { energy: 0.5 }),
	],
};

// Station jingle - very short, high energy, for station IDs
const jingle: SongStructure = {
	name: "Jingle",
	sections: [
		section("intro", 1, { hasDrums: true, hasArpeggio: true, energy: 0.8 }),
		section("chorus", 2, {
			hasArpeggio: true,
			hasPad: true,
			energy: 1.0,
		}),
		section("outro", 1, { hasMelody: true, hasPad: true, energy: 0.9 }),
	],
};

// Commercial break music - upbeat, short
const commercial: SongStructure = {
	name: "Commercial",
	sections: [
		section("intro", 1, { hasDrums: true, energy: 0.7 }),
		section("verse", 4, { hasArpeggio: true, energy: 0.8 }),
		section("outro", 1, { hasPad: true, energy: 0.6 }),
	],
};

// Binary form (A-B) - simple two-part structure
const binary: SongStructure = {
	name: "Binary",
	sections: [
		section("intro", 2, { hasDrums: false, hasPad: true, energy: 0.3 }),
		section("verse", 12, { energy: 0.5 }), // A section
		section("chorus", 12, { hasArpeggio: true, hasPad: true, energy: 0.7 }), // B section
		section("outro", 2, { hasMelody: false, energy: 0.4 }),
	],
};

// Strophic form - repeating verses (folk, hymn style)
const strophic: SongStructure = {
	name: "Strophic",
	sections: [
		section("intro", 4, { hasDrums: false, hasPad: true, energy: 0.3 }),
		section("verse", 8, { energy: 0.5 }),
		section("verse", 8, { energy: 0.55 }),
		section("verse", 8, { hasArpeggio: true, energy: 0.6 }),
		section("verse", 8, { hasArpeggio: true, hasPad: true, energy: 0.65 }),
		section("outro", 4, { hasMelody: false, hasPad: true, energy: 0.4 }),
	],
};

// Medley - multiple contrasting themes, through-composed journey
const medley: SongStructure = {
	name: "Medley",
	sections: [
		section("intro", 4, { hasDrums: false, hasPad: true, energy: 0.3 }),
		section("verse", 8, { energy: 0.5 }), // Theme 1
		section("bridge", 4, { hasArpeggio: true, energy: 0.6 }), // Transition
		section("chorus", 8, { hasArpeggio: true, hasPad: true, energy: 0.7 }), // Theme 2
		section("breakdown", 4, { hasDrums: false, hasPad: true, energy: 0.4 }), // Transition
		section("drop", 8, { hasArpeggio: true, energy: 0.9 }), // Theme 3
		section("verse", 8, { hasPad: true, energy: 0.6 }), // Theme 4 (callback)
		section("outro", 4, { hasMelody: false, energy: 0.5 }),
	],
};

export const structures: SongStructure[] = [
	verseChorus,
	aaba,
	buildDrop,
	ambient,
	throughComposed,
	shortLoop,
	rave,
	chill,
	epic,
	minimalStructure,
	twelveBarBlues,
	rondo,
	breakdownHeavy,
	drone,
	doubleDrop,
	binary,
	strophic,
	medley,
];

// Special structures for radio content (not in random rotation)
export const jingleStructure = jingle;
export const commercialStructure = commercial;

export function getTotalBars(structure: SongStructure): number {
	return structure.sections.reduce((sum, s) => sum + s.bars, 0);
}
