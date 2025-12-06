import { STEPS_PER_BAR } from "./data";
import {
	createSynthContext,
	playArp,
	playBass,
	playDrum,
	playFX,
	playNote,
	playPad,
} from "./synths";
import type { Song } from "./types";

const T = window.ThemeUtils;

type ProgressCallback = (progress: number, status: string) => void;

// Yield to main thread to keep UI responsive
function yieldToMain(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

function noteToFreq(note: number) {
	return 261.63 * 2 ** (note / 12);
}

/**
 * Render a song to an audio buffer using OfflineAudioContext.
 * Uses the same synth functions as live playback for identical output.
 */
export async function renderSongToBuffer(
	song: Song,
	onProgress?: ProgressCallback,
): Promise<AudioBuffer> {
	// Full quality: 44100 Hz stereo (CD quality)
	const sampleRate = 44100;
	const numChannels = 2;
	const secondsPerStep = 60 / song.tempo / 4;
	const totalSteps = song.totalBars * STEPS_PER_BAR;
	const duration = totalSteps * secondsPerStep + 1; // +1 for tail

	onProgress?.(0, "Creating audio context...");
	await yieldToMain();

	const ctx = new OfflineAudioContext(
		numChannels,
		sampleRate * duration,
		sampleRate,
	);

	// Create effects chain
	const masterGain = ctx.createGain();
	masterGain.gain.value = 1;

	const effectsGain = ctx.createGain();
	effectsGain.gain.value = 0.5;

	const delayNode = ctx.createDelay(0.5);
	delayNode.delayTime.value = 60 / song.tempo / 2;

	const delayFeedback = ctx.createGain();
	delayFeedback.gain.value = song.delayAmount;

	const filterNode = ctx.createBiquadFilter();
	filterNode.type = "lowpass";
	filterNode.frequency.value = song.filterCutoff;
	filterNode.Q.value = 0.5;

	// Connect effects
	masterGain.connect(filterNode);
	filterNode.connect(effectsGain);
	filterNode.connect(delayNode);
	delayNode.connect(delayFeedback);
	delayFeedback.connect(delayNode);
	delayNode.connect(effectsGain);
	effectsGain.connect(ctx.destination);

	// Create synth context for shared synthesis
	// Note: sidechain is null for offline rendering (no ducking needed)
	const synth = createSynthContext(ctx, masterGain, song, null);

	// Schedule all sections with progress updates
	let currentTime = 0;
	const totalSections = song.structure.sections.length;

	for (let i = 0; i < totalSections; i++) {
		const section = song.structure.sections[i];
		if (!section) continue;

		const pattern = song.patterns.get(section.type);
		if (!pattern) continue;

		onProgress?.(
			0.1 + (i / totalSections) * 0.6,
			`Scheduling ${section.type}...`,
		);
		await yieldToMain();

		const sectionSteps = section.bars * STEPS_PER_BAR;

		// Schedule melody notes with all synth enhancements
		for (const n of pattern.melody) {
			const noteTime = currentTime + n.step * secondsPerStep;
			const noteDuration = n.duration * secondsPerStep;
			playNote(synth, noteToFreq(n.note), noteTime, noteDuration, {
				type: T.pick(song.genre.oscTypes.melody),
				volume: 0.1 * (n.velocity || 1),
				detune: song.detune,
				attack: song.attack,
				vibrato: noteDuration > 0.4,
				portamento: song.portamento,
				wowFlutter: song.wowFlutter,
				pwmDepth: song.pwmDepth,
			});
		}

		// Schedule bass with genre-specific synthesis
		for (const n of pattern.bass) {
			const noteTime = currentTime + n.step * secondsPerStep;
			playBass(
				synth,
				noteToFreq(n.note),
				noteTime,
				n.duration * secondsPerStep,
			);
		}

		// Schedule arpeggios with genre-specific character
		for (const n of pattern.arpeggio) {
			const noteTime = currentTime + n.step * secondsPerStep;
			playArp(synth, noteToFreq(n.note), noteTime, n.duration * secondsPerStep);
		}

		// Schedule pads with genre-specific synthesis
		for (const p of pattern.pad) {
			const noteTime = currentTime + p.step * secondsPerStep;
			playPad(synth, p.notes, noteTime, p.duration * secondsPerStep);
		}

		// Schedule drums with full drum kit
		for (const d of pattern.drums) {
			const noteTime = currentTime + d.step * secondsPerStep;
			playDrum(synth, d.type, noteTime, d.velocity || 1, d.pitch ?? null);
		}

		// Schedule FX (risers, impacts, sweeps)
		for (const f of pattern.fx) {
			const noteTime = currentTime + f.step * secondsPerStep;
			const fxDuration = f.duration * secondsPerStep;
			playFX(synth, f.type, noteTime, fxDuration, f.intensity);
		}

		currentTime += sectionSteps * secondsPerStep;
	}

	onProgress?.(0.75, "Rendering audio...");
	await yieldToMain();

	// Render
	const buffer = await ctx.startRendering();

	onProgress?.(0.95, "Encoding WAV...");
	await yieldToMain();

	return buffer;
}

/**
 * Encode an AudioBuffer to WAV format.
 */
function encodeWAV(buffer: AudioBuffer): Blob {
	const numChannels = buffer.numberOfChannels;
	const sampleRate = buffer.sampleRate;
	const format = 1; // PCM
	const bitDepth = 16;

	const bytesPerSample = bitDepth / 8;
	const blockAlign = numChannels * bytesPerSample;
	const byteRate = sampleRate * blockAlign;
	const dataSize = buffer.length * blockAlign;
	const headerSize = 44;
	const totalSize = headerSize + dataSize;

	const arrayBuffer = new ArrayBuffer(totalSize);
	const view = new DataView(arrayBuffer);

	// Write WAV header
	const writeString = (offset: number, str: string) => {
		for (let i = 0; i < str.length; i++) {
			view.setUint8(offset + i, str.charCodeAt(i));
		}
	};

	writeString(0, "RIFF");
	view.setUint32(4, totalSize - 8, true);
	writeString(8, "WAVE");
	writeString(12, "fmt ");
	view.setUint32(16, 16, true); // fmt chunk size
	view.setUint16(20, format, true);
	view.setUint16(22, numChannels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, bitDepth, true);
	writeString(36, "data");
	view.setUint32(40, dataSize, true);

	// Interleave channels and write samples
	const channels: Float32Array[] = [];
	for (let i = 0; i < numChannels; i++) {
		channels.push(buffer.getChannelData(i));
	}

	let offset = 44;
	for (let i = 0; i < buffer.length; i++) {
		for (let ch = 0; ch < numChannels; ch++) {
			const sample = Math.max(-1, Math.min(1, channels[ch]?.[i] ?? 0));
			const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
			view.setInt16(offset, intSample, true);
			offset += 2;
		}
	}

	return new Blob([arrayBuffer], { type: "audio/wav" });
}

/**
 * Save a song to a WAV file.
 */
export async function saveSongAsWAV(
	song: Song,
	onProgress?: ProgressCallback,
): Promise<void> {
	const buffer = await renderSongToBuffer(song, onProgress);
	const blob = encodeWAV(buffer);

	onProgress?.(1, "Downloading...");
	await yieldToMain();

	// Create download link
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	const safeName = song.trackName.replace(/[^a-zA-Z0-9_-]/g, "_");
	const suffix = `[${song.genre.name}_${song.structure.name.replace(/ /g, "_").toLowerCase()}]`;
	a.download = `${safeName}_${suffix}.wav`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
