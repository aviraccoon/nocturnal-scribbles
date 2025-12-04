(() => {
	const theme = localStorage.getItem("theme") || "system";
	let activeTheme = theme;
	if (theme === "chaos") {
		const themes = "__CHAOS_THEMES__".split(",");
		activeTheme = themes[Math.floor(Math.random() * themes.length)];
	}
	if (activeTheme === "dark") {
		document.documentElement.setAttribute("data-theme", "dark");
	} else if (activeTheme === "light") {
		document.documentElement.setAttribute("data-theme", "light");
	} else if (
		activeTheme === "system" &&
		window.matchMedia("(prefers-color-scheme: dark)").matches
	) {
		document.documentElement.setAttribute("data-theme", "dark");
	} else if (activeTheme !== "system") {
		document.documentElement.setAttribute("data-theme", activeTheme);
	}
})();
