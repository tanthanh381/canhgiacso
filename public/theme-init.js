/*
 * Theme bootstrap for static pages (CSP-safe: a same-origin file, no inline script).
 *  1. Applies the saved theme before first paint ("khien-so-theme": "dark" | "light").
 *     With no saved choice it follows the operating-system preference (prefers-color-scheme).
 *  2. After DOMContentLoaded it adds an accessible light/dark toggle to the page header (.seo-nav).
 * The app (SPA) uses the same storage key, so the choice carries over between the two.
 */
(() => {
  const KEY = "khien-so-theme";
  const root = document.documentElement;
  const media = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  let stored = null;
  try { stored = window.localStorage.getItem(KEY); } catch { /* restricted storage: follow the system setting */ }

  const isDark = () => (stored === "dark" || stored === "light" ? stored === "dark" : Boolean(media && media.matches));
  let button = null;

  function apply() {
    if (isDark()) root.dataset.theme = "dark";
    else delete root.dataset.theme;
    if (button) button.setAttribute("aria-pressed", String(isDark()));
  }
  apply();

  if (media && typeof media.addEventListener === "function") {
    media.addEventListener("change", () => { if (stored !== "dark" && stored !== "light") apply(); });
  }
  window.addEventListener("storage", (event) => {
    if (event.key === KEY) { stored = event.newValue; apply(); }
  });

  const ICONS =
    '<svg class="seo-theme-icon seo-theme-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 14.6A8 8 0 0 1 9.4 4a8 8 0 1 0 10.6 10.6z"/></svg>' +
    '<svg class="seo-theme-icon seo-theme-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>';

  function mount() {
    const nav = document.querySelector(".seo-nav");
    if (!nav || nav.querySelector(".seo-theme-toggle")) return;
    button = document.createElement("button");
    button.type = "button";
    button.className = "seo-theme-toggle";
    button.setAttribute("aria-label", "Đổi chế độ sáng tối");
    button.setAttribute("aria-pressed", String(isDark()));
    button.innerHTML = ICONS;
    button.addEventListener("click", () => {
      stored = isDark() ? "light" : "dark";
      try { window.localStorage.setItem(KEY, stored); } catch { /* the choice still applies for this page view */ }
      apply();
    });
    nav.appendChild(button);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
