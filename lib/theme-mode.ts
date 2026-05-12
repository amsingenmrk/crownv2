export type ThemeMode = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

export const THEME_STORAGE_KEY = "theme"

export function coerceThemeMode(value: string | null | undefined): ThemeMode {
  if (value === "light" || value === "dark" || value === "system") {
    return value
  }
  return "system"
}

export function resolveThemeMode(
  theme: ThemeMode,
  prefersDark: boolean
): ResolvedTheme {
  if (theme === "system") {
    return prefersDark ? "dark" : "light"
  }
  return theme
}

export function buildThemeBootScript(): string {
  return `(() => {
  try {
    const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
    const root = document.documentElement;
    const stored = window.localStorage.getItem(storageKey);
    const theme =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";
    const prefersDark =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
  } catch (_error) {
    // Ignore storage / matchMedia access issues and fall back to CSS defaults.
  }
})();`
}
