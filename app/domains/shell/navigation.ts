export type View = "game" | "knowledge" | "news" | "quiz" | "stats" | "evidence" | "dashboard" | "admin";

export type HashRoute = {
  view: View;
  newsSlug: string;
};

export const SIMULATION_BANNER_VIEWS: ReadonlySet<View> = new Set(["game", "quiz"]);

export function routeFromHash(hash: string): HashRoute {
  if (hash === "#/admin") return { view: "admin", newsSlug: "" };
  if (hash === "#/quiz") return { view: "quiz", newsSlug: "" };
  if (hash === "#/stats") return { view: "stats", newsSlug: "" };
  if (hash.startsWith("#/news/")) return { view: "news", newsSlug: hash.slice(7) };
  if (hash === "#/news") return { view: "news", newsSlug: "" };
  return { view: "game", newsSlug: "" };
}

export function canChangeHash(previousHash: string, nextHash: string) {
  if (previousHash !== "#/admin" || nextHash === previousHash) return true;
  return window.dispatchEvent(new Event("admin-before-leave", { cancelable: true }));
}

export function restoreHash(previousHash: string) {
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${previousHash}`,
  );
}

export function navigateBrowser(currentView: View, nextView: View) {
  if (
    currentView === "admin"
    && nextView !== "admin"
    && !window.dispatchEvent(new Event("admin-before-leave", { cancelable: true }))
  ) return false;

  if (nextView === "news") {
    window.location.hash = "/news";
  } else if (nextView === "quiz") {
    window.location.hash = "/quiz";
  } else if (nextView === "stats") {
    window.location.hash = "/stats";
  } else if (window.location.hash.startsWith("#/news")) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  if (nextView === "admin") {
    window.location.hash = "/admin";
  } else if (window.location.hash === "#/admin") {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  return true;
}
