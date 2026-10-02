import type { IconName } from "../../shared/icons";
import { scrollBehavior } from "../../shared/motion";

export type View = "game" | "knowledge" | "news" | "quiz" | "stats" | "evidence" | "dashboard" | "admin";

export type HashRoute = {
  view: View;
  newsSlug: string;
};

export type NavItem = { view: View; label: string; icon: IconName; ariaLabel?: string };

/** Primary destinations, in the order used by the header and by the mobile bar. "Cẩm nang" also opens a submenu. */
export const PRIMARY_NAV: readonly NavItem[] = [
  { view: "game", label: "Thử thách", icon: "diamond" },
  { view: "knowledge", label: "Cẩm nang", icon: "book" },
  { view: "news", label: "Tin tức", icon: "news" },
  { view: "quiz", label: "Thực hành", icon: "play", ariaLabel: "Thực hành tương tác" },
  { view: "stats", label: "Thành tích", icon: "star" },
];

export const KNOWLEDGE_ARTICLES_PATH = "/kien-thuc/";
export const ABOUT_PATH = "/gioi-thieu/";
export const CHECKLIST_TITLE_ID = "security-checklist-title";

/** The evidence box is reached from the achievements page, so that item stays highlighted while it is open. */
export function isNavItemActive(item: View, current: View) {
  return item === "stats" ? current === "stats" || current === "evidence" : item === current;
}

export type ManagementTab = "content" | "traffic" | "users";

export function adminHash(tab: ManagementTab) {
  return tab === "content" ? "#/admin" : `#/admin?tab=${tab}`;
}

/** Brings the security checklist into view once the knowledge page has rendered. */
export function scrollToChecklist() {
  window.setTimeout(() => document.getElementById(CHECKLIST_TITLE_ID)?.scrollIntoView({ behavior: scrollBehavior(), block: "start" }), 80);
}

export const SIMULATION_BANNER_VIEWS: ReadonlySet<View> = new Set(["game", "quiz"]);

export function routeFromHash(hash: string): HashRoute {
  if (hash === "#/game") return { view: "game", newsSlug: "" };
  if (hash === "#/admin" || hash.startsWith("#/admin?")) return { view: "admin", newsSlug: "" };
  if (hash === "#/dashboard") return { view: "dashboard", newsSlug: "" };
  if (hash === "#/quiz") return { view: "quiz", newsSlug: "" };
  if (hash === "#/stats") return { view: "stats", newsSlug: "" };
  if (hash.startsWith("#/news/")) return { view: "news", newsSlug: hash.slice(7) };
  if (hash === "#/news") return { view: "news", newsSlug: "" };
  return { view: "game", newsSlug: "" };
}

export function canChangeHash(previousHash: string, nextHash: string) {
  const previousIsAdmin = previousHash === "#/admin" || previousHash.startsWith("#/admin?");
  const nextIsAdmin = nextHash === "#/admin" || nextHash.startsWith("#/admin?");
  if (!previousIsAdmin || nextIsAdmin || nextHash === previousHash) return true;
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

  const hashByView: Partial<Record<View, string>> = {
    game: "/game",
    news: "/news",
    quiz: "/quiz",
    stats: "/stats",
    dashboard: "/dashboard",
    admin: "/admin",
  };
  const nextHash = hashByView[nextView];

  if (nextHash) {
    window.location.hash = nextHash;
  } else if (window.location.hash.startsWith("#/news")) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }
  if (!nextHash && window.location.hash === "#/admin") {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  return true;
}
