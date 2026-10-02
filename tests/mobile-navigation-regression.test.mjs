import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { declOf, readAppStyles } from "./helpers/styles.mjs";
import { primaryNavLabels, readShell } from "./helpers/shell.mjs";

const read = (path) => readFileSync(path, "utf8");
const mobileNav = readShell("mobile-nav.tsx");
const header = readShell("view.tsx");
const menus = readShell("header-menus.ts");
const drawers = readShell("drawers.tsx");
const navigation = readShell("navigation.ts");
const uxCss = readAppStyles();
const globalsCss = uxCss;
const MOBILE = "@media (max-width: 900px)";
const visualCss = uxCss;

test("mobile primary navigation renders six destinations including Giới thiệu from the same list as the desktop header", () => {
  // One list (PRIMARY_NAV) feeds the desktop header and the mobile bar, so the two can not drift apart.
  assert.deepEqual(primaryNavLabels(), ["Thử thách", "Cẩm nang", "Tin tức", "Thực hành", "Thành tích"]);
  assert.match(mobileNav, /PRIMARY_NAV\.map/);
  assert.match(header, /PRIMARY_NAV\.map/);
  assert.match(mobileNav, /className="ux-about-nav-item"[\s\S]*?Giới thiệu/);
  assert.match(mobileNav, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(navigation, /ariaLabel: "Thực hành tương tác"/);
  assert.match(uxCss, /grid-template-columns:\s*repeat\(6,\s*1fr\)/);
  assert.match(uxCss, /\.ux-bottom-nav \.ux-about-nav-item\s*\{\s*order:\s*6;/);
});

test("navigation components do not scan or patch the DOM", () => {
  for (const file of ["view.tsx", "mobile-nav.tsx", "management-menu.tsx", "simulation-banner.tsx", "drawers.tsx", "header-menus.ts", "skip-link.tsx"]) {
    const source = readShell(file);
    assert.doesNotMatch(source, /MutationObserver|createPortal|querySelector|\.click\(\)|classList\./, `${file} must express its UI in React state`);
  }
  for (const file of ["app/page.tsx", "app/bootstrap.tsx", "app/layout.tsx", "app/domains/training/stage-widgets.tsx"]) {
    assert.doesNotMatch(read(file), /MutationObserver|createPortal/, `${file} must not inject UI into DOM it does not own`);
  }
  assert.ok(!read("github-pages/main.tsx").includes("UxRefresh"), "the entry renders the application only");
});

test("mobile navigation stays below header and never falls back to bottom navigation", () => {
  assert.equal(declOf(uxCss, ".ux-bottom-nav", "top", MOBILE), "var(--mobile-header-height)");
  assert.equal(declOf(uxCss, ".ux-bottom-nav", "bottom", MOBILE), "auto");
  assert.equal(declOf(uxCss, ".topbar", "height", MOBILE), "var(--mobile-header-height)");
  assert.equal(declOf(uxCss, ".topbar", "margin-bottom", MOBILE), "66px");
  assert.equal(declOf(visualCss, ".ux-bottom-nav", "border-radius", MOBILE), "0");
});

test("mobile overlays are isolated above backdrop and outside the navigation stacking context", () => {
  // The sheets are siblings rendered after the bar (never inside it), so the bar's stacking context can not trap them.
  const bar = mobileNav.slice(mobileNav.indexOf("export function MobileNav"), mobileNav.indexOf("export function MobileKnowledgeMenu"));
  assert.match(bar, /<\/nav>\s*\);\s*\}/);
  assert.doesNotMatch(bar, /ux-mobile-knowledge-menu|ux-mobile-menu-backdrop/);
  assert.match(header, /<MobileNav[\s\S]*?\/>\s*\{menus\.compact && menus\.open === "management"[\s\S]*?<ManagementSheet[\s\S]*?<MobileKnowledgeMenu/);
  assert.equal(declOf(uxCss, ".ux-utility-popover-mobile", "z-index", MOBILE), "88");
  assert.equal(declOf(uxCss, ".ux-mobile-knowledge-menu", "z-index", MOBILE), "86");
  assert.equal(declOf(uxCss, ".ux-utility-backdrop", "z-index", MOBILE), "82");
  assert.equal(declOf(uxCss, ".ux-mobile-menu-backdrop", "z-index", MOBILE), "84");
});

test("desktop and mobile utility popovers cannot render visibly at the same breakpoint", () => {
  // React renders exactly one of them (compact decides); the CSS keeps the mobile sheet out of sight on wide screens as well.
  const management = readShell("management-menu.tsx");
  assert.match(management, /open && !compact && <ManagementPopover/);
  assert.match(header, /menus\.compact && menus\.open === "management"/);
  assert.equal(declOf(uxCss, ".ux-utility-popover-mobile", "display"), "none");
  assert.equal(declOf(uxCss, ".ux-utility-popover-mobile", "display", MOBILE), "block");
  assert.equal(declOf(uxCss, ".ux-utility-popover-mobile", "position", MOBILE), "fixed");
});

test("mobile menu state is mutually exclusive and dismissible", () => {
  // One state value holds the open menu, so opening one closes the other by construction.
  assert.match(menus, /export type HeaderMenu = "knowledge" \| "management"/);
  assert.match(menus, /useState<\{ menu: HeaderMenu \| null; compact: boolean \}>/);
  assert.match(menus, /event\.key !== "Escape"/);
  assert.match(menus, /closest\("\[data-menu-surface\]"\)/);
  assert.match(menus, /state\.compact !== compact\) setState\(\{ menu: null, compact \}\)/, "crossing the breakpoint closes the menu");
  assert.match(drawers, /event\.key === "Escape"\) close\(\)/);
  assert.match(drawers, /opener\.current\?\.focus\(\)/, "closing a drawer returns focus to its button");
});

test("drawers always sit above mobile navigation and popup layers", () => {
  assert.equal(declOf(uxCss, ".ux-drawer-backdrop", "z-index"), "100");
  assert.equal(declOf(uxCss, ".ux-drawer-close", "z-index"), "108");
  assert.equal(declOf(uxCss, ".scenario-panel", "z-index", MOBILE), "104");
  assert.equal(declOf(uxCss, ".insight-panel", "z-index"), "104");
  assert.equal(declOf(uxCss, "html", "max-width", MOBILE), "100%");
  assert.equal(declOf(uxCss, ".app", "max-width", MOBILE), "100%");
  assert.equal(declOf(uxCss, ".app", "overflow-x", MOBILE), "clip");
});

test("mobile runtime status stays in document flow below the fixed navigation", () => {
  assert.equal(declOf(uxCss, ".sync-status", "position", MOBILE), "relative");
  assert.equal(declOf(uxCss, ".sync-status", "top", MOBILE), "auto");
  assert.equal(declOf(uxCss, ".sync-status", "transform", MOBILE), "none");
});

test("mobile checklist action goes through the same handler as the desktop menu", () => {
  assert.match(header, /<MobileKnowledgeMenu onOpenArticles=\{openArticles\} onOpenChecklist=\{openChecklist\}/);
  assert.match(header, /const openChecklist = \(\) => \{ navigate\("knowledge"\); scrollToChecklist\(\); \};/);
});

test("application modals always stay above mobile navigation and drawers", () => {
  assert.match(globalsCss, /\.modal-layer\s*\{[\s\S]*?z-index:\s*200;/);
});

test("small mobile screens retain readable labels and safe touch targets", () => {
  assert.equal(declOf(visualCss, ".ux-bottom-nav button", "min-height", MOBILE), "48px");
  assert.equal(declOf(uxCss, ".ux-utility-popover-mobile button", "min-height", MOBILE), "44px");
  assert.equal(declOf(uxCss, ".product-lockup strong", "display", "@media (max-width: 560px)"), "none");
  assert.ok(parseFloat(declOf(visualCss, ".ux-bottom-nav small", "font-size")) >= 12);
});
