import { safeStorageGet, THEME_KEY } from "./browser-storage";

export type Theme = "light" | "dark";

/** The saved choice if there is one, otherwise the operating-system setting (the static pages follow the same rule, see public/theme-init.js). */
export function preferredTheme(): Theme {
  const saved = safeStorageGet(THEME_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** The theme lives on <html data-theme> so that everything outside .app (portals, native controls) follows it. */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}
