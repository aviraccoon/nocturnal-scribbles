(() => {
	const buttons = document.querySelectorAll("[data-theme-btn]");
	const savedTheme = localStorage.getItem("theme") || "system";

	function applyTheme(theme) {
		if (theme === "dark") {
			document.documentElement.setAttribute("data-theme", "dark");
		} else if (theme === "light") {
			document.documentElement.setAttribute("data-theme", "light");
		} else {
			document.documentElement.removeAttribute("data-theme");
		}
	}

	function updateButtons(activeTheme) {
		buttons.forEach((btn) => {
			if (btn.dataset.themeBtn === activeTheme) {
				btn.classList.add("active");
			} else {
				btn.classList.remove("active");
			}
		});
	}

	updateButtons(savedTheme);

	buttons.forEach((btn) => {
		btn.addEventListener("click", () => {
			const theme = btn.dataset.themeBtn;
			localStorage.setItem("theme", theme);
			applyTheme(theme);
			updateButtons(theme);
		});
	});
})();
