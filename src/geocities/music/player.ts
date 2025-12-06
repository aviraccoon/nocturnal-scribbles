import { musicEvents } from "./events";
import * as musicGen from "./generator";
import { getNextUp } from "./generator";
import { randomizeDJVoice, setLyricsCallback } from "./lyrics";
import { saveSongAsMIDI } from "./midi";
import { isInTransition, toggleAutomix } from "./mixer";
import { getCurrentStation, setCurrentStation } from "./radio";
import { stations } from "./radio-data";
import { saveSongAsWAV } from "./recorder";
import type { TransitionStyle } from "./types";

const T = window.ThemeUtils;

type PlayerMode = "tape" | "radio";

/**
 * Add the music player widget.
 * @param statusBarOffsets - Offsets for status bars {top, bottom, left, right}
 */
export function addMusicPlayer(
	statusBarOffsets = { top: 0, bottom: 0, left: 0, right: 0 },
) {
	// 40% chance of showing player
	if (Math.random() > 0.4) return;

	const player = document.createElement("div");
	player.className = "geocities-music-player tape-mode";

	// Start in tape mode (page-reactive, no DJ)
	let currentMode: PlayerMode = "tape";
	let currentTapeSide = musicGen.getTapeSide();
	musicGen.setPlayerMode("tape");

	// Pre-select a station for when user switches to radio mode
	let currentStationIndex = Math.floor(Math.random() * stations.length);

	player.innerHTML = `
			<div class="player-titlebar">
				<span class="player-title">SIDE ${currentTapeSide}</span>
				<span class="player-station-freq"></span>
				<span class="player-minimize">_</span>
			</div>
			<div class="player-display">
				<div class="player-track-name">Click PLAY to start</div>
				<div class="player-info">
					<span class="player-key">--</span>
					<span class="player-scale">----</span>
					<span class="player-tempo">--- BPM</span>
				</div>
				<div class="player-info player-info-secondary">
					<span class="player-genre">----</span>
					<span class="player-structure">----</span>
					<span class="player-section">----</span>
				</div>
				<div class="player-lyrics">
					<marquee class="player-lyrics-text" scrollamount="2">Page-reactive mixtape - Side ${currentTapeSide}</marquee>
				</div>
				<div class="player-next-up">
					<span class="player-next-up-label">Next:</span>
					<span class="player-next-up-value">--</span>
				</div>
				<div class="player-visualizer"></div>
			</div>
			<div class="player-seek">
				<span class="player-time player-time-current">0:00</span>
				<input type="range" class="player-seek-slider" min="0" max="100" value="0">
				<span class="player-time player-time-total">0:00</span>
			</div>
			<div class="player-controls">
				<button class="player-btn" data-action="prev" title="Previous">|◀</button>
				<button class="player-btn player-btn-play" data-action="play" title="Play (Space)">▶</button>
				<button class="player-btn" data-action="stop" title="Stop">■</button>
				<button class="player-btn" data-action="next" title="Next (N)">▶|</button>
			</div>
			<div class="player-controls player-controls-secondary">
				<button class="player-btn player-btn-tape active" data-action="tape" title="Tape Mode - Click to flip (T)">📼 A</button>
				<button class="player-btn player-btn-radio" data-action="radio" title="Radio Mode (R)">📻</button>
				<button class="player-btn player-btn-loop" data-action="loop" title="Loop (L)">🔁</button>
				<button class="player-btn player-btn-lock" data-action="lock" title="Lock Genre (G)">🔓</button>
				<button class="player-btn player-btn-automix active" data-action="automix" title="Automix (A)">MIX</button>
			</div>
			<div class="player-controls player-controls-tertiary">
				<button class="player-btn player-btn-save" data-action="save" title="Save WAV">💾</button>
				<button class="player-btn player-btn-midi" data-action="midi" title="Save MIDI">🎹</button>
				<button class="player-btn player-btn-info" data-action="info" title="Song Info (I)">ℹ️</button>
				<button class="player-btn player-btn-mixer" data-action="mixer" title="Mixer (M)">🎚️</button>
				<button class="player-btn player-btn-stations" data-action="stations" title="Station List (S)">📡</button>
			</div>
			<div class="player-info-panel" style="display: none;">
				<div class="player-info-row">
					<span class="player-info-label">Drums:</span>
					<span class="player-info-value player-drum-pattern">--</span>
				</div>
				<div class="player-info-row">
					<span class="player-info-label">Bass:</span>
					<span class="player-info-value player-bass-pattern">--</span>
				</div>
				<div class="player-info-row">
					<span class="player-info-label">Melody:</span>
					<span class="player-info-value player-melody-pattern">--</span>
				</div>
				<div class="player-info-row">
					<span class="player-info-label">Arp:</span>
					<span class="player-info-value player-arp-pattern">--</span>
				</div>
				<div class="player-info-row">
					<span class="player-info-label">Rhythm:</span>
					<span class="player-info-value player-rhythm-variation">--</span>
				</div>
				<div class="player-info-row">
					<span class="player-info-label">Energy:</span>
					<span class="player-info-value player-energy">--</span>
				</div>
				<div class="player-info-row">
					<span class="player-info-label">Tracks:</span>
					<span class="player-info-value player-active-tracks">--</span>
				</div>
				<div class="player-info-row">
					<span class="player-info-label">Chords:</span>
					<span class="player-info-value player-progression">--</span>
				</div>
				<div class="player-info-row">
					<span class="player-info-label">Transitions:</span>
					<span class="player-info-value player-transitions">--</span>
				</div>
			</div>
			<div class="player-mixer" style="display: none;">
				<div class="player-mixer-row">
					<label><input type="checkbox" data-track="melody" checked> Melody</label>
					<label><input type="checkbox" data-track="bass" checked> Bass</label>
					<label><input type="checkbox" data-track="drums" checked> Drums</label>
				</div>
				<div class="player-mixer-row">
					<label><input type="checkbox" data-track="arpeggio" checked> Arp</label>
					<label><input type="checkbox" data-track="pad" checked> Pad</label>
				</div>
				<div class="player-chaos">
					<span class="player-chaos-label">CHAOS</span>
					<input type="range" class="player-chaos-slider" min="0" max="100" value="50" title="Chaos - detuning, timing variation, filter wobble, genre variety">
				</div>
			</div>
			<div class="player-station-list" style="display: none;">
				${[...stations]
					.map((s, i) => ({ station: s, index: i }))
					.sort((a, b) => {
						// Parse frequency as number, non-numeric goes to end
						const freqA = Number.parseFloat(a.station.frequency) || 999;
						const freqB = Number.parseFloat(b.station.frequency) || 999;
						return freqA - freqB;
					})
					.map(
						({ station: s, index: i }) => `
					<div class="player-station-item${i === currentStationIndex ? " active" : ""}" data-station-index="${i}">
						<div class="player-station-header">
							<span class="player-station-indicator" style="background: ${s.color}"></span>
							<span class="player-station-name">${s.name}</span>
							<span class="player-station-freq">${s.frequency}</span>
						</div>
						<div class="player-station-tagline">${s.tagline}</div>
						<div class="player-station-genres">${s.preferredGenres.join(" / ")}</div>
					</div>
				`,
					)
					.join("")}
			</div>
			<div class="player-volume">
				<span class="player-volume-label">VOL</span>
				<input type="range" class="player-volume-slider" min="0" max="100" value="40">
			</div>
		`;

	const horizontal = T.pick(["left", "right"]);
	const vertical = T.pick(["top", "bottom"]);
	player.style.cssText = `
			position: fixed;
			${vertical}: ${statusBarOffsets[vertical] + T.rand(60, 150)}px;
			${horizontal}: ${statusBarOffsets[horizontal] + T.rand(10, 40)}px;
			z-index: 10000;
			width: 200px;
			font-family: "MS Sans Serif", "Segoe UI", Tahoma, sans-serif;
			font-size: 11px;
			background: linear-gradient(to bottom, #3a3a4a, #2a2a3a);
			border: 2px outset #5a5a6a;
			color: #0f0;
			user-select: none;
		`;

	const style = document.createElement("style");
	style.textContent = `
			.geocities-music-player .player-titlebar {
				background: linear-gradient(to right, #000080, #1084d0);
				color: #fff;
				padding: 2px 4px;
				font-weight: bold;
				font-size: 10px;
				display: flex;
				justify-content: space-between;
				align-items: center;
				cursor: grab;
			}
			.geocities-music-player .player-title {
				flex: 1;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
			.geocities-music-player .player-station-freq {
				font-size: 8px;
				opacity: 0.8;
				margin: 0 4px;
			}
			.geocities-music-player .player-minimize {
				cursor: pointer;
				padding: 0 4px;
			}
			.geocities-music-player .player-display {
				background: #000;
				margin: 4px;
				padding: 4px;
				border: 1px inset #333;
			}
			.geocities-music-player .player-track-name {
				color: #0f0;
				font-size: 10px;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				margin-bottom: 2px;
			}
			.geocities-music-player .player-info {
				display: flex;
				gap: 8px;
				font-size: 9px;
				color: #0a0;
			}
			.geocities-music-player .player-info-secondary {
				color: #0a8;
				margin-top: 2px;
			}
			.geocities-music-player .player-visualizer {
				height: 20px;
				margin-top: 4px;
				display: flex;
				align-items: flex-end;
				gap: 1px;
			}
			.geocities-music-player .player-visualizer-bar {
				flex: 1;
				min-width: 3px;
				background: linear-gradient(to top, #0f0, #ff0);
				transition: height 0.05s ease-out;
			}
			.geocities-music-player .player-controls {
				display: flex;
				justify-content: center;
				gap: 2px;
				padding: 4px;
			}
			.geocities-music-player .player-btn {
				width: 28px;
				height: 20px;
				font-size: 10px;
				border: 2px outset #666;
				background: linear-gradient(to bottom, #4a4a4a, #3a3a3a);
				color: #ddd;
				cursor: pointer;
				padding: 0;
			}
			.geocities-music-player .player-btn:hover {
				background: linear-gradient(to bottom, #5a5a5a, #4a4a4a);
			}
			.geocities-music-player .player-btn:active {
				border-style: inset;
			}
			.geocities-music-player .player-btn-play.playing {
				background: linear-gradient(to bottom, #4a6a4a, #3a5a3a);
				color: #0f0;
			}
			.geocities-music-player .player-btn-save {
				font-size: 9px;
			}
			.geocities-music-player .player-btn-save.saving {
				background: linear-gradient(to bottom, #6a6a4a, #5a5a3a);
				color: #ff0;
			}
			.geocities-music-player .player-controls-secondary,
			.geocities-music-player .player-controls-tertiary {
				padding-top: 0;
			}
			.geocities-music-player .player-btn-loop,
			.geocities-music-player .player-btn-lock,
			.geocities-music-player .player-btn-station {
				font-size: 9px;
			}
			.geocities-music-player .player-btn-loop.active,
			.geocities-music-player .player-btn-lock.active,
			.geocities-music-player .player-btn-mixer.active,
			.geocities-music-player .player-btn-automix.active {
				background: linear-gradient(to bottom, #4a4a6a, #3a3a5a);
				color: #88f;
				border-style: inset;
			}
			.geocities-music-player .player-btn-automix.mixing {
				background: linear-gradient(to bottom, #6a4a6a, #5a3a5a);
				color: #f8f;
				animation: mix-pulse 0.5s ease-in-out infinite;
			}
			@keyframes mix-pulse {
				0%, 100% { opacity: 1; }
				50% { opacity: 0.6; }
			}
			.geocities-music-player .player-btn-tape.active {
				background: linear-gradient(to bottom, #5a4a3a, #4a3a2a);
				color: #fa0;
				border-style: inset;
			}
			.geocities-music-player .player-btn-radio.active {
				background: linear-gradient(to bottom, #3a4a5a, #2a3a4a);
				color: #0af;
				border-style: inset;
			}
			.geocities-music-player .player-btn-tape,
			.geocities-music-player .player-btn-radio {
				font-size: 9px;
				min-width: 32px;
			}
			.geocities-music-player.tape-mode .player-titlebar {
				background: linear-gradient(to right, #4a3520, #7a5230);
			}
			.geocities-music-player.radio-mode .player-titlebar {
				background: linear-gradient(to right, #000080, #1084d0);
			}
			.geocities-music-player .player-btn-midi,
			.geocities-music-player .player-btn-mixer,
			.geocities-music-player .player-btn-info {
				font-size: 9px;
			}
			.geocities-music-player .player-btn-info.active {
				background: linear-gradient(to bottom, #3a5a4a, #2a4a3a);
				color: #0f8;
				border-style: inset;
			}
			.geocities-music-player .player-info-panel {
				padding: 4px 8px;
				border-top: 1px solid #444;
				background: #1a1a2a;
			}
			.geocities-music-player .player-info-row {
				display: flex;
				justify-content: space-between;
				font-size: 8px;
				margin-bottom: 2px;
			}
			.geocities-music-player .player-info-label {
				color: #888;
			}
			.geocities-music-player .player-info-value {
				color: #0f8;
				font-family: monospace;
			}
			.geocities-music-player .player-lyrics {
				background: #000;
				border: 1px inset #333;
				margin-top: 3px;
				padding: 2px;
				overflow: hidden;
			}
			.geocities-music-player .player-lyrics-text {
				color: #0ff;
				font-size: 9px;
				white-space: nowrap;
			}
			.geocities-music-player .player-next-up {
				display: flex;
				flex-wrap: wrap;
				gap: 2px 4px;
				font-size: 8px;
				margin-top: 3px;
				padding: 2px 0;
				border-top: 1px dotted #333;
			}
			.geocities-music-player .player-next-up-label {
				color: #666;
				flex-shrink: 0;
			}
			.geocities-music-player .player-next-up-value {
				color: #0a8;
				word-break: break-word;
			}
			.geocities-music-player .player-mixer {
				padding: 4px 8px;
				border-top: 1px solid #444;
			}
			.geocities-music-player .player-mixer-row {
				display: flex;
				gap: 6px;
				font-size: 8px;
				color: #aaa;
				margin-bottom: 3px;
			}
			.geocities-music-player .player-mixer-row label {
				display: flex;
				align-items: center;
				gap: 2px;
				cursor: pointer;
			}
			.geocities-music-player .player-mixer-row input[type="checkbox"] {
				width: 10px;
				height: 10px;
				cursor: pointer;
			}
			.geocities-music-player .player-chaos {
				display: flex;
				align-items: center;
				gap: 4px;
				margin-top: 4px;
			}
			.geocities-music-player .player-chaos-label {
				font-size: 8px;
				color: #f80;
			}
			.geocities-music-player .player-chaos-slider {
				flex: 1;
				height: 6px;
				-webkit-appearance: none;
				appearance: none;
				background: linear-gradient(to right, #040, #f80, #f00);
				border: 1px inset #444;
				cursor: pointer;
			}
			.geocities-music-player .player-chaos-slider::-webkit-slider-thumb {
				-webkit-appearance: none;
				appearance: none;
				width: 8px;
				height: 12px;
				background: linear-gradient(to bottom, #f80, #a40);
				border: 1px outset #fc0;
				cursor: pointer;
			}
			.geocities-music-player .player-btn-stations.active {
				background: linear-gradient(to bottom, #3a4a5a, #2a3a4a);
				color: #0af;
				border-style: inset;
			}
			.geocities-music-player .player-station-list {
				max-height: 200px;
				overflow-y: auto;
				border-top: 1px solid #444;
				background: #1a1a2a;
			}
			.geocities-music-player .player-station-item {
				padding: 6px 8px;
				cursor: pointer;
				border-bottom: 1px solid #333;
				transition: background 0.1s;
			}
			.geocities-music-player .player-station-item:hover {
				background: #2a2a4a;
			}
			.geocities-music-player .player-station-item.active {
				background: #2a3a4a;
				border-left: 2px solid #0af;
			}
			.geocities-music-player .player-station-header {
				display: flex;
				align-items: center;
				gap: 6px;
				font-size: 10px;
			}
			.geocities-music-player .player-station-indicator {
				width: 8px;
				height: 8px;
				border-radius: 50%;
				flex-shrink: 0;
			}
			.geocities-music-player .player-station-name {
				color: #fff;
				font-weight: bold;
				flex: 1;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
			.geocities-music-player .player-station-item.active .player-station-name {
				color: #0af;
			}
			.geocities-music-player .player-station-freq {
				color: #888;
				font-size: 9px;
				font-family: monospace;
			}
			.geocities-music-player .player-station-tagline {
				color: #0a8;
				font-size: 8px;
				font-style: italic;
				margin-top: 2px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
			.geocities-music-player .player-station-genres {
				color: #666;
				font-size: 7px;
				margin-top: 2px;
				text-transform: uppercase;
			}
			.geocities-music-player .player-volume {
				display: flex;
				align-items: center;
				gap: 4px;
				padding: 0 8px 6px;
				font-size: 9px;
				color: #888;
			}
			.geocities-music-player .player-volume-slider {
				flex: 1;
				height: 8px;
				-webkit-appearance: none;
				appearance: none;
				background: #222;
				border: 1px inset #444;
				cursor: pointer;
			}
			.geocities-music-player .player-volume-slider::-webkit-slider-thumb {
				-webkit-appearance: none;
				appearance: none;
				width: 10px;
				height: 14px;
				background: linear-gradient(to bottom, #666, #444);
				border: 1px outset #888;
				cursor: pointer;
			}
			.geocities-music-player .player-seek {
				display: flex;
				align-items: center;
				gap: 4px;
				padding: 0 8px 4px;
				font-size: 9px;
				color: #0a0;
				font-family: monospace;
			}
			.geocities-music-player .player-time {
				flex-shrink: 0;
				width: 28px;
				text-align: center;
			}
			.geocities-music-player .player-seek-slider {
				flex: 1;
				min-width: 0;
				height: 6px;
				-webkit-appearance: none;
				appearance: none;
				background: #111;
				border: 1px inset #333;
				cursor: pointer;
			}
			.geocities-music-player .player-seek-slider::-webkit-slider-thumb {
				-webkit-appearance: none;
				appearance: none;
				width: 8px;
				height: 12px;
				background: linear-gradient(to bottom, #0f0, #080);
				border: 1px outset #0a0;
				cursor: pointer;
			}
			.geocities-music-player.minimized .player-display,
			.geocities-music-player.minimized .player-seek,
			.geocities-music-player.minimized .player-controls,
			.geocities-music-player.minimized .player-volume {
				display: none;
			}
			.geocities-music-player.minimized {
				width: auto;
			}
		`;
	document.head.appendChild(style);
	document.body.appendChild(player);

	// Create visualizer bars - fewer bars to match FFT bins
	const visualizer = player.querySelector(
		".player-visualizer",
	) as HTMLElement | null;
	if (!visualizer) return;
	const numBars = 16;
	for (let i = 0; i < numBars; i++) {
		const bar = document.createElement("div");
		bar.className = "player-visualizer-bar";
		bar.style.height = "2px";
		visualizer.appendChild(bar);
	}

	const trackNameEl = player.querySelector(".player-track-name");
	const keyEl = player.querySelector(".player-key");
	const scaleEl = player.querySelector(".player-scale");
	const tempoEl = player.querySelector(".player-tempo");
	const genreEl = player.querySelector(".player-genre");
	const structureEl = player.querySelector(".player-structure");
	const sectionEl = player.querySelector(".player-section");
	const nextUpEl = player.querySelector<HTMLElement>(".player-next-up-value");

	// Info panel elements
	const drumPatternEl = player.querySelector(".player-drum-pattern");
	const bassPatternEl = player.querySelector(".player-bass-pattern");
	const melodyPatternEl = player.querySelector(".player-melody-pattern");
	const arpPatternEl = player.querySelector(".player-arp-pattern");
	const rhythmVariationEl = player.querySelector(".player-rhythm-variation");
	const energyEl = player.querySelector(".player-energy");
	const activeTracksEl = player.querySelector(".player-active-tracks");
	const progressionEl = player.querySelector(".player-progression");
	const transitionsEl = player.querySelector(".player-transitions");
	const playBtn = player.querySelector(
		'[data-action="play"]',
	) as HTMLButtonElement | null;
	const volumeSlider = player.querySelector(
		".player-volume-slider",
	) as HTMLInputElement | null;
	const seekSlider = player.querySelector(
		".player-seek-slider",
	) as HTMLInputElement | null;
	const timeCurrentEl = player.querySelector(".player-time-current");
	const timeTotalEl = player.querySelector(".player-time-total");
	const minimizeBtn = player.querySelector(".player-minimize");
	const titlebar = player.querySelector(
		".player-titlebar",
	) as HTMLElement | null;
	const bars = visualizer.querySelectorAll<HTMLElement>(
		".player-visualizer-bar",
	);

	let isSeeking = false;
	let analyserData: Uint8Array | null = null;
	let lastTrackName: string | null = null;
	let lastTransitionState = false;
	let activeTransitionStyle: TransitionStyle | null = null;

	function formatTime(seconds: number) {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	}

	function updateDisplay() {
		const pattern = musicGen.getPattern();
		const song = musicGen.getSong();
		if (pattern) {
			if (trackNameEl) trackNameEl.textContent = pattern.trackName ?? "";
			if (keyEl) keyEl.textContent = pattern.rootNote ?? "";
			if (scaleEl) scaleEl.textContent = pattern.scaleName ?? "";
			if (tempoEl) tempoEl.textContent = `${Math.round(pattern.tempo)} BPM`;
			if (timeTotalEl)
				timeTotalEl.textContent = formatTime(musicGen.getDuration());
		}
		if (song) {
			if (genreEl) genreEl.textContent = song.genre.name;
			if (structureEl) structureEl.textContent = song.structure.name;
			if (progressionEl) {
				// Show progression as roman numerals
				const numerals = ["I", "II", "III", "IV", "V", "VI", "VII"];
				const progStr = song.progression
					.map((p) => numerals[p % 7] ?? p)
					.join("-");
				progressionEl.textContent = progStr;
			}
			if (transitionsEl) {
				// Highlight active transition if one is in progress
				if (activeTransitionStyle) {
					transitionsEl.innerHTML = song.genre.transitions
						.map((t) =>
							t === activeTransitionStyle
								? `<strong style="color: var(--accent-color, #0f0)">${t}</strong>`
								: t,
						)
						.join(", ");
				} else {
					transitionsEl.textContent = song.genre.transitions.join(", ");
				}
			}
		}
		if (playBtn) {
			playBtn.textContent = musicGen.getIsPlaying() ? "❚❚" : "▶";
			playBtn.classList.toggle("playing", musicGen.getIsPlaying());
		}
		// Update next up display
		if (nextUpEl) {
			const nextUp = getNextUp();
			if (nextUp) {
				const text = nextUp.sublabel
					? `${nextUp.label} (${nextUp.sublabel})`
					: nextUp.label;
				nextUpEl.textContent = text;
				nextUpEl.title = text;
			} else {
				nextUpEl.textContent = musicGen.getLoopEnabled() ? "[loop]" : "--";
				nextUpEl.title = "";
			}
		}
	}

	function updateSectionDisplay() {
		const sectionInfo = musicGen.getCurrentSectionInfo();
		if (!sectionInfo) return;

		if (sectionEl) sectionEl.textContent = sectionInfo.type;
		if (drumPatternEl)
			drumPatternEl.textContent = sectionInfo.drumPattern ?? "none";
		if (bassPatternEl)
			bassPatternEl.textContent = sectionInfo.bassPattern ?? "none";
		if (melodyPatternEl)
			melodyPatternEl.textContent = sectionInfo.melodyPattern ?? "none";
		if (arpPatternEl)
			arpPatternEl.textContent = sectionInfo.arpPattern ?? "none";
		if (rhythmVariationEl)
			rhythmVariationEl.textContent = sectionInfo.rhythmVariation;
		if (energyEl)
			energyEl.textContent = `${Math.round(sectionInfo.energy * 100)}%`;
		if (activeTracksEl) {
			const tracks = [];
			if (sectionInfo.activeTracks.melody) tracks.push("M");
			if (sectionInfo.activeTracks.bass) tracks.push("B");
			if (sectionInfo.activeTracks.drums) tracks.push("D");
			if (sectionInfo.activeTracks.arpeggio) tracks.push("A");
			if (sectionInfo.activeTracks.pad) tracks.push("P");
			activeTracksEl.textContent = tracks.join(" ");
		}
	}

	function updateSeekBar() {
		if (!isSeeking && seekSlider && timeCurrentEl) {
			const duration = musicGen.getDuration();
			const position = musicGen.getPosition();
			if (duration > 0) {
				seekSlider.value = String((position / duration) * 100);
				timeCurrentEl.textContent = formatTime(position);
			}
		}
		// Check if song changed (auto-advance)
		const song = musicGen.getSong();
		if (song && song.trackName !== lastTrackName) {
			lastTrackName = song.trackName;
			updateDisplay();
		}
		updateSectionDisplay();
		// Update automix button mixing state (only when changed)
		const transitioning = isInTransition();
		if (transitioning !== lastTransitionState) {
			lastTransitionState = transitioning;
			const automixBtnEl = player.querySelector(".player-btn-automix");
			automixBtnEl?.classList.toggle("mixing", transitioning);
		}
		requestAnimationFrame(updateSeekBar);
	}
	updateSeekBar();

	// Audio-reactive visualizer using AnalyserNode
	function animateVisualizer() {
		if (musicGen.getIsPlaying()) {
			const analyser = musicGen.getAnalyser();
			if (analyser) {
				if (!analyserData) {
					analyserData = new Uint8Array(analyser.frequencyBinCount);
				}
				analyser.getByteFrequencyData(analyserData as Uint8Array<ArrayBuffer>);

				// Map FFT bins to visualizer bars
				const data = analyserData;
				const binsPerBar = Math.floor(data.length / bars.length);
				bars.forEach((bar, i) => {
					let sum = 0;
					for (let j = 0; j < binsPerBar; j++) {
						sum += data[i * binsPerBar + j] ?? 0;
					}
					const avg = sum / binsPerBar;
					const height = Math.max(2, (avg / 255) * 20);
					bar.style.height = `${height}px`;
				});
			}
		} else {
			bars.forEach((bar) => {
				bar.style.height = "2px";
			});
		}
		requestAnimationFrame(animateVisualizer);
	}
	animateVisualizer();

	const saveBtn = player.querySelector(
		'[data-action="save"]',
	) as HTMLButtonElement | null;
	const loopBtn = player.querySelector(
		'[data-action="loop"]',
	) as HTMLButtonElement | null;
	const lockBtn = player.querySelector(
		'[data-action="lock"]',
	) as HTMLButtonElement | null;
	const automixBtn = player.querySelector(
		'[data-action="automix"]',
	) as HTMLButtonElement | null;

	function toggleLoop() {
		const newState = !musicGen.getLoopEnabled();
		musicGen.setLoopEnabled(newState);
		loopBtn?.classList.toggle("active", newState);
	}

	function toggleGenreLock() {
		const song = musicGen.getSong();
		if (musicGen.getLockedGenre()) {
			// Unlock
			musicGen.setLockedGenre(null);
			lockBtn?.classList.remove("active");
			if (lockBtn) lockBtn.textContent = "🔓";
		} else if (song) {
			// Lock to current genre
			musicGen.setLockedGenre(song.genre.name);
			lockBtn?.classList.add("active");
			if (lockBtn) lockBtn.textContent = "🔒";
		}
	}

	function toggleAutomixUI() {
		const newState = toggleAutomix();
		automixBtn?.classList.toggle("active", newState);
		if (automixBtn) {
			automixBtn.title = newState
				? "Automix ON - Smooth transitions (A)"
				: "Automix OFF - Hard cuts (A)";
		}
	}

	const tapeBtn = player.querySelector(
		'[data-action="tape"]',
	) as HTMLButtonElement | null;
	const radioBtn = player.querySelector(
		'[data-action="radio"]',
	) as HTMLButtonElement | null;
	const titleEl = player.querySelector(".player-title");
	const freqEl = player.querySelector(".player-station-freq");

	// Update UI for current mode
	function updateModeUI() {
		const lyricsEl = player.querySelector(".player-lyrics-text");

		if (currentMode === "tape") {
			player.classList.remove("radio-mode");
			player.classList.add("tape-mode");
			tapeBtn?.classList.add("active");
			radioBtn?.classList.remove("active");

			if (titleEl) titleEl.textContent = `SIDE ${currentTapeSide}`;
			if (freqEl) freqEl.textContent = "";
			if (tapeBtn) tapeBtn.textContent = `📼 ${currentTapeSide}`;
			if (lyricsEl)
				lyricsEl.textContent = `Page-reactive mixtape - Side ${currentTapeSide}`;
		} else {
			player.classList.remove("tape-mode");
			player.classList.add("radio-mode");
			tapeBtn?.classList.remove("active");
			radioBtn?.classList.add("active");

			const station = getCurrentStation();
			if (titleEl) titleEl.textContent = station.name;
			if (freqEl) freqEl.textContent = station.frequency;
			if (radioBtn) radioBtn.textContent = "📻";
			if (lyricsEl)
				lyricsEl.textContent = `${station.name} - ${station.tagline}`;
		}
	}

	// Flip the tape (only in tape mode)
	function flipTape() {
		if (currentMode !== "tape") return;

		currentTapeSide = musicGen.flipTape();
		updateModeUI();

		// Generate new track with inverted mood
		const wasPlaying = musicGen.getIsPlaying();
		if (wasPlaying) {
			musicGen.stop(true);
			setTimeout(() => {
				musicGen.generate();
				musicGen.play();
				updateDisplay();
			}, 350);
		} else {
			musicGen.generate();
			updateDisplay();
		}
	}

	// Switch to tape mode
	function switchToTape() {
		if (currentMode === "tape") {
			// Already in tape mode, flip the tape instead
			flipTape();
			return;
		}

		currentMode = "tape";
		musicGen.setPlayerMode("tape");

		// Unlock genre (tape mode uses page analysis)
		musicGen.setLockedGenre(null);
		lockBtn?.classList.remove("active");
		if (lockBtn) lockBtn.textContent = "🔓";

		updateModeUI();

		// Generate new page-reactive track
		const wasPlaying = musicGen.getIsPlaying();
		if (wasPlaying) {
			musicGen.stop(true);
			setTimeout(() => {
				musicGen.generate();
				musicGen.play();
				updateDisplay();
			}, 350);
		} else {
			musicGen.generate();
			updateDisplay();
		}
	}

	// Switch to radio mode or cycle stations
	function switchToRadio() {
		if (currentMode === "radio") {
			// Already in radio mode, cycle to next station
			currentStationIndex = (currentStationIndex + 1) % stations.length;
		}

		currentMode = "radio";
		musicGen.setPlayerMode("radio");

		const newStation = stations[currentStationIndex];
		if (!newStation) return;
		setCurrentStation(newStation);
		randomizeDJVoice();

		// Set station's preferred genres for random selection
		musicGen.setRadioGenres(newStation.preferredGenres);

		updateModeUI();
		updateStationListActive();

		// Flash titlebar with station color
		const titlebar = player.querySelector(".player-titlebar") as HTMLElement;
		if (titlebar) {
			titlebar.style.background = `linear-gradient(to right, ${newStation.color}, #1084d0)`;
			setTimeout(() => {
				if (currentMode === "radio") {
					titlebar.style.background =
						"linear-gradient(to right, #000080, #1084d0)";
				}
			}, 1000);
		}

		// Generate new track in station's style
		const wasPlaying = musicGen.getIsPlaying();
		if (wasPlaying) {
			musicGen.stop(true);
			setTimeout(() => {
				musicGen.generate();
				musicGen.play();
				updateDisplay();
			}, 350);
		} else {
			musicGen.generate();
			updateDisplay();
		}
	}

	function playPause() {
		if (musicGen.getIsPlaying()) {
			musicGen.stop();
		} else {
			musicGen.play();
		}
		updateDisplay();
	}

	function nextTrack() {
		musicGen.stop(true);
		setTimeout(() => {
			musicGen.generate();
			musicGen.play();
			updateDisplay();
		}, 350);
	}

	const mixerPanel = player.querySelector(
		".player-mixer",
	) as HTMLElement | null;
	const mixerBtn = player.querySelector(
		'[data-action="mixer"]',
	) as HTMLButtonElement | null;
	const infoPanel = player.querySelector(
		".player-info-panel",
	) as HTMLElement | null;
	const infoBtn = player.querySelector(
		'[data-action="info"]',
	) as HTMLButtonElement | null;
	const stationListPanel = player.querySelector(
		".player-station-list",
	) as HTMLElement | null;
	const stationsBtn = player.querySelector(
		'[data-action="stations"]',
	) as HTMLButtonElement | null;
	const midiBtn = player.querySelector(
		'[data-action="midi"]',
	) as HTMLButtonElement | null;
	const chaosSlider = player.querySelector(
		".player-chaos-slider",
	) as HTMLInputElement | null;
	let lyricsText = player.querySelector(
		".player-lyrics-text",
	) as HTMLElement | null;

	// Calculate base scroll speed from initial container width (8 worked for 172px → ratio ~21.5)
	const lyricsBaseSpeed = (lyricsText?.offsetWidth ?? 0) / 21.5;

	// Set up lyrics callback with rate-synced marquee speed
	// Clone and replace marquee to reset scroll position on new text
	setLyricsCallback((text, rate) => {
		if (lyricsText) {
			// Adjust marquee speed based on speech rate
			const amplifiedRate = 1 + ((rate ?? 1) - 1) * 2;
			const scrollAmount = Math.max(
				3,
				Math.round(lyricsBaseSpeed * amplifiedRate),
			);

			// Clone marquee to reset scroll position
			const newMarquee = lyricsText.cloneNode(false) as HTMLElement;
			newMarquee.textContent = text;
			newMarquee.setAttribute("scrollamount", String(scrollAmount));
			newMarquee.dataset.speechRate = String(rate ?? "unknown");
			lyricsText.replaceWith(newMarquee);
			lyricsText = newMarquee;
		}
	});

	// Mixer toggle
	function toggleMixer() {
		if (mixerPanel) {
			const isVisible = mixerPanel.style.display !== "none";
			mixerPanel.style.display = isVisible ? "none" : "block";
			mixerBtn?.classList.toggle("active", !isVisible);
		}
	}

	// Info panel toggle
	function toggleInfo() {
		if (infoPanel) {
			const isVisible = infoPanel.style.display !== "none";
			infoPanel.style.display = isVisible ? "none" : "block";
			infoBtn?.classList.toggle("active", !isVisible);
		}
	}

	// Station list toggle
	function toggleStationList() {
		if (stationListPanel) {
			const isVisible = stationListPanel.style.display !== "none";
			stationListPanel.style.display = isVisible ? "none" : "block";
			stationsBtn?.classList.toggle("active", !isVisible);
		}
	}

	// Update active station in list
	function updateStationListActive() {
		if (!stationListPanel) return;
		const items = stationListPanel.querySelectorAll<HTMLElement>(
			".player-station-item",
		);
		items.forEach((item) => {
			const itemIndex = Number(item.dataset.stationIndex);
			item.classList.toggle("active", itemIndex === currentStationIndex);
		});
	}

	// Station item click handler
	function selectStation(index: number) {
		if (index < 0 || index >= stations.length) return;
		currentStationIndex = index;

		// Switch to radio mode if not already
		if (currentMode !== "radio") {
			currentMode = "radio";
			musicGen.setPlayerMode("radio");
		}

		const newStation = stations[currentStationIndex];
		if (!newStation) return;
		setCurrentStation(newStation);
		randomizeDJVoice();
		musicGen.setRadioGenres(newStation.preferredGenres);

		updateModeUI();
		updateStationListActive();

		// Flash titlebar with station color
		const tb = player.querySelector(".player-titlebar") as HTMLElement;
		if (tb) {
			tb.style.background = `linear-gradient(to right, ${newStation.color}, #1084d0)`;
			setTimeout(() => {
				if (currentMode === "radio") {
					tb.style.background = "linear-gradient(to right, #000080, #1084d0)";
				}
			}, 1000);
		}

		// Generate new track
		const wasPlaying = musicGen.getIsPlaying();
		if (wasPlaying) {
			musicGen.stop(true);
			setTimeout(() => {
				musicGen.generate();
				musicGen.play();
				updateDisplay();
			}, 350);
		} else {
			musicGen.generate();
			updateDisplay();
		}
	}

	// Set up station list click handlers
	stationListPanel?.addEventListener("click", (e) => {
		const target = e.target as HTMLElement;
		const item = target.closest(".player-station-item") as HTMLElement | null;
		if (item?.dataset.stationIndex) {
			selectStation(Number(item.dataset.stationIndex));
		}
	});

	// Track mute handlers
	const trackCheckboxes = player.querySelectorAll<HTMLInputElement>(
		'.player-mixer-row input[type="checkbox"]',
	);
	trackCheckboxes.forEach((checkbox) => {
		checkbox.addEventListener("change", () => {
			const track = checkbox.dataset.track as
				| "melody"
				| "bass"
				| "drums"
				| "arpeggio"
				| "pad";
			if (track) {
				musicGen.setTrackMute(track, !checkbox.checked);
			}
		});
	});

	// Chaos slider
	chaosSlider?.addEventListener("input", (e) => {
		const target = e.target as HTMLInputElement;
		musicGen.setChaosLevel(Number(target.value) / 100);
	});

	player.addEventListener("click", async (e) => {
		const target = e.target as HTMLElement | null;
		const action = target?.dataset?.action;
		if (!action) return;

		if (action === "play") {
			playPause();
		} else if (action === "stop") {
			musicGen.stop();
			updateDisplay();
		} else if (action === "next" || action === "prev") {
			nextTrack();
		} else if (action === "loop") {
			toggleLoop();
		} else if (action === "lock") {
			toggleGenreLock();
		} else if (action === "mixer") {
			toggleMixer();
		} else if (action === "info") {
			toggleInfo();
		} else if (action === "stations") {
			toggleStationList();
		} else if (action === "automix") {
			toggleAutomixUI();
		} else if (action === "tape") {
			switchToTape();
		} else if (action === "radio") {
			switchToRadio();
		} else if (action === "midi") {
			const song = musicGen.getSong();
			if (!song) return;
			if (midiBtn) {
				midiBtn.disabled = true;
				midiBtn.textContent = "...";
			}
			try {
				await saveSongAsMIDI(song, (progress, status) => {
					if (midiBtn) {
						const pct = Math.round(progress * 100);
						midiBtn.textContent = `${pct}%`;
						midiBtn.title = status;
					}
				});
			} finally {
				if (midiBtn) {
					midiBtn.disabled = false;
					midiBtn.textContent = "🎹";
					midiBtn.title = "Save MIDI";
				}
			}
		} else if (action === "save") {
			const song = musicGen.getSong();
			if (!song) return;
			if (saveBtn) {
				saveBtn.classList.add("saving");
				saveBtn.disabled = true;
			}
			try {
				await saveSongAsWAV(song, (progress, status) => {
					if (saveBtn) {
						const pct = Math.round(progress * 100);
						saveBtn.textContent = `${pct}%`;
						saveBtn.title = status;
					}
				});
			} finally {
				if (saveBtn) {
					saveBtn.classList.remove("saving");
					saveBtn.disabled = false;
					saveBtn.textContent = "💾";
					saveBtn.title = "Save WAV";
				}
			}
		}
	});

	// Keyboard shortcuts
	document.addEventListener("keydown", (e) => {
		// Don't handle shortcuts if typing in an input
		if (
			e.target instanceof HTMLInputElement ||
			e.target instanceof HTMLTextAreaElement
		) {
			return;
		}

		switch (e.key.toLowerCase()) {
			case " ":
				e.preventDefault();
				playPause();
				break;
			case "n":
				nextTrack();
				break;
			case "l":
				toggleLoop();
				break;
			case "g":
				toggleGenreLock();
				break;
			case "m":
				toggleMixer();
				break;
			case "a":
				toggleAutomixUI();
				break;
			case "i":
				toggleInfo();
				break;
			case "s":
				toggleStationList();
				break;
			case "t":
				switchToTape();
				break;
			case "r":
				switchToRadio();
				break;
			case "arrowleft":
				musicGen.seek(Math.max(0, musicGen.getPosition() - 5));
				break;
			case "arrowright":
				musicGen.seek(
					Math.min(musicGen.getDuration(), musicGen.getPosition() + 5),
				);
				break;
		}
	});

	volumeSlider?.addEventListener("input", (e) => {
		const target = e.target as HTMLInputElement;
		musicGen.setVolume(Number(target.value) / 100);
	});

	seekSlider?.addEventListener("mousedown", () => {
		isSeeking = true;
	});
	seekSlider?.addEventListener("input", (e) => {
		const target = e.target as HTMLInputElement;
		const duration = musicGen.getDuration();
		const seekTime = (Number(target.value) / 100) * duration;
		if (timeCurrentEl) timeCurrentEl.textContent = formatTime(seekTime);
	});
	seekSlider?.addEventListener("change", (e) => {
		const target = e.target as HTMLInputElement;
		const duration = musicGen.getDuration();
		const seekTime = (Number(target.value) / 100) * duration;
		musicGen.seek(seekTime);
		isSeeking = false;
	});

	minimizeBtn?.addEventListener("click", (e) => {
		e.stopPropagation();
		player.classList.toggle("minimized");
	});

	// Make draggable
	let isDragging = false;
	let dragOffsetX = 0;
	let dragOffsetY = 0;

	titlebar?.addEventListener("mousedown", (e) => {
		if (e.target === minimizeBtn) return;
		isDragging = true;
		dragOffsetX = e.clientX - player.offsetLeft;
		dragOffsetY = e.clientY - player.offsetTop;
		if (titlebar) titlebar.style.cursor = "grabbing";
		document.body.style.userSelect = "none";
	});

	document.addEventListener("mousemove", (e) => {
		if (!isDragging) return;
		player.style.left = `${e.clientX - dragOffsetX}px`;
		player.style.top = `${e.clientY - dragOffsetY}px`;
		player.style.right = "auto";
		player.style.bottom = "auto";
	});

	document.addEventListener("mouseup", () => {
		if (isDragging) {
			isDragging = false;
			if (titlebar) titlebar.style.cursor = "grab";
			document.body.style.userSelect = "";
		}
	});

	// Track active transition style for display
	musicEvents.on("transitionStart", (e) => {
		activeTransitionStyle = e.style;
		updateDisplay();
	});

	musicEvents.on("transitionComplete", () => {
		activeTransitionStyle = null;
		updateDisplay();
	});

	// Generate initial track
	musicGen.generate();
	updateDisplay();
}
