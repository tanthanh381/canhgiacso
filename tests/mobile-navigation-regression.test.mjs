import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const uxSource = read("app/ux-refresh.tsx");
const uxCss = read("app/ux-refresh.css");
const globalsCss = read("app/globals.css");
const practiceSource = read("app/interactive-practice-nav.tsx");
const practiceCss = read("app/interactive-practice-nav.css");
const visualCss = read("app/visual-refresh.css");

test("mobile primary navigation renders exactly five destinations without duplicate practice", () => {
  assert.match(uxSource, /const PRIMARY_VIEWS: PrimaryView\[\] = \["Thử thách", "Cẩm nang", "Tin tức", "Thành tích"\]/);
  assert.doesNotMatch(uxSource, /PRIMARY_VIEWS[^\n]+Thực hành/);
  assert.match(practiceSource, /className=\{active \? "active ux-practice-nav-item" : "ux-practice-nav-item"\}/);
  assert.match(practiceCss, /grid-template-columns:\s*repeat\(5,\s*1fr\)/);
  assert.match(uxCss, /grid-template-columns:\s*repeat\(5,\s*1fr\)/);
});

test("mobile navigation stays below header and never falls back to bottom navigation", () => {
  assert.match(uxCss, /\.ux-bottom-nav\s*\{[\s\S]*?top:\s*64px;[\s\S]*?bottom:\s*auto;/);
  assert.match(uxCss, /\.topbar\s*\{[\s\S]*?height:\s*64px;[\s\S]*?margin-bottom:\s*66px;/);
  assert.match(visualCss, /\.ux-bottom-nav\s*\{\s*border-radius:\s*0;/);
});

test("mobile overlays are isolated above backdrop and outside the navigation stacking context", () => {
  assert.match(uxSource, /<\/nav>[\s\S]*?ux-utility-backdrop[\s\S]*?ux-mobile-menu-backdrop[\s\S]*?ux-utility-popover-mobile[\s\S]*?ux-mobile-knowledge-menu/);
  assert.match(uxCss, /\.ux-utility-popover-mobile\s*\{[\s\S]*?z-index:\s*88;/);
  assert.match(uxCss, /\.ux-mobile-knowledge-menu\s*\{[\s\S]*?z-index:\s*86;/);
  assert.match(uxCss, /\.ux-utility-backdrop,[\s\S]*?z-index:\s*82;/);
  assert.match(uxCss, /\.ux-mobile-menu-backdrop\s*\{\s*z-index:\s*84;/);
});

test("desktop and mobile utility popovers cannot render visibly at the same breakpoint", () => {
  assert.match(uxCss, /\.ux-utility-popover-mobile\s*\{\s*display:\s*none;/);
  assert.match(uxCss, /@media \(max-width:\s*900px\)[\s\S]*?\.ux-utility-popover-desktop\s*\{\s*display:\s*none;/);
  assert.match(uxCss, /\.ux-utility-popover-mobile\s*\{[\s\S]*?display:\s*block;[\s\S]*?position:\s*fixed;/);
});

test("mobile menu state is mutually exclusive and dismissible", () => {
  assert.match(uxSource, /setMobileKnowledgeOpen\(false\);\s*setUtilityOpen\(\(value\) => !value\)/);
  assert.match(uxSource, /setUtilityOpen\(false\), setMobileKnowledgeOpen\(\(value\) => !value\)/);
  assert.match(uxSource, /event\.key !== "Escape"/);
  assert.match(uxSource, /setUtilityOpen\(false\);[\s\S]*?setMobileKnowledgeOpen\(false\);[\s\S]*?setInsightOpen\(false\);[\s\S]*?setScenariosOpen\(false\);/);
});

test("drawers always sit above mobile navigation and popup layers", () => {
  assert.match(uxCss, /\.ux-drawer-backdrop\s*\{[\s\S]*?z-index:\s*100;/);
  assert.match(uxCss, /\.ux-drawer-close\s*\{[\s\S]*?z-index:\s*108;/);
  assert.match(uxCss, /\.scenario-panel\s*\{[\s\S]*?z-index:\s*104;/);
  assert.match(uxCss, /\.insight-panel\s*\{[\s\S]*?z-index:\s*104;/);
  assert.match(uxCss, /html, body, \.app\s*\{\s*max-width:\s*100%;\s*overflow-x:\s*hidden;/);
});

test("application modals always stay above mobile navigation and drawers", () => {
  assert.match(globalsCss, /\.modal-layer\s*\{[\s\S]*?z-index:\s*200;/);
});

test("small mobile screens retain readable labels and safe touch targets", () => {
  assert.match(visualCss, /\.ux-bottom-nav button\s*\{\s*min-height:\s*48px;/);
  assert.match(uxCss, /\.ux-utility-popover-mobile button\s*\{[\s\S]*?min-height:\s*44px;/);
  assert.match(uxCss, /@media \(max-width:\s*560px\)[\s\S]*?\.product-lockup strong\s*\{\s*display:\s*none;/);
  assert.match(visualCss, /@media \(max-width:\s*560px\)[\s\S]*?\.ux-bottom-nav small\s*\{\s*font-size:\s*9px;/);
});
