import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readAppStyles } from "./helpers/styles.mjs";
import { primaryNavLabels } from "./helpers/shell.mjs";

const read = (path) => readFileSync(path, "utf8");
const page = `${read("app/page.tsx")}\n${read("app/domains/shell/view.tsx")}\n${read("app/domains/shell/navigation.ts")}`;
const mobileNav = read("app/domains/shell/mobile-nav.tsx");
const ux = readAppStyles();
const practice = ux;

test("mobile keeps the same primary destinations as desktop", () => {
  assert.deepEqual(primaryNavLabels(), ["Thử thách", "Cẩm nang", "Tin tức", "Thực hành", "Thành tích"]);
  assert.match(page, /<summary[\s\S]*?\{item\.label\}<\/summary>/);
  assert.match(page, /PRIMARY_NAV\.map/);
  assert.match(mobileNav, /PRIMARY_NAV\.map/);
  assert.match(mobileNav, /className="ux-about-nav-item"[\s\S]*?Giới thiệu/);
  assert.match(practice, /grid-template-columns:\s*repeat\(6,\s*1fr\)/);
});

test("mobile exposes both sign-in and sign-up actions", () => {
  assert.doesNotMatch(ux, /\.guest-badge,\s*\.login-button\s*\{\s*display:\s*none/);
  assert.match(ux, /\.topbar \.auth-actions \.login-button,[\s\S]*?\.topbar \.auth-actions \.signup-button[\s\S]*?display:\s*inline-flex/);
});

test("mobile drawers retain desktop scenario insight content", () => {
  assert.match(ux, /\.insight-panel\s*\{[\s\S]*?display:\s*flex/);
  assert.match(ux, /\.scenario-hero-icon\s*\{\s*display:\s*grid/);
});

test("mobile knowledge checklist keeps explanatory copy", () => {
  assert.match(ux, /\.checklist-group-copy small\s*\{\s*display:\s*block/);
});
