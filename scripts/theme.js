(() => {
	const buttons = document.querySelectorAll("[data-theme-btn]");
	let currentTheme = localStorage.getItem("theme") || "system";

	function randomTheme() {
		const themes = Array.from(buttons)
			.map((btn) => btn.dataset.themeBtn)
			.filter((t) => t !== "system" && t !== "chaos");
		return themes[Math.floor(Math.random() * themes.length)];
	}

	function applyTheme(theme) {
		if (theme === "system") {
			document.documentElement.removeAttribute("data-theme");
		} else {
			document.documentElement.setAttribute("data-theme", theme);
		}
	}

	function updateButtons(activeTheme) {
		buttons.forEach((btn) => {
			const btnTheme = btn.dataset.themeBtn;
			const variants = btn.dataset.themeVariants?.split(",") || [];
			const isActive =
				btnTheme === activeTheme || variants.includes(activeTheme);
			btn.classList.toggle("active", isActive);
		});
	}

	updateButtons(currentTheme);

	buttons.forEach((btn) => {
		btn.addEventListener("click", () => {
			let theme = btn.dataset.themeBtn;
			const variants = btn.dataset.themeVariants?.split(",") || [];
			if (variants.length > 0) {
				const currentIndex = variants.indexOf(currentTheme);
				if (currentIndex !== -1) {
					theme = variants[(currentIndex + 1) % variants.length];
				} else {
					theme = variants[Math.floor(Math.random() * variants.length)];
				}
			}
			currentTheme = theme;
			localStorage.setItem("theme", theme);
			if (theme === "chaos") {
				applyTheme(randomTheme());
			} else {
				applyTheme(theme);
			}
			updateButtons(theme);
		});
	});
})();
