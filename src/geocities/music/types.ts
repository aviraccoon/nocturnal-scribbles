/** Time slots for time-of-day mood influence */
export type TimeSlot =
	| "lateNight" // 2-5 AM - chill/dark drift
	| "earlyMorning" // 6-9 AM - bright/chill drift
	| "morning" // 9 AM-12 PM - neutral
	| "afternoon" // 12-5 PM - neutral, page dominates
	| "evening" // 5-9 PM - dark/energy drift
	| "night"; // 9 PM-2 AM - dark drift

export type VisualState = {
	// Visual properties
	dominantHue: number;
	saturation: number;
	lightness: number;
	hasStripes: boolean;
	hasGradient: boolean;

	// Page structure
	elementCount: number;
	marqueesCount: number;
	emojiTypes: string[];
	chaosLevel: number;

	// Content-aware analysis
	codeBlockCount: number; // → digital, chiptune shift
	blockquoteCount: number; // → reflective, nostalgic shift
	avgParagraphLength: number; // → longer = slower, ambient
	listCount: number; // → rhythmic, structured
	headerCount: number; // → more structure changes
	externalLinkCount: number; // → exploratory melodies
	imageCount: number; // → visual density

	// Time-based mood modifiers
	timeSlot: TimeSlot;
	isWeekendNight: boolean; // Fri/Sat after 9 PM

	// Post-specific (null for non-post pages)
	postAgeDays: number | null; // → dusty tape treatment for old posts
};

export type ScaleType =
	| "major"
	| "minor"
	| "pentatonic"
	| "minorPentatonic"
	| "blues"
	| "dorian"
	| "mixolydian"
	| "phrygian"
	| "harmonicMinor"
	| "melodicMinor"
	| "wholeTone"
	| "lydian"
	| "phrygianDominant"
	| "diminished"
	| "chromatic"
	| "locrian"
	| "hirajoshi"
	| "insen";
export type DrumPatternType =
	| "basic"
	| "syncopated"
	| "disco"
	| "halftime"
	| "breakbeat"
	| "minimal"
	| "trap"
	| "house"
	| "dnb"
	| "jazz"
	| "latin"
	| "trap808"
	| "bossa"
	| "funk"
	| "reggae"
	| "twoStep"
	| "shuffle"
	| "industrial"
	| "afrobeat"
	| "dubstep"
	| "drill"
	| "motorik"
	| "newWave";

export type Musical = {
	rootNote: number;
	scale: number[];
	scaleName: ScaleType;
	tempo: number;
	density: number;
	progression: number[];
	hasArpeggio: boolean;
	hasDrums: boolean;
	hasPad: boolean;
	drumPattern: DrumPatternType;
	hasSpecialMelody: boolean;
	delayAmount: number;
	filterCutoff: number;
};

export type MelodyPatternType =
	| "free" // Current random movement style
	| "callResponse" // Phrase then answer
	| "sequence" // Repeat pattern at different pitch
	| "octaveJumps" // EDM-style wide intervals
	| "trill" // Rapid note alternation
	| "riff" // Short repeating melodic fragment
	| "pedal" // Melody over a sustained drone note
	| "ostinato" // Fixed repeating pattern (doesn't transpose)
	| "scaleRun" // Quick ascending/descending scale passages
	| "syncopated" // Heavy offbeat emphasis
	| "motifDevelopment" // Motif with variations (inversion, augmentation)
	| "counterpoint" // Two independent melodic lines
	| "staccato" // Short punchy bursts with rests
	| "chromaticApproach" // Approach chord tones chromatically
	| "echo" // Melody repeats offset creating self-harmony
	| "intervallic"; // Built on specific intervals (4ths, 5ths)

export type RhythmVariationType =
	| "normal" // Standard pattern
	| "breakdown" // Strip to just kick
	| "dropout" // Sudden silence
	| "polyrhythm"; // Cross-rhythm patterns

export type MelodyNote = {
	step: number;
	note: number;
	duration: number;
	velocity: number;
	isGraceNote?: boolean; // Quick ornamental note
};
export type BassNote = { step: number; note: number; duration: number };
export type ArpeggioNote = { step: number; note: number; duration: number };
export type PadNote = { step: number; notes: number[]; duration: number };
export type DrumHit = {
	step: number;
	type: string;
	velocity?: number;
	pitch?: number;
};

export type ArpPatternType =
	| "up"
	| "down"
	| "updown"
	| "random"
	| "pingpong"
	| "thumb"
	| "skipUp"
	| "skipDown"
	| "cascade"
	| "spread"
	| "twoOctave"
	| "brokenChord";

export type BassPatternType =
	| "simple"
	| "walking"
	| "octave"
	| "fifth"
	| "syncopated"
	| "driving"
	| "melodic"
	| "pump"
	| "disco"
	| "reggae"
	| "slap";

export type Pattern = {
	tempo: number;
	melody: MelodyNote[];
	bass: BassNote[];
	drums: DrumHit[];
	arpeggio: ArpeggioNote[];
	pad: PadNote[];
	delayAmount: number;
	filterCutoff: number;
	trackName?: string;
	scaleName?: string;
	rootNote?: string;
	// Generation metadata for display
	melodyPattern?: MelodyPatternType;
	rhythmVariation?: RhythmVariationType;
	drumPattern?: DrumPatternType;
	arpPattern?: ArpPatternType;
	bassPattern?: BassPatternType;
};

// Song structure types
export type SectionType =
	| "intro"
	| "verse"
	| "chorus"
	| "bridge"
	| "breakdown"
	| "drop"
	| "outro";

export type Section = {
	type: SectionType;
	bars: number;
	// What elements are active in this section
	hasMelody: boolean;
	hasBass: boolean;
	hasDrums: boolean;
	hasArpeggio: boolean;
	hasPad: boolean;
	// Energy level 0-1 affects density and velocity
	energy: number;
};

export type SongStructure = {
	name: string;
	sections: Section[];
};

export type GenreType =
	| "chiptune"
	| "ambient"
	| "synthwave"
	| "lofi"
	| "techno"
	| "trance"
	| "midi"
	| "happycore"
	| "vaporwave";

export type Genre = {
	name: GenreType;
	tempoRange: [number, number];
	preferredScales: ScaleType[];
	drumPatterns: DrumPatternType[];
	oscTypes: { melody: OscillatorType[]; bass: OscillatorType[] };
	delayRange: [number, number];
	filterRange: [number, number];
	// Synthesis character
	detuneRange: [number, number];
	attackRange: [number, number];
	// Timing feel (0 = straight, 0.5 = full triplet swing)
	swingRange: [number, number];
	// Automix transition styles (one is picked randomly)
	transitions: TransitionStyle[];
};

export type Song = {
	genre: Genre;
	structure: SongStructure;
	tempo: number;
	rootNote: number;
	scale: number[];
	scaleName: ScaleType;
	progression: number[];
	patterns: Map<SectionType, Pattern>;
	totalBars: number;
	trackName: string;
	// Per-song synthesis parameters (randomly selected from genre ranges)
	delayAmount: number;
	filterCutoff: number;
	detune: number;
	attack: number;
	swing: number;
};

/** Tracks the current state of a playing section */
export type SectionState = {
	type: SectionType;
	index: number;
	melodyPattern: MelodyPatternType | null;
	rhythmVariation: RhythmVariationType;
	drumPattern: DrumPatternType | null;
	bassPattern: BassPatternType | null;
	arpPattern: ArpPatternType | null;
	energy: number;
	activeTracks: {
		melody: boolean;
		bass: boolean;
		drums: boolean;
		arpeggio: boolean;
		pad: boolean;
	};
};

// ============================================
// Automix / Playback Queue Types
// ============================================

/** A single commercial in an ad break with voice assignment */
export type AdBreakCommercial = {
	product: string;
	lines: string[];
	voiceIndex: number; // Which voice to use (0-3 for variety)
};

/** An ad break containing multiple commercials */
export type AdBreak = {
	commercials: AdBreakCommercial[];
	introJingle: string; // Station-specific ad break intro
	outroJingle: string; // "We'll be right back" type outro
};

/** A single segment within a DJ block */
export type DJSegment = {
	type:
		| "guestbook"
		| "dedication"
		| "stationId"
		| "timeCheck"
		| "djIntro"
		| "visitorCount"
		| "generic";
	text: string;
	voiceType?: "dj" | "system"; // Which voice to use (defaults to dj)
};

/** A DJ block containing multiple segments played in sequence */
export type DJAnnouncement = {
	segments: DJSegment[];
};

/** Items that can be played in the music queue */
export type PlayableItem =
	| { kind: "song"; song: Song }
	| { kind: "adBreak"; adBreak: AdBreak }
	| { kind: "djAnnouncement"; announcement: DJAnnouncement }
	| { kind: "commercial"; id: string; duration: number }
	| { kind: "jingle"; stationId: string; duration: number }
	| { kind: "news"; segments: string[]; duration: number }
	| { kind: "silence"; duration: number }; // Dead air for effect

/** Audio deck state for dual-deck mixing */
export type DeckId = "A" | "B";
export type DeckState = "idle" | "playing" | "fadeIn" | "fadeOut" | "cueing";

export type Deck = {
	id: DeckId;
	item: PlayableItem | null;
	state: DeckState;
	// Playback position tracking
	currentBar: number;
	currentStep: number;
	startTime: number;
	// Audio nodes owned by this deck
	gainNode: GainNode | null;
	filterNode: BiquadFilterNode | null;
	delayNode: DelayNode | null;
};

/** Automix transition styles */
export type TransitionStyle =
	| "crossfade" // Simple volume crossfade
	| "beatmatch" // Align beats, tempo sync
	| "filterSweep" // Low-pass outgoing, high-pass incoming
	| "echo" // Echo out the outgoing track
	| "drop" // Cut outgoing on downbeat, slam in new track
	| "hardcut"; // Immediate cut (for commercials, etc.)

/** Automix settings */
export type AutomixSettings = {
	enabled: boolean;
	style: TransitionStyle | "auto"; // "auto" picks based on genre
	transitionBars: number; // How many bars to overlap (2-8)
	matchTempo: boolean; // Slightly adjust incoming tempo to match
};
