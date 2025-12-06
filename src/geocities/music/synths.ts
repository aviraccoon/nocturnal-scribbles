import type { FXType, Song } from "./types";

const T = window.ThemeUtils;

/**
 * Synthesis context for audio generation.
 * Works with both live (AudioContext) and offline (OfflineAudioContext) rendering.
 */
export type SynthContext = {
	/** Audio context (AudioContext for live, OfflineAudioContext for export) */
	ctx: BaseAudioContext;
	/** Output node to connect sounds to */
	output: AudioNode;
	/** Sidechain gain for kick ducking (null for offline rendering) */
	sidechain: GainNode | null;
	/** Current song for genre-specific synthesis */
	song: Song;
	/** Mutable state for portamento tracking */
	state: {
		lastMelodyFreq: number | null;
	};
};

/** Create a new synth context */
export function createSynthContext(
	ctx: BaseAudioContext,
	output: AudioNode,
	song: Song,
	sidechain: GainNode | null = null,
): SynthContext {
	return {
		ctx,
		output,
		sidechain,
		song,
		state: { lastMelodyFreq: null },
	};
}

function noteToFreq(note: number) {
	// note 0 = C4 (middle C)
	return 261.63 * 2 ** (note / 12);
}

type NoteOptions = {
	type?: OscillatorType;
	volume?: number;
	detune?: number; // Detune amount in cents (0 = no detune)
	attack?: number; // Attack time in seconds
	vibrato?: boolean; // Add vibrato to sustained notes
	portamento?: number; // Glide time in seconds (0 = instant)
	wowFlutter?: number; // Tape wobble amount (0-1)
	pwmDepth?: number; // Pulse width modulation depth (0-1)
};

/** Play a melodic note with portamento, wow/flutter, and PWM. */
export function playNote(
	synth: SynthContext,
	freq: number,
	startTime: number,
	duration: number,
	opts: NoteOptions = {},
) {
	const c = synth.ctx;
	const output = synth.output;

	const type = opts.type ?? "square";
	const volume = opts.volume ?? 0.15;
	const detuneAmount = opts.detune ?? 0;
	const attack = opts.attack ?? 0.01;
	const vibrato = opts.vibrato ?? false;
	const portamento = opts.portamento ?? 0;
	const wowFlutter = opts.wowFlutter ?? 0;
	const pwmDepth = opts.pwmDepth ?? 0;

	// Determine starting frequency for portamento
	const startFreq =
		portamento > 0 && synth.state.lastMelodyFreq
			? synth.state.lastMelodyFreq
			: freq;
	synth.state.lastMelodyFreq = freq; // Update for next note

	// Create main oscillator
	const osc1 = c.createOscillator();
	const gain1 = c.createGain();
	osc1.type = type;

	// Apply portamento: glide from last note to current
	if (portamento > 0 && startFreq !== freq) {
		osc1.frequency.setValueAtTime(startFreq, startTime);
		osc1.frequency.exponentialRampToValueAtTime(
			freq,
			startTime + Math.min(portamento, duration * 0.5),
		);
	} else {
		osc1.frequency.setValueAtTime(freq, startTime);
	}

	// Add wow and flutter (tape pitch wobble) via LFO on detune
	if (wowFlutter > 0) {
		// Wow: slow drift (0.3-0.8 Hz)
		const wowLfo = c.createOscillator();
		const wowGain = c.createGain();
		wowLfo.type = "sine";
		wowLfo.frequency.value = 0.3 + Math.random() * 0.5;
		// Wow affects detune in cents (up to 30 cents at max flutter)
		wowGain.gain.value = wowFlutter * 30;
		wowLfo.connect(wowGain);
		wowGain.connect(osc1.detune);
		wowLfo.start(startTime);
		wowLfo.stop(startTime + duration + 0.1);

		// Flutter: faster irregular wobble (4-8 Hz)
		const flutterLfo = c.createOscillator();
		const flutterGain = c.createGain();
		flutterLfo.type = "sine";
		flutterLfo.frequency.value = 4 + Math.random() * 4;
		// Flutter is subtler (up to 8 cents at max flutter)
		flutterGain.gain.value = wowFlutter * 8;
		flutterLfo.connect(flutterGain);
		flutterGain.connect(osc1.detune);
		flutterLfo.start(startTime);
		flutterLfo.stop(startTime + duration + 0.1);
	}

	// Add vibrato for sustained notes
	if (vibrato && duration > 0.3) {
		const lfo = c.createOscillator();
		const lfoGain = c.createGain();
		lfo.type = "sine";
		lfo.frequency.value = 5 + Math.random() * 2; // 5-7 Hz
		lfoGain.gain.value = freq * 0.01; // 1% pitch variation
		lfo.connect(lfoGain);
		lfoGain.connect(osc1.frequency);
		// Fade in vibrato
		lfoGain.gain.setValueAtTime(0, startTime);
		lfoGain.gain.linearRampToValueAtTime(freq * 0.01, startTime + 0.2);
		lfo.start(startTime);
		lfo.stop(startTime + duration + 0.1);
	}

	// Second oscillator: either detuned for richness, or PWM partner
	let osc2: OscillatorNode | undefined;
	let gain2: GainNode | undefined;

	// PWM: simulate pulse width modulation by mixing two square waves
	// One inverted with modulated phase offset creates moving pulse width
	if (pwmDepth > 0 && type === "square") {
		osc2 = c.createOscillator();
		gain2 = c.createGain();
		osc2.type = "square";

		// Apply portamento to osc2 as well
		if (portamento > 0 && startFreq !== freq) {
			osc2.frequency.setValueAtTime(startFreq, startTime);
			osc2.frequency.exponentialRampToValueAtTime(
				freq,
				startTime + Math.min(portamento, duration * 0.5),
			);
		} else {
			osc2.frequency.setValueAtTime(freq, startTime);
		}

		// PWM LFO modulates the detune of osc2
		// This creates phase offset that varies, simulating PWM
		const pwmLfo = c.createOscillator();
		const pwmLfoGain = c.createGain();
		pwmLfo.type = "triangle"; // Triangle for smooth PWM sweep
		pwmLfo.frequency.value = 0.5 + Math.random() * 1.5; // 0.5-2 Hz
		// PWM depth controls how much detune sweep (up to 50 cents)
		pwmLfoGain.gain.value = pwmDepth * 50;
		pwmLfo.connect(pwmLfoGain);
		pwmLfoGain.connect(osc2.detune);
		pwmLfo.start(startTime);
		pwmLfo.stop(startTime + duration + 0.1);

		// Invert osc2 and mix with osc1 for PWM effect
		gain2.gain.setValueAtTime(0, startTime);
		gain2.gain.linearRampToValueAtTime(-volume * 0.4, startTime + attack);
		gain2.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

		// Apply wow/flutter to osc2 as well for coherent sound
		if (wowFlutter > 0) {
			const wow2 = c.createOscillator();
			const wowGain2 = c.createGain();
			wow2.type = "sine";
			wow2.frequency.value = 0.3 + Math.random() * 0.5;
			wowGain2.gain.value = wowFlutter * 30;
			wow2.connect(wowGain2);
			wowGain2.connect(osc2.detune);
			wow2.start(startTime);
			wow2.stop(startTime + duration + 0.1);
		}
	} else if (detuneAmount > 0 && type !== "sine") {
		// Regular detuned oscillator for richness (non-PWM case)
		osc2 = c.createOscillator();
		gain2 = c.createGain();
		osc2.type = type;

		if (portamento > 0 && startFreq !== freq) {
			osc2.frequency.setValueAtTime(startFreq, startTime);
			osc2.frequency.exponentialRampToValueAtTime(
				freq,
				startTime + Math.min(portamento, duration * 0.5),
			);
		} else {
			osc2.frequency.setValueAtTime(freq, startTime);
		}

		// Random detune within the genre's range
		const actualDetune = T.rand(-detuneAmount, detuneAmount);
		osc2.detune.setValueAtTime(actualDetune, startTime);

		// Apply wow/flutter to osc2
		if (wowFlutter > 0) {
			const wow2 = c.createOscillator();
			const wowGain2 = c.createGain();
			wow2.type = "sine";
			wow2.frequency.value = 0.3 + Math.random() * 0.5;
			wowGain2.gain.value = wowFlutter * 30;
			wow2.connect(wowGain2);
			wowGain2.connect(osc2.detune);
			wow2.start(startTime);
			wow2.stop(startTime + duration + 0.1);
		}

		gain2.gain.setValueAtTime(0, startTime);
		gain2.gain.linearRampToValueAtTime(volume * 0.5, startTime + attack);
		gain2.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
	}

	// Envelope with configurable attack
	gain1.gain.setValueAtTime(0, startTime);
	gain1.gain.linearRampToValueAtTime(volume, startTime + attack);
	gain1.gain.setValueAtTime(
		volume * 0.8,
		startTime + Math.max(attack, duration * 0.3),
	);
	gain1.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

	osc1.connect(gain1);
	gain1.connect(output);
	osc1.start(startTime);
	osc1.stop(startTime + duration + 0.1);

	if (osc2 && gain2) {
		osc2.connect(gain2);
		gain2.connect(output);
		osc2.start(startTime);
		osc2.stop(startTime + duration + 0.1);
	}
}

/** Play bass with filter sweep and sub-bass layer. */
export function playBass(
	synth: SynthContext,
	freq: number,
	startTime: number,
	duration: number,
) {
	const c = synth.ctx;
	const output = synth.output;
	const genre = synth.song.genre;
	const oscType = T.pick(genre.oscTypes.bass);

	// Main bass oscillator
	const osc = c.createOscillator();
	const gain = c.createGain();
	const filter = c.createBiquadFilter();

	osc.type = oscType;
	osc.frequency.setValueAtTime(freq, startTime);

	// Genre-specific synthesis
	filter.type = "lowpass";

	switch (genre.name) {
		case "techno": {
			// Acid-style resonant bass with filter sweep
			filter.frequency.setValueAtTime(3000, startTime);
			filter.frequency.exponentialRampToValueAtTime(150, startTime + duration);
			filter.Q.value = 8 + Math.random() * 6; // High resonance
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.14, startTime + 0.01);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			break;
		}
		case "trance": {
			// Punchy pluck with wobble
			const lfo = c.createOscillator();
			const lfoGain = c.createGain();
			lfo.frequency.value = 4 + Math.random() * 4; // 4-8 Hz wobble
			lfoGain.gain.value = 400;
			lfo.connect(lfoGain);
			lfoGain.connect(filter.frequency);
			lfo.start(startTime);
			lfo.stop(startTime + duration);

			filter.frequency.setValueAtTime(1500, startTime);
			filter.Q.value = 4;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.15, startTime + 0.015);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			break;
		}
		case "synthwave": {
			// Warm sustained bass with slight detune
			const osc2 = c.createOscillator();
			osc2.type = oscType;
			osc2.frequency.setValueAtTime(freq, startTime);
			osc2.detune.value = 8;
			osc2.connect(filter);
			osc2.start(startTime);
			osc2.stop(startTime + duration + 0.1);

			filter.frequency.setValueAtTime(1200, startTime);
			filter.Q.value = 1;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.1, startTime + 0.03);
			gain.gain.setValueAtTime(0.08, startTime + duration * 0.7);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			break;
		}
		case "lofi": {
			// Soft, muffled, jazzy bass
			filter.frequency.setValueAtTime(600 + Math.random() * 400, startTime);
			filter.Q.value = 0.5;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.12, startTime + 0.04);
			gain.gain.setValueAtTime(0.1, startTime + duration * 0.6);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			break;
		}
		case "ambient": {
			// Very soft, sustained, filtered
			filter.frequency.setValueAtTime(400, startTime);
			filter.Q.value = 0.3;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.08, startTime + 0.1);
			gain.gain.setValueAtTime(0.06, startTime + duration * 0.8);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			break;
		}
		case "chiptune": {
			// Sharp, clean, no filter sweep
			filter.frequency.setValueAtTime(8000, startTime);
			filter.Q.value = 0;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.12, startTime + 0.005);
			gain.gain.setValueAtTime(0.1, startTime + duration * 0.8);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			break;
		}
		case "midi": {
			// Thin, dry, instant attack - classic GM bass
			filter.frequency.setValueAtTime(4000, startTime);
			filter.Q.value = 0;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.1, startTime + 0.002);
			gain.gain.setValueAtTime(0.08, startTime + duration * 0.9);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			break;
		}
		case "happycore": {
			// Bouncy, punchy, pitch bend
			osc.frequency.setValueAtTime(freq * 1.02, startTime);
			osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.05);
			filter.frequency.setValueAtTime(2500, startTime);
			filter.frequency.exponentialRampToValueAtTime(800, startTime + duration);
			filter.Q.value = 3;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.14, startTime + 0.01);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			break;
		}
		case "vaporwave": {
			// Slow, detuned, dreamy
			osc.detune.value = 15 + Math.random() * 10;
			filter.frequency.setValueAtTime(800, startTime);
			filter.Q.value = 1;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.08, startTime + 0.08);
			gain.gain.setValueAtTime(0.06, startTime + duration * 0.7);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			break;
		}
		default: {
			// Fallback - basic pluck
			filter.frequency.setValueAtTime(2000, startTime);
			filter.frequency.exponentialRampToValueAtTime(
				200,
				startTime + duration * 0.8,
			);
			filter.Q.value = 2;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
			gain.gain.setValueAtTime(0.12, startTime + duration * 0.5);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
		}
	}

	osc.connect(filter);
	filter.connect(gain);
	gain.connect(output);

	osc.start(startTime);
	osc.stop(startTime + duration + 0.1);

	// Sub-bass layer for weight (skip for thin genres)
	if (genre.name !== "midi" && genre.name !== "chiptune") {
		const subOsc = c.createOscillator();
		const subGain = c.createGain();
		subOsc.type = "sine";
		subOsc.frequency.setValueAtTime(freq / 2, startTime);

		const subLevel =
			genre.name === "ambient" || genre.name === "vaporwave" ? 0.06 : 0.1;
		subGain.gain.setValueAtTime(0, startTime);
		subGain.gain.linearRampToValueAtTime(subLevel, startTime + 0.03);
		subGain.gain.setValueAtTime(subLevel * 0.8, startTime + duration * 0.6);
		subGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

		subOsc.connect(subGain);
		subGain.connect(output);
		subOsc.start(startTime);
		subOsc.stop(startTime + duration + 0.1);
	}
}

/** Play pad chord with genre-specific synthesis. */
export function playPad(
	synth: SynthContext,
	notes: number[],
	startTime: number,
	duration: number,
) {
	const c = synth.ctx;
	const output = synth.output;
	const genre = synth.song.genre;

	for (const note of notes) {
		const freq = noteToFreq(note);

		switch (genre.name) {
			case "synthwave": {
				// Lush detuned saw pads
				for (let i = 0; i < 3; i++) {
					const osc = c.createOscillator();
					const gain = c.createGain();
					const filter = c.createBiquadFilter();
					osc.type = "sawtooth";
					osc.frequency.setValueAtTime(freq, startTime);
					osc.detune.value = (i - 1) * 12; // -12, 0, +12 cents
					filter.type = "lowpass";
					filter.frequency.value = 2000;
					filter.Q.value = 1;
					const attackTime = Math.min(0.3, duration * 0.15);
					gain.gain.setValueAtTime(0, startTime);
					gain.gain.linearRampToValueAtTime(0.025, startTime + attackTime);
					gain.gain.setValueAtTime(0.02, startTime + duration * 0.7);
					gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
					osc.connect(filter);
					filter.connect(gain);
					gain.connect(output);
					osc.start(startTime);
					osc.stop(startTime + duration + 0.3);
				}
				break;
			}
			case "trance": {
				// Supersaw-style with filter movement
				for (let i = 0; i < 4; i++) {
					const osc = c.createOscillator();
					const gain = c.createGain();
					const filter = c.createBiquadFilter();
					osc.type = "sawtooth";
					osc.frequency.setValueAtTime(freq, startTime);
					osc.detune.value = (i - 1.5) * 10 + Math.random() * 5;
					filter.type = "lowpass";
					filter.frequency.setValueAtTime(1000, startTime);
					filter.frequency.linearRampToValueAtTime(
						3000,
						startTime + duration * 0.5,
					);
					filter.frequency.linearRampToValueAtTime(1500, startTime + duration);
					filter.Q.value = 2;
					const attackTime = Math.min(0.2, duration * 0.1);
					gain.gain.setValueAtTime(0, startTime);
					gain.gain.linearRampToValueAtTime(0.02, startTime + attackTime);
					gain.gain.setValueAtTime(0.018, startTime + duration * 0.8);
					gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
					osc.connect(filter);
					filter.connect(gain);
					gain.connect(output);
					osc.start(startTime);
					osc.stop(startTime + duration + 0.3);
				}
				break;
			}
			case "ambient": {
				// Soft evolving sine pads with slow LFO
				const osc = c.createOscillator();
				const osc2 = c.createOscillator();
				const gain = c.createGain();
				const lfo = c.createOscillator();
				const lfoGain = c.createGain();
				osc.type = "sine";
				osc2.type = "sine";
				osc.frequency.setValueAtTime(freq, startTime);
				osc2.frequency.setValueAtTime(freq * 2.01, startTime); // Slight beating
				lfo.frequency.value = 0.2 + Math.random() * 0.3;
				lfoGain.gain.value = 0.01;
				lfo.connect(lfoGain);
				lfoGain.connect(gain.gain);
				const attackTime = Math.min(1, duration * 0.3);
				gain.gain.setValueAtTime(0, startTime);
				gain.gain.linearRampToValueAtTime(0.03, startTime + attackTime);
				gain.gain.setValueAtTime(0.025, startTime + duration * 0.8);
				gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
				osc.connect(gain);
				osc2.connect(gain);
				gain.connect(output);
				osc.start(startTime);
				osc2.start(startTime);
				lfo.start(startTime);
				osc.stop(startTime + duration + 0.5);
				osc2.stop(startTime + duration + 0.5);
				lfo.stop(startTime + duration + 0.5);
				break;
			}
			case "vaporwave": {
				// Detuned, lo-fi, chorus-like
				for (let i = 0; i < 2; i++) {
					const osc = c.createOscillator();
					const gain = c.createGain();
					const filter = c.createBiquadFilter();
					osc.type = "triangle";
					osc.frequency.setValueAtTime(freq, startTime);
					osc.detune.value = (i === 0 ? -20 : 20) + Math.random() * 10;
					filter.type = "lowpass";
					filter.frequency.value = 1200;
					const attackTime = Math.min(0.6, duration * 0.25);
					gain.gain.setValueAtTime(0, startTime);
					gain.gain.linearRampToValueAtTime(0.035, startTime + attackTime);
					gain.gain.setValueAtTime(0.03, startTime + duration * 0.7);
					gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
					osc.connect(filter);
					filter.connect(gain);
					gain.connect(output);
					osc.start(startTime);
					osc.stop(startTime + duration + 0.4);
				}
				break;
			}
			case "lofi": {
				// Warm Rhodes-like electric piano
				const osc = c.createOscillator();
				const osc2 = c.createOscillator();
				const gain = c.createGain();
				const filter = c.createBiquadFilter();
				osc.type = "sine";
				osc2.type = "triangle";
				osc.frequency.setValueAtTime(freq, startTime);
				osc2.frequency.setValueAtTime(freq * 2, startTime);
				filter.type = "lowpass";
				filter.frequency.value = 1500;
				const attackTime = Math.min(0.15, duration * 0.1);
				gain.gain.setValueAtTime(0, startTime);
				gain.gain.linearRampToValueAtTime(0.04, startTime + attackTime);
				gain.gain.setValueAtTime(0.03, startTime + duration * 0.6);
				gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
				osc.connect(filter);
				osc2.connect(filter);
				filter.connect(gain);
				gain.connect(output);
				osc.start(startTime);
				osc2.start(startTime);
				osc.stop(startTime + duration + 0.3);
				osc2.stop(startTime + duration + 0.3);
				break;
			}
			case "chiptune":
			case "midi": {
				// Simple square/pulse pad
				const osc = c.createOscillator();
				const gain = c.createGain();
				osc.type = "square";
				osc.frequency.setValueAtTime(freq, startTime);
				gain.gain.setValueAtTime(0, startTime);
				gain.gain.linearRampToValueAtTime(0.03, startTime + 0.02);
				gain.gain.setValueAtTime(0.025, startTime + duration * 0.8);
				gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
				osc.connect(gain);
				gain.connect(output);
				osc.start(startTime);
				osc.stop(startTime + duration + 0.1);
				break;
			}
			case "techno": {
				// Dark, filtered pad
				const osc = c.createOscillator();
				const gain = c.createGain();
				const filter = c.createBiquadFilter();
				osc.type = "sawtooth";
				osc.frequency.setValueAtTime(freq, startTime);
				filter.type = "lowpass";
				filter.frequency.setValueAtTime(800, startTime);
				filter.frequency.linearRampToValueAtTime(
					1500,
					startTime + duration * 0.3,
				);
				filter.frequency.linearRampToValueAtTime(600, startTime + duration);
				filter.Q.value = 4;
				const attackTime = Math.min(0.4, duration * 0.2);
				gain.gain.setValueAtTime(0, startTime);
				gain.gain.linearRampToValueAtTime(0.035, startTime + attackTime);
				gain.gain.setValueAtTime(0.03, startTime + duration * 0.7);
				gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
				osc.connect(filter);
				filter.connect(gain);
				gain.connect(output);
				osc.start(startTime);
				osc.stop(startTime + duration + 0.2);
				break;
			}
			case "happycore": {
				// Bright, shimmery pad
				const osc = c.createOscillator();
				const osc2 = c.createOscillator();
				const gain = c.createGain();
				osc.type = "square";
				osc2.type = "sawtooth";
				osc.frequency.setValueAtTime(freq, startTime);
				osc2.frequency.setValueAtTime(freq * 1.005, startTime);
				const attackTime = 0.02;
				gain.gain.setValueAtTime(0, startTime);
				gain.gain.linearRampToValueAtTime(0.03, startTime + attackTime);
				gain.gain.setValueAtTime(0.025, startTime + duration * 0.8);
				gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
				osc.connect(gain);
				osc2.connect(gain);
				gain.connect(output);
				osc.start(startTime);
				osc2.start(startTime);
				osc.stop(startTime + duration + 0.1);
				osc2.stop(startTime + duration + 0.1);
				break;
			}
			default: {
				// Default sine pad
				const osc = c.createOscillator();
				const gain = c.createGain();
				osc.type = "sine";
				osc.frequency.setValueAtTime(freq, startTime);
				const attackTime = Math.min(0.5, duration * 0.2);
				gain.gain.setValueAtTime(0, startTime);
				gain.gain.linearRampToValueAtTime(0.04, startTime + attackTime);
				gain.gain.setValueAtTime(0.04, startTime + duration * 0.7);
				gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
				osc.connect(gain);
				gain.connect(output);
				osc.start(startTime);
				osc.stop(startTime + duration + 0.2);
			}
		}
	}
}

/** Play arpeggio note with genre-specific character. */
export function playArp(
	synth: SynthContext,
	freq: number,
	startTime: number,
	duration: number,
) {
	const c = synth.ctx;
	const output = synth.output;
	const genre = synth.song.genre;
	const osc = c.createOscillator();
	const gain = c.createGain();
	const filter = c.createBiquadFilter();

	filter.type = "lowpass";

	switch (genre.name) {
		case "trance": {
			// Bright, plucky, with pitch envelope
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(freq * 1.01, startTime);
			osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.03);
			filter.frequency.setValueAtTime(6000, startTime);
			filter.frequency.exponentialRampToValueAtTime(2000, startTime + duration);
			filter.Q.value = 2;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.06, startTime + 0.005);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			break;
		}
		case "synthwave": {
			// Warm, slightly detuned
			const osc2 = c.createOscillator();
			osc.type = "sawtooth";
			osc2.type = "sawtooth";
			osc.frequency.setValueAtTime(freq, startTime);
			osc2.frequency.setValueAtTime(freq, startTime);
			osc2.detune.value = 7;
			osc2.connect(filter);
			osc2.start(startTime);
			osc2.stop(startTime + duration + 0.1);
			filter.frequency.value = 4000;
			filter.Q.value = 1;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.04, startTime + 0.01);
			gain.gain.setValueAtTime(0.03, startTime + duration * 0.5);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			break;
		}
		case "techno": {
			// Acid-style with resonance
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(freq, startTime);
			filter.frequency.setValueAtTime(4000, startTime);
			filter.frequency.exponentialRampToValueAtTime(500, startTime + duration);
			filter.Q.value = 10;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.05, startTime + 0.005);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			break;
		}
		case "lofi": {
			// Soft, muffled, jazzy
			osc.type = "triangle";
			osc.frequency.setValueAtTime(freq, startTime);
			filter.frequency.value = 2000;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.045, startTime + 0.02);
			gain.gain.setValueAtTime(0.035, startTime + duration * 0.6);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			break;
		}
		case "ambient": {
			// Very soft, bell-like
			osc.type = "sine";
			osc.frequency.setValueAtTime(freq, startTime);
			filter.frequency.value = 3000;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.04, startTime + 0.05);
			gain.gain.setValueAtTime(0.03, startTime + duration * 0.7);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			break;
		}
		case "chiptune": {
			// Classic 8-bit arp
			osc.type = "square";
			osc.frequency.setValueAtTime(freq, startTime);
			filter.frequency.value = 10000;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.05, startTime + 0.002);
			gain.gain.setValueAtTime(0.04, startTime + duration * 0.8);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			break;
		}
		case "midi": {
			// Thin, dry
			osc.type = "triangle";
			osc.frequency.setValueAtTime(freq, startTime);
			filter.frequency.value = 6000;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.04, startTime + 0.002);
			gain.gain.setValueAtTime(0.03, startTime + duration * 0.9);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			break;
		}
		case "happycore": {
			// Bright, energetic
			osc.type = "square";
			osc.frequency.setValueAtTime(freq * 1.005, startTime);
			osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.02);
			filter.frequency.value = 8000;
			filter.Q.value = 1;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.05, startTime + 0.003);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			break;
		}
		case "vaporwave": {
			// Dreamy, detuned, slow
			osc.type = "triangle";
			osc.frequency.setValueAtTime(freq, startTime);
			osc.detune.value = 20;
			filter.frequency.value = 2000;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.04, startTime + 0.04);
			gain.gain.setValueAtTime(0.03, startTime + duration * 0.7);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			break;
		}
		default: {
			// Fallback triangle
			osc.type = "triangle";
			osc.frequency.setValueAtTime(freq, startTime);
			filter.frequency.value = 5000;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.05, startTime + 0.005);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
		}
	}

	osc.connect(filter);
	filter.connect(gain);
	gain.connect(output);
	osc.start(startTime);
	osc.stop(startTime + duration + 0.1);
}

/** Trigger sidechain ducking for that pumping EDM feel. Called by kick drum. */
function triggerSidechain(
	sidechain: GainNode | null,
	startTime: number,
	intensity = 0.7,
) {
	if (!sidechain) return;

	// Quick duck down, slower release for that pumping feel
	sidechain.gain.cancelScheduledValues(startTime);
	sidechain.gain.setValueAtTime(1, startTime);
	sidechain.gain.linearRampToValueAtTime(1 - intensity, startTime + 0.01);
	sidechain.gain.linearRampToValueAtTime(1, startTime + 0.15);
}

/** Play synthesized drum sound with genre-specific character. */
export function playDrum(
	synth: SynthContext,
	type: string,
	startTime: number,
	velocity = 1,
	pitch: number | null = null,
) {
	const c = synth.ctx;
	const output = synth.output;

	if (type === "kick") {
		const osc = c.createOscillator();
		const gain = c.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(150, startTime);
		osc.frequency.exponentialRampToValueAtTime(30, startTime + 0.1);
		gain.gain.setValueAtTime(0.5 * velocity, startTime);
		gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
		osc.connect(gain);
		gain.connect(output);
		osc.start(startTime);
		osc.stop(startTime + 0.25);

		// Trigger sidechain pump - stronger for EDM genres
		const pumpIntensity =
			synth.song.genre.name === "techno" || synth.song.genre.name === "trance"
				? 0.5
				: 0.3;
		triggerSidechain(synth.sidechain, startTime, pumpIntensity * velocity);
	} else if (type === "snare") {
		// Body
		const osc = c.createOscillator();
		const oscGain = c.createGain();
		osc.type = "triangle";
		osc.frequency.setValueAtTime(180, startTime);
		osc.frequency.exponentialRampToValueAtTime(100, startTime + 0.05);
		oscGain.gain.setValueAtTime(0.2 * velocity, startTime);
		oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
		osc.connect(oscGain);
		oscGain.connect(output);
		osc.start(startTime);
		osc.stop(startTime + 0.1);

		// Noise
		const bufferSize = c.sampleRate * 0.15;
		const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}
		const noise = c.createBufferSource();
		noise.buffer = buffer;
		const noiseGain = c.createGain();
		const filter = c.createBiquadFilter();
		filter.type = "highpass";
		filter.frequency.value = 1500;
		noiseGain.gain.setValueAtTime(0.25 * velocity, startTime);
		noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
		noise.connect(filter);
		filter.connect(noiseGain);
		noiseGain.connect(output);
		noise.start(startTime);
		noise.stop(startTime + 0.15);
	} else if (type === "hihat" || type === "hihatOpen") {
		const isOpen = type === "hihatOpen";
		const duration = isOpen ? 0.2 : 0.05;
		const bufferSize = c.sampleRate * duration;
		const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}
		const noise = c.createBufferSource();
		noise.buffer = buffer;
		const noiseGain = c.createGain();
		const filter = c.createBiquadFilter();
		filter.type = "highpass";
		filter.frequency.value = isOpen ? 7000 : 9000;
		noiseGain.gain.setValueAtTime(0.08 * velocity, startTime);
		noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
		noise.connect(filter);
		filter.connect(noiseGain);
		noiseGain.connect(output);
		noise.start(startTime);
		noise.stop(startTime + duration);
	} else if (type === "tom") {
		const freq = pitch || 150;
		const osc = c.createOscillator();
		const gain = c.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(freq, startTime);
		osc.frequency.exponentialRampToValueAtTime(freq * 0.5, startTime + 0.15);
		gain.gain.setValueAtTime(0.3 * velocity, startTime);
		gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
		osc.connect(gain);
		gain.connect(output);
		osc.start(startTime);
		osc.stop(startTime + 0.2);
	} else if (type === "crash") {
		const bufferSize = c.sampleRate * 0.8;
		const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}
		const noise = c.createBufferSource();
		noise.buffer = buffer;
		const noiseGain = c.createGain();
		const filter = c.createBiquadFilter();
		filter.type = "highpass";
		filter.frequency.value = 5000;
		noiseGain.gain.setValueAtTime(0.15, startTime);
		noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
		noise.connect(filter);
		filter.connect(noiseGain);
		noiseGain.connect(output);
		noise.start(startTime);
		noise.stop(startTime + 0.8);
	} else if (type === "cowbell") {
		// Classic 808-style cowbell - two detuned square waves
		const osc1 = c.createOscillator();
		const osc2 = c.createOscillator();
		const gain = c.createGain();
		const filter = c.createBiquadFilter();

		osc1.type = "square";
		osc2.type = "square";
		osc1.frequency.setValueAtTime(800, startTime);
		osc2.frequency.setValueAtTime(540, startTime);

		filter.type = "bandpass";
		filter.frequency.value = 800;
		filter.Q.value = 3;

		gain.gain.setValueAtTime(0.3 * velocity, startTime);
		gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

		osc1.connect(filter);
		osc2.connect(filter);
		filter.connect(gain);
		gain.connect(output);

		osc1.start(startTime);
		osc2.start(startTime);
		osc1.stop(startTime + 0.08);
		osc2.stop(startTime + 0.08);
	} else if (type === "clap") {
		// Layered noise bursts for clap
		const numLayers = 4;
		for (let layer = 0; layer < numLayers; layer++) {
			const delay = layer * 0.01; // Slight delay between layers
			const bufferSize = c.sampleRate * 0.1;
			const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
			const data = buffer.getChannelData(0);
			for (let i = 0; i < bufferSize; i++) {
				data[i] = Math.random() * 2 - 1;
			}
			const noise = c.createBufferSource();
			noise.buffer = buffer;
			const noiseGain = c.createGain();
			const filter = c.createBiquadFilter();
			filter.type = "bandpass";
			filter.frequency.value = 1500 + Math.random() * 500;
			filter.Q.value = 1;

			const layerVol = (0.15 * velocity) / numLayers;
			noiseGain.gain.setValueAtTime(layerVol, startTime + delay);
			noiseGain.gain.exponentialRampToValueAtTime(
				0.001,
				startTime + delay + 0.08,
			);

			noise.connect(filter);
			filter.connect(noiseGain);
			noiseGain.connect(output);
			noise.start(startTime + delay);
			noise.stop(startTime + delay + 0.1);
		}
	} else if (type === "ride") {
		// Ride cymbal - longer sustain, lower pitch than hihat, some resonance
		const duration = 0.4;
		const bufferSize = c.sampleRate * duration;
		const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}
		const noise = c.createBufferSource();
		noise.buffer = buffer;
		const noiseGain = c.createGain();
		const filter = c.createBiquadFilter();
		filter.type = "bandpass";
		filter.frequency.value = 5000;
		filter.Q.value = 2; // Some resonance for that metallic ping
		noiseGain.gain.setValueAtTime(0.06 * velocity, startTime);
		noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
		noise.connect(filter);
		filter.connect(noiseGain);
		noiseGain.connect(output);
		noise.start(startTime);
		noise.stop(startTime + duration);
	} else if (type === "rimshot") {
		// Rimshot - short, tight, high-pitched click
		const osc = c.createOscillator();
		const gain = c.createGain();
		osc.type = "triangle";
		osc.frequency.setValueAtTime(1800, startTime);
		osc.frequency.exponentialRampToValueAtTime(800, startTime + 0.01);
		gain.gain.setValueAtTime(0.3 * velocity, startTime);
		gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03);
		osc.connect(gain);
		gain.connect(output);
		osc.start(startTime);
		osc.stop(startTime + 0.03);

		// Add a click transient
		const click = c.createOscillator();
		const clickGain = c.createGain();
		click.type = "square";
		click.frequency.value = 2000;
		clickGain.gain.setValueAtTime(0.15 * velocity, startTime);
		clickGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.005);
		click.connect(clickGain);
		clickGain.connect(output);
		click.start(startTime);
		click.stop(startTime + 0.005);
	} else if (type === "shaker") {
		// Shaker - very short burst of filtered noise
		const duration = 0.04;
		const bufferSize = c.sampleRate * duration;
		const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}
		const noise = c.createBufferSource();
		noise.buffer = buffer;
		const noiseGain = c.createGain();
		const filter = c.createBiquadFilter();
		filter.type = "bandpass";
		filter.frequency.value = 8000;
		filter.Q.value = 1;
		noiseGain.gain.setValueAtTime(0.05 * velocity, startTime);
		noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
		noise.connect(filter);
		filter.connect(noiseGain);
		noiseGain.connect(output);
		noise.start(startTime);
		noise.stop(startTime + duration);
	} else if (type === "conga" || type === "bongo") {
		// Conga/Bongo - pitched drum with quick decay
		const freq = type === "conga" ? pitch || 200 : pitch || 350;
		const osc = c.createOscillator();
		const gain = c.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(freq * 1.5, startTime);
		osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.02);
		gain.gain.setValueAtTime(0.25 * velocity, startTime);
		gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
		osc.connect(gain);
		gain.connect(output);
		osc.start(startTime);
		osc.stop(startTime + 0.12);

		// Add slap transient
		const slap = c.createOscillator();
		const slapGain = c.createGain();
		slap.type = "triangle";
		slap.frequency.value = freq * 3;
		slapGain.gain.setValueAtTime(0.1 * velocity, startTime);
		slapGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.015);
		slap.connect(slapGain);
		slapGain.connect(output);
		slap.start(startTime);
		slap.stop(startTime + 0.015);
	} else if (type === "sub808") {
		// 808 Sub - deep sine wave kick with longer tail
		const osc = c.createOscillator();
		const gain = c.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(60, startTime);
		osc.frequency.exponentialRampToValueAtTime(35, startTime + 0.15);
		gain.gain.setValueAtTime(0.6 * velocity, startTime);
		gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
		osc.connect(gain);
		gain.connect(output);
		osc.start(startTime);
		osc.stop(startTime + 0.5);

		// Trigger sidechain with longer release for that pumping feel
		triggerSidechain(synth.sidechain, startTime, 0.6 * velocity);
	}
}

/** Play FX sounds (risers, impacts, sweeps) for transitions and builds. */
export function playFX(
	synth: SynthContext,
	type: FXType,
	startTime: number,
	duration: number,
	intensity = 0.7,
) {
	const c = synth.ctx;
	const output = synth.output;

	switch (type) {
		case "riser": {
			// White noise with rising filter sweep - builds tension before drops
			const bufferSize = Math.ceil(c.sampleRate * duration);
			const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
			const data = buffer.getChannelData(0);
			for (let i = 0; i < bufferSize; i++) {
				data[i] = (Math.random() * 2 - 1) * 0.8;
			}

			const noise = c.createBufferSource();
			noise.buffer = buffer;

			const filter = c.createBiquadFilter();
			filter.type = "bandpass";
			filter.Q.value = 2 + intensity * 3;
			// Sweep from low to high
			filter.frequency.setValueAtTime(200, startTime);
			filter.frequency.exponentialRampToValueAtTime(
				4000 + intensity * 8000,
				startTime + duration,
			);

			const gain = c.createGain();
			// Crescendo: start quiet, get louder
			gain.gain.setValueAtTime(0.01, startTime);
			gain.gain.exponentialRampToValueAtTime(
				0.15 * intensity,
				startTime + duration * 0.9,
			);
			gain.gain.linearRampToValueAtTime(0.001, startTime + duration);

			noise.connect(filter);
			filter.connect(gain);
			gain.connect(output);
			noise.start(startTime);
			noise.stop(startTime + duration);
			break;
		}

		case "downlifter": {
			// Descending sweep after a drop - releases tension
			const bufferSize = Math.ceil(c.sampleRate * duration);
			const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
			const data = buffer.getChannelData(0);
			for (let i = 0; i < bufferSize; i++) {
				data[i] = (Math.random() * 2 - 1) * 0.7;
			}

			const noise = c.createBufferSource();
			noise.buffer = buffer;

			const filter = c.createBiquadFilter();
			filter.type = "lowpass";
			filter.Q.value = 1 + intensity * 2;
			// Sweep from high to low
			filter.frequency.setValueAtTime(8000 + intensity * 6000, startTime);
			filter.frequency.exponentialRampToValueAtTime(100, startTime + duration);

			const gain = c.createGain();
			// Start loud, fade out
			gain.gain.setValueAtTime(0.12 * intensity, startTime);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

			noise.connect(filter);
			filter.connect(gain);
			gain.connect(output);
			noise.start(startTime);
			noise.stop(startTime + duration);
			break;
		}

		case "impact": {
			// Big hit on downbeat - layered low thump + noise burst
			// Low thump (sub-bass hit)
			const osc = c.createOscillator();
			const oscGain = c.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(80, startTime);
			osc.frequency.exponentialRampToValueAtTime(30, startTime + 0.2);
			oscGain.gain.setValueAtTime(0.4 * intensity, startTime);
			oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
			osc.connect(oscGain);
			oscGain.connect(output);
			osc.start(startTime);
			osc.stop(startTime + 0.5);

			// Noise burst (high-end transient)
			const noiseBuffer = c.createBuffer(1, c.sampleRate * 0.15, c.sampleRate);
			const noiseData = noiseBuffer.getChannelData(0);
			for (let i = 0; i < noiseData.length; i++) {
				noiseData[i] =
					(Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.03));
			}

			const noise = c.createBufferSource();
			noise.buffer = noiseBuffer;
			const noiseFilter = c.createBiquadFilter();
			noiseFilter.type = "highpass";
			noiseFilter.frequency.value = 2000;
			const noiseGain = c.createGain();
			noiseGain.gain.setValueAtTime(0.2 * intensity, startTime);
			noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

			noise.connect(noiseFilter);
			noiseFilter.connect(noiseGain);
			noiseGain.connect(output);
			noise.start(startTime);
			noise.stop(startTime + 0.15);

			// Trigger hard sidechain duck for that pumping impact
			triggerSidechain(synth.sidechain, startTime, 0.8 * intensity);
			break;
		}

		case "reverseCymbal": {
			// Reversed cymbal swell - classic tension builder
			const bufferSize = Math.ceil(c.sampleRate * duration);
			const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
			const data = buffer.getChannelData(0);
			for (let i = 0; i < bufferSize; i++) {
				// Noise with reversed envelope built into the samples
				const env = (i / bufferSize) ** 2; // Quadratic fade in
				data[i] = (Math.random() * 2 - 1) * env;
			}

			const noise = c.createBufferSource();
			noise.buffer = buffer;

			const filter = c.createBiquadFilter();
			filter.type = "highpass";
			filter.frequency.setValueAtTime(3000, startTime);
			filter.frequency.linearRampToValueAtTime(6000, startTime + duration);
			filter.Q.value = 0.5;

			const gain = c.createGain();
			gain.gain.setValueAtTime(0.001, startTime);
			gain.gain.exponentialRampToValueAtTime(
				0.18 * intensity,
				startTime + duration * 0.95,
			);
			gain.gain.linearRampToValueAtTime(0.001, startTime + duration);

			noise.connect(filter);
			filter.connect(gain);
			gain.connect(output);
			noise.start(startTime);
			noise.stop(startTime + duration);
			break;
		}

		case "sweep": {
			// Pure filter sweep on oscillator - wooshy transition sound
			const osc = c.createOscillator();
			const osc2 = c.createOscillator();
			osc.type = "sawtooth";
			osc2.type = "sawtooth";
			osc.frequency.value = 80;
			osc2.frequency.value = 80.5; // Slight detune for thickness

			const filter = c.createBiquadFilter();
			filter.type = "bandpass";
			filter.Q.value = 8 + intensity * 6;
			// Sweep up then down
			const midTime = startTime + duration / 2;
			filter.frequency.setValueAtTime(200, startTime);
			filter.frequency.exponentialRampToValueAtTime(
				2000 + intensity * 4000,
				midTime,
			);
			filter.frequency.exponentialRampToValueAtTime(200, startTime + duration);

			const gain = c.createGain();
			gain.gain.setValueAtTime(0.001, startTime);
			gain.gain.linearRampToValueAtTime(
				0.08 * intensity,
				startTime + duration * 0.3,
			);
			gain.gain.setValueAtTime(0.08 * intensity, startTime + duration * 0.7);
			gain.gain.linearRampToValueAtTime(0.001, startTime + duration);

			osc.connect(filter);
			osc2.connect(filter);
			filter.connect(gain);
			gain.connect(output);
			osc.start(startTime);
			osc2.start(startTime);
			osc.stop(startTime + duration + 0.1);
			osc2.stop(startTime + duration + 0.1);
			break;
		}
	}
}
