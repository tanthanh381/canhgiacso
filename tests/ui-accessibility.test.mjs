import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readAppStyles } from "./helpers/styles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("focus ring uses tokens defined for both themes (dual outline + halo)", async () => {
  const globals = readAppStyles();
  const seo = await read("public/seo.css");
  assert.match(globals, /--focus-ring:\s*#[0-9a-f]{6}/i);
  assert.match(globals, /--focus-halo:\s*#[0-9a-f]{6}/i);
  assert.match(globals, /:root\[data-theme="dark"\]\s*\{[^}]*--focus-ring:/s);
  assert.match(globals, /:focus-visible\s*\{\s*outline:\s*3px solid var\(--focus-ring\);\s*outline-offset:\s*2px;\s*box-shadow:\s*0 0 0 7px var\(--focus-halo\)/);
  assert.match(seo, /outline:\s*3px solid var\(--seo-focus/);
  assert.match(seo, /:root\[data-theme="dark"\][^}]*--seo-focus:/s);
});

test("no CSS declares a font size below 12px", async () => {
  const sources = {
    "app/styles/*.css": readAppStyles(), "public/seo.css": await read("public/seo.css"), "public/seo-tools.css": await read("public/seo-tools.css"),
  };
  for (const [file, css] of Object.entries(sources)) {
    for (const match of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) {
      assert.ok(Number(match[1]) >= 12, `${file}: font-size ${match[1]}px is below 12px`);
    }
  }
});

test("reduced motion is honoured by CSS, the boot loader and the about animation", async () => {
  const [globals, seo, layout, animation] = await Promise.all([
    readAppStyles(), read("public/seo.css"), read("app/layout.tsx"), read("public/gioi-thieu/hoat-hinh.html"),
  ]);
  assert.match(globals, /prefers-reduced-motion:\s*reduce[\s\S]*animation:\s*none\s*!important[\s\S]*transition:\s*none\s*!important/);
  assert.match(seo, /prefers-reduced-motion:\s*reduce/);
  assert.match(layout, /prefers-reduced-motion:\s*reduce/);
  assert.match(animation, /prefers-reduced-motion:\s*reduce/);
  assert.match(animation, /requestAnimationFrame/);
});

test("the first-visit guest notice is a non-blocking labelled region", async () => {
  const [notice, page] = await Promise.all([read("app/domains/shell/guest-notice.tsx"), read("app/page.tsx")]);
  assert.match(notice, /role="region"/);
  assert.match(notice, /aria-labelledby="guest-notice-title"/);
  assert.match(notice, /canhgiacso:guest-notice-dismissed/);
  assert.match(notice, /safeStorageGet/);
  assert.match(notice, /safeStorageSet/);
  for (const label of ["Đăng nhập", "Tạo tài khoản", "Tiếp tục với tư cách khách", "Đóng thông báo chế độ khách"]) {
    assert.ok(notice.includes(label), `missing notice label: ${label}`);
  }
  assert.doesNotMatch(notice, /Modal|aria-modal|focusTrap/);
  assert.match(page, /guestLimitOpen, setGuestLimitOpen\] = useState\(false\)/);
  assert.match(page, /onOpenGuestNotice=\{\(\) => setGuestLimitOpen\(true\)\}/);
});

test("locked scenarios are grouped by difficulty in collapsible groups", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /className="scenario-lock-toggle"/);
  assert.match(page, /aria-expanded=\{open\}/);
  assert.match(page, /aria-controls=\{panelId\}/);
  assert.match(page, /Mở khi hoàn thành \{group\.requirementDone\}\/\{group\.requirementTotal\} \{group\.requirementLevel\}/);
  // Searching opens groups that contain matches; random only ever picks unlocked scenarios.
  assert.match(page, /\?\? searching/);
  assert.match(page, /const availableScenarios = scenarios\.filter\(\(item\) => unlockedDifficulties\.has\(item\.difficulty\)\)/);
  assert.match(page, /const randomCandidates = incompleteUnlockedScenarios\.length \? incompleteUnlockedScenarios : availableScenarios/);
});

test("static pages get an accessible, CSP-safe theme toggle", async () => {
  const script = await read("public/theme-init.js");
  assert.match(script, /khien-so-theme/);
  assert.match(script, /prefers-color-scheme: dark/);
  assert.match(script, /DOMContentLoaded/);
  assert.match(script, /aria-pressed/);
  assert.match(script, /Đổi chế độ sáng tối/);
  assert.match(script, /\.seo-nav/);
  assert.doesNotMatch(script, /eval\(|new Function|document\.write/);
  const css = await read("public/seo.css");
  assert.match(css, /\.seo-theme-toggle\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px/s);
});

test("UI controls use inline SVG icons instead of emoji or font glyphs", async () => {
  const files = [
    "app/page.tsx", "app/ux-refresh.tsx", "app/interactive-practice-nav.tsx", "app/domains/shell/view.tsx",
    "app/domains/dashboard/view.tsx", "app/domains/security-awareness/view.tsx", "app/shared/ui-primitives.tsx",
  ];
  for (const file of files) {
    const source = await read(file);
    assert.doesNotMatch(source, /\p{Extended_Pictographic}/u, `${file} still contains an emoji`);
    assert.doesNotMatch(source, />[⌕☰▶↻⤨⇩☀☾]\s*<|["'`][⌕☰▶↻⤨⇩☀☾×]\s/u, `${file} still uses a text glyph as an icon`);
  }
  const icons = await read("app/shared/icons.tsx");
  assert.match(icons, /aria-hidden="true"/);
  assert.match(icons, /stroke="currentColor"/);
});

test("brand copy matches the lockup and footer standard", async () => {
  const [data, shell] = await Promise.all([read("app/data.ts"), read("app/domains/shell/view.tsx")]);
  assert.match(data, /productName: "CẢNH GIÁC SỐ"/);
  assert.match(data, /departmentName: "IT SECURITY"/);
  assert.match(data, /Website được quản lý và vận hành bởi IT Security Team - HDBank\./);
  assert.doesNotMatch(data, /vận hành bởi:/);
  assert.match(shell, /<strong>\{copy\.productName\}<\/strong><small>\{copy\.departmentName\}<\/small>/);
});
