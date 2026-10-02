import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { declOf, readAppStyles } from "./helpers/styles.mjs";

const read = (path) => readFileSync(path, "utf8");
const uxSource = read("app/ux-refresh.tsx");
const uxCss = readAppStyles();
const globalsCss = uxCss;
const MOBILE = "@media (max-width: 900px)";
const practiceSource = read("app/interactive-practice-nav.tsx");
const practiceCss = uxCss;
const visualCss = uxCss;

test("mobile primary navigation renders six destinations including Giới thiệu without duplicate practice", () => {
  assert.match(uxSource, /const PRIMARY_VIEWS: PrimaryView\[\] = \["Thử thách", "Cẩm nang", "Tin tức", "Thành tích"\]/);
  assert.doesNotMatch(uxSource, /PRIMARY_VIEWS[^\n]+Thực hành/);
  assert.match(practiceSource, /className=\{active \? "active ux-practice-nav-item" : "ux-practice-nav-item"\}/);
  assert.match(uxSource, /className="ux-about-nav-item"[\s\S]*?Giới thiệu/);
  assert.match(practiceCss, /grid-template-columns:\s*repeat\(6,\s*1fr\)/);
  assert.match(uxCss, /grid-template-columns:\s*repeat\(6,\s*1fr\)/);
  assert.match(uxCss, /\.ux-bottom-nav \.ux-about-nav-item\s*\{\s*order:\s*6;/);
});

test("mobile navigation stays below header and never falls back to bottom navigation", () => {
  assert.equal(declOf(uxCss, ".ux-bottom-nav", "top", MOBILE), "var(--cgs-mobile-header-height)");
  assert.equal(declOf(uxCss, ".ux-bottom-nav", "bottom", MOBILE), "auto");
  assert.equal(declOf(uxCss, ".topbar", "height", MOBILE), "var(--cgs-mobile-header-height)");
  assert.equal(declOf(uxCss, ".topbar", "margin-bottom", MOBILE), "66px");
  assert.equal(declOf(visualCss, ".ux-bottom-nav", "border-radius", MOBILE), "0");
});

test("mobile overlays are isolated above backdrop and outside the navigation stacking context", () => {
  assert.match(uxSource, /<\/nav>[\s\S]*?ux-utility-backdrop[\s\S]*?ux-mobile-menu-backdrop[\s\S]*?ux-utility-popover-mobile[\s\S]*?ux-mobile-knowledge-menu/);
  assert.equal(declOf(uxCss, ".ux-utility-popover-mobile", "z-index", MOBILE), "88");
  assert.equal(declOf(uxCss, ".ux-mobile-knowledge-menu", "z-index", MOBILE), "86");
  assert.equal(declOf(uxCss, ".ux-utility-backdrop", "z-index", MOBILE), "82");
  assert.equal(declOf(uxCss, ".ux-mobile-menu-backdrop", "z-index", MOBILE), "84");
});

test("desktop and mobile utility popovers cannot render visibly at the same breakpoint", () => {
  assert.equal(declOf(uxCss, ".ux-utility-popover-mobile", "display"), "none");
  assert.equal(declOf(uxCss, ".ux-utility-popover-desktop", "display", MOBILE), "none");
  assert.equal(declOf(uxCss, ".ux-utility-popover-mobile", "display", MOBILE), "block");
  assert.equal(declOf(uxCss, ".ux-utility-popover-mobile", "position", MOBILE), "fixed");
});

test("mobile menu state is mutually exclusive and dismissible", () => {
  assert.match(uxSource, /setMobileKnowledgeOpen\(false\);\s*setUtilityOpen\(\(value\) => !value\)/);
  assert.match(uxSource, /setUtilityOpen\(false\), setMobileKnowledgeOpen\(\(value\) => !value\)/);
  assert.match(uxSource, /event\.key !== "Escape"/);
  assert.match(uxSource, /setUtilityOpen\(false\);[\s\S]*?setMobileKnowledgeOpen\(false\);[\s\S]*?setInsightOpen\(false\);[\s\S]*?setScenariosOpen\(false\);/);
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

test("mobile checklist action delegates to the real desktop checklist control", () => {
  assert.match(uxSource, /function knowledgeSubmenuButton\(label: string\)/);
  assert.match(uxSource, /knowledgeSubmenuButton\("Danh sách kiểm tra"\)\?\.click\(\)/);
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
