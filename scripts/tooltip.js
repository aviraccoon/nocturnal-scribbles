(() => {
	const refs = document.querySelectorAll("[data-tooltip]");
	if (!refs.length) return;

	let tooltip = null;
	let hideTimeout = null;

	function cancelHide() {
		if (hideTimeout) {
			clearTimeout(hideTimeout);
			hideTimeout = null;
		}
	}

	function hide() {
		cancelHide();
		if (tooltip) {
			tooltip.remove();
			tooltip = null;
		}
	}

	function scheduleHide() {
		hideTimeout = setTimeout(hide, 100);
	}

	function show(ref) {
		cancelHide();
		if (tooltip) tooltip.remove();

		const { tooltip: content, tooltipWidth, tooltipPosition } = ref.dataset;

		tooltip = document.createElement("div");
		tooltip.className = "tooltip";
		if (tooltipWidth) tooltip.style.maxWidth = tooltipWidth;
		tooltip.innerHTML = content;
		document.body.appendChild(tooltip);

		tooltip.addEventListener("mouseenter", cancelHide);
		tooltip.addEventListener("mouseleave", scheduleHide);

		const rect = ref.getBoundingClientRect();
		const tooltipRect = tooltip.getBoundingClientRect();
		const gap = 4;

		const showBelow =
			tooltipPosition === "below" ||
			(tooltipPosition !== "above" && rect.top - tooltipRect.height - gap < 8);

		tooltip.style.left =
			Math.max(
				8,
				Math.min(
					rect.left + (rect.width - tooltipRect.width) / 2,
					window.innerWidth - tooltipRect.width - 8,
				),
			) +
			window.scrollX +
			"px";

		tooltip.style.top =
			(showBelow ? rect.bottom + gap : rect.top - tooltipRect.height - gap) +
			window.scrollY +
			"px";
	}

	refs.forEach((ref) => {
		ref.addEventListener("mouseenter", () => show(ref));
		ref.addEventListener("mouseleave", scheduleHide);
		ref.addEventListener("focus", () => show(ref));
		ref.addEventListener("blur", hide);
	});
})();
