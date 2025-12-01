(() => {
	const theme = localStorage.getItem("theme") || "system";
	if (
		theme === "dark" ||
		(theme === "system" &&
			window.matchMedia("(prefers-color-scheme: dark)").matches)
	) {
		document.documentElement.setAttribute("data-theme", "dark");
	} else if (theme === "light") {
		document.documentElement.setAttribute("data-theme", "light");
	}
})();
