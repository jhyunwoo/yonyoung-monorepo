(() => {
  try {
    const stored = localStorage.getItem("theme");
    const mode =
      stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolvedTheme = mode === "system" ? (systemDark ? "dark" : "light") : mode;
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themeMode = mode;
  } catch {
    // ignore client storage errors
  }
})();
