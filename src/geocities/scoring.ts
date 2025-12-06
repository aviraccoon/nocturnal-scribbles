import * as audio from "./audio";

const T = window.ThemeUtils;

export type ParticleType = "star" | "falling" | "sparkle" | "raccoon";

/**
 * Scoring system for clickable particles with combo multipliers and session persistence.
 * Tracks page and total scores, plays audio feedback, and displays a draggable counter.
 */
export const scoring = {
	pageScore: 0,
	totalScore: Number(sessionStorage.getItem("geocities-score")) || 0,
	combo: 1,
	lastClickTime: 0,
	comboTimeout: 500, // ms to maintain combo
	maxCombo: 10,
	counterEl: null as HTMLDivElement | null,

	/** Point values by particle type (raccoons override to 25). */
	points: {
		star: 1,
		falling: 5,
		sparkle: 3,
		raccoon: 25,
	} as Record<ParticleType, number>,

	/** Adds points with combo multiplier, plays sound, persists to session, and updates display. */
	addPoints(type: ParticleType, emoji: string) {
		const now = Date.now();
		// Update combo
		if (now - this.lastClickTime < this.comboTimeout) {
			this.combo = Math.min(this.combo + 1, this.maxCombo);
		} else {
			this.combo = 1;
		}
		this.lastClickTime = now;

		// Raccoons are special!
		const isRaccoon = emoji === "🦝";
		const basePoints = isRaccoon ? this.points.raccoon : this.points[type] || 1;
		const earnedPoints = basePoints * this.combo;
		this.pageScore += earnedPoints;
		this.totalScore += earnedPoints;
		sessionStorage.setItem("geocities-score", String(this.totalScore));

		// Play appropriate sound
		if (isRaccoon) {
			audio.raccoon();
		} else if (this.combo > 1) {
			audio.combo(this.combo);
		} else if (type === "sparkle") {
			audio.sparkle();
		} else if (type === "falling") {
			audio.whoosh();
		} else if (type === "star") {
			audio.twinkle();
		} else {
			audio.pop();
		}

		this.updateDisplay();
		return earnedPoints;
	},

	/** Updates the score counter UI with current values and triggers a flash effect. */
	updateDisplay() {
		if (this.counterEl) {
			const comboText = this.combo > 1 ? ` (x${this.combo})` : "";
			const pageScoreEl = this.counterEl.querySelector(".page-score");
			const totalScoreEl = this.counterEl.querySelector(".total-score");
			if (pageScoreEl)
				pageScoreEl.textContent = `This page: ${this.pageScore}${comboText}`;
			if (totalScoreEl) totalScoreEl.textContent = `Total: ${this.totalScore}`;
			// Flash effect
			this.counterEl.style.transform = "scale(1.1)";
			setTimeout(() => {
				if (this.counterEl) {
					this.counterEl.style.transform = "scale(1)";
				}
			}, 100);
		}
	},

	/** Resets total score to zero and clears session storage. */
	resetTotal() {
		this.totalScore = 0;
		sessionStorage.removeItem("geocities-score");
		this.updateDisplay();
	},

	/** Creates and displays a draggable Windows 95-style score counter in the corner. */
	showFloatingCounter() {
		if (this.counterEl) return;

		const counter = document.createElement("div");
		counter.className = "geocities-score-counter";
		counter.innerHTML = `
				<div class="page-score">This page: ${this.pageScore}</div>
				<div class="total-score">Total: ${this.totalScore}</div>
				<button class="reset-btn" title="Reset total score">X</button>
			`;
		counter.style.cssText = `
				position: fixed;
				top: 10px;
				right: 10px;
				font-family: "MS Sans Serif", "Segoe UI", Tahoma, sans-serif;
				font-size: 12px;
				font-weight: bold;
				padding: 5px 10px;
				padding-right: 20px;
				background: linear-gradient(to bottom, #dfdfdf, #c0c0c0);
				border: 2px outset #fff;
				color: #000080;
				z-index: 10001;
				transition: transform 0.1s ease-out;
				cursor: grab;
				user-select: none;
				display: flex;
				flex-direction: column;
				gap: 2px;
			`;
		const resetBtn = counter.querySelector(
			".reset-btn",
		) as HTMLButtonElement | null;
		if (resetBtn) {
			resetBtn.style.cssText = `
					position: absolute;
					top: 2px;
					right: 2px;
					width: 14px;
					height: 14px;
					font-size: 9px;
					font-weight: bold;
					padding: 0;
					border: 1px outset #fff;
					background: #c0c0c0;
					cursor: pointer;
					line-height: 1;
				`;
			resetBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this.resetTotal();
			});
		}

		// Make it draggable (mouse and touch)
		let isDragging = false;
		let dragOffsetX = 0;
		let dragOffsetY = 0;

		function startDrag(clientX: number, clientY: number) {
			isDragging = true;
			dragOffsetX = clientX - counter.offsetLeft;
			dragOffsetY = clientY - counter.offsetTop;
			counter.style.cursor = "grabbing";
			counter.style.transition = "none";
			document.body.style.userSelect = "none";
		}

		function moveDrag(clientX: number, clientY: number) {
			if (!isDragging) return;
			counter.style.left = `${clientX - dragOffsetX}px`;
			counter.style.top = `${clientY - dragOffsetY}px`;
			counter.style.right = "auto";
		}

		function endDrag() {
			if (isDragging) {
				isDragging = false;
				counter.style.cursor = "grab";
				counter.style.transition = "transform 0.1s ease-out";
				document.body.style.userSelect = "";
			}
		}

		// Mouse events
		counter.addEventListener("mousedown", (e) => {
			if (e.target === resetBtn) return;
			startDrag(e.clientX, e.clientY);
		});
		document.addEventListener("mousemove", (e) =>
			moveDrag(e.clientX, e.clientY),
		);
		document.addEventListener("mouseup", endDrag);

		// Touch events
		counter.addEventListener(
			"touchstart",
			(e) => {
				if (e.target === resetBtn) return;
				const touch = e.touches[0];
				if (touch) {
					e.preventDefault();
					startDrag(touch.clientX, touch.clientY);
				}
			},
			{ passive: false },
		);
		document.addEventListener(
			"touchmove",
			(e) => {
				const touch = e.touches[0];
				if (touch && isDragging) {
					e.preventDefault();
					moveDrag(touch.clientX, touch.clientY);
				}
			},
			{ passive: false },
		);
		document.addEventListener("touchend", endDrag);
		document.addEventListener("touchcancel", endDrag);

		this.counterEl = counter;
		document.body.appendChild(counter);
	},

	/** Shows an animated floating "+points" indicator at the given position. */
	createPopEffect(x: number, y: number, points: number, combo: number) {
		const pop = document.createElement("div");
		pop.textContent = combo > 1 ? `+${points} x${combo}!` : `+${points}`;
		pop.style.cssText = `
				position: fixed;
				left: ${x}px;
				top: ${y}px;
				font-family: "Impact", sans-serif;
				font-size: ${16 + combo * 2}px;
				font-weight: bold;
				color: ${T.randomColor()};
				text-shadow: 1px 1px 0 #000, -1px -1px 0 #000;
				pointer-events: none;
				z-index: 10002;
				animation: score-pop 0.8s ease-out forwards;
			`;
		document.body.appendChild(pop);
		setTimeout(() => pop.remove(), 800);
	},
};

// Inject score pop animation
const scoreStyle = document.createElement("style");
scoreStyle.textContent = `
		@keyframes score-pop {
			0% {
				opacity: 1;
				transform: translateY(0) scale(1);
			}
			100% {
				opacity: 0;
				transform: translateY(-50px) scale(1.5);
			}
		}
	`;
document.head.appendChild(scoreStyle);
