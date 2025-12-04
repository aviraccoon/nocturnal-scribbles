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
			const isActive =
				btnTheme === activeTheme ||
				(btnTheme === "hotdog" && activeTheme === "hotdog-alt");
			btn.classList.toggle("active", isActive);
		});
	}

	updateButtons(currentTheme);

	buttons.forEach((btn) => {
		btn.addEventListener("click", () => {
			let theme = btn.dataset.themeBtn;
			if (theme === "hotdog") {
				if (currentTheme === "hotdog") {
					theme = "hotdog-alt";
				} else if (currentTheme === "hotdog-alt") {
					theme = "hotdog";
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
