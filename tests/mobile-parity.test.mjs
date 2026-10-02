import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readAppStyles } from "./helpers/styles.mjs";

const read = (path) => readFileSync(path, "utf8");
const page = `${read("app/page.tsx")}\n${read("app/domains/shell/view.tsx")}`;
const uxSource = read("app/ux-refresh.tsx");
const ux = readAppStyles();
const practice = ux;

test("mobile keeps the same primary destinations as desktop", () => {
  assert.match(page, />Thử thách<\/button>/);
  assert.match(page, /<summary[\s\S]*?>Cẩm nang<\/summary>/);
  assert.match(page, />Tin tức<\/button>/);
  assert.match(page, />Thực hành<\/button>/);
  assert.match(page, />Thành tích<\/button>/);
  assert.match(uxSource, /className="ux-about-nav-item"[\s\S]*?Giới thiệu/);
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
