import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { declOf, readAppStyles, readStyle } from "./helpers/styles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("focus ring uses tokens defined for both themes (dual outline + halo)", async () => {
  const globals = readAppStyles();
  const seo = await read("public/seo.css");
  assert.match(globals, /--focus-ring:\s*#[0-9a-f]{6}/i);
  assert.match(globals, /--focus-halo:\s*#[0-9a-f]{6}/i);
  assert.match(globals, /:root\[data-theme="dark"\]\s*\{[^}]*--focus-ring:/s);
  // Dual ring: the outline comes from the base layer, the halo from the last (a11y) layer, so no component rule can remove it.
  assert.equal(declOf(readStyle("base.css"), ":focus-visible", "outline"), "3px solid var(--focus-ring)");
  assert.equal(declOf(readStyle("base.css"), ":focus-visible", "outline-offset"), "2px");
  assert.equal(declOf(readStyle("a11y.css"), ":focus-visible", "box-shadow"), "0 0 0 7px var(--focus-halo)");
  assert.match(readStyle("index.css"), /@layer reset, tokens, base, components, a11y;/);
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
    readAppStyles(), read("public/seo.css"), read("app/layout.tsx"), read("public/gioi-thieu/hoat-hinh.js"),
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
    "app/page.tsx", "app/domains/shell/view.tsx", "app/domains/shell/mobile-nav.tsx", "app/domains/shell/management-menu.tsx",
    "app/domains/shell/simulation-banner.tsx", "app/domains/shell/drawers.tsx", "app/domains/training/stage-widgets.tsx", "app/bootstrap.tsx",
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

// ---- Design tokens: one brand red, WCAG AA contrast in both themes -------------------------------------------------

const hexToRgb = (hex) => {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
};
const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const v = channel / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** sRGB mix like CSS color-mix(in srgb, a pct%, b). */
const mix = (a, pct, b) => `#${hexToRgb(a).map((channel, index) => Math.round((channel * pct) / 100 + hexToRgb(b)[index] * (1 - pct / 100)).toString(16).padStart(2, "0")).join("")}`;

function themeTokens() {
  const tokens = readStyle("tokens.css");
  const read = (selector, name) => declOf(tokens, selector, name);
  const light = {};
  for (const name of ["paper", "surface", "ink", "muted", "line", "control-line", "brand", "brand-strong", "brand-fill", "brand-fill-hover", "on-brand", "danger", "highlight", "success", "warning", "focus-ring", "focus-halo"]) light[name] = read(":root", `--${name}`);
  // The dark theme only re-declares what changes; everything else keeps the :root value.
  const dark = { ...light };
  for (const name of Object.keys(light)) dark[name] = read(':root[data-theme="dark"]', `--${name}`) ?? light[name];
  return { light, dark };
}

test("tokens: every colour token is a literal hex value declared once per theme", () => {
  const { light, dark } = themeTokens();
  for (const [theme, tokens] of Object.entries({ light, dark })) {
    for (const [name, value] of Object.entries(tokens)) assert.match(value ?? "", /^#[0-9a-f]{6}$/i, `${theme}: --${name} is ${value}`);
  }
  const css = readStyle("tokens.css");
  for (const legacy of ["--green", "--mint", "--red:", "--orange", "--ux-", "--visual-", "--cgs-", "--danger-text"]) {
    assert.ok(!css.includes(legacy), `legacy token ${legacy} must not come back`);
  }
});

test("tokens: text and component colours meet WCAG AA contrast in light and dark", () => {
  const { light, dark } = themeTokens();
  for (const [theme, t] of Object.entries({ light, dark })) {
    const text = [
      ["ink", t.ink, t.surface], ["ink", t.ink, t.paper], ["muted", t.muted, t.surface], ["muted", t.muted, t.paper],
      ["brand text", t.brand, t.surface], ["brand text", t.brand, t.paper], ["brand-strong text", t.brand_strong ?? t["brand-strong"], t.surface], ["brand-strong text", t["brand-strong"], t.paper],
      ["success text", t.success, t.surface], ["warning text", t.warning, t.surface],
      ["on-brand on brand-fill", t["on-brand"], t["brand-fill"]], ["on-brand on brand-fill-hover", t["on-brand"], t["brand-fill-hover"]], ["on-brand on danger", t["on-brand"], t.danger],
      ["highlight on brand-fill", t.highlight, t["brand-fill"]], ["brand on 12% brand tint", t.brand, mix(t.brand, 12, t.surface)], ["warning on 14% warning tint", t.warning, mix(t.warning, 14, t.surface)], ["warning on 18% warning tint", t.warning, mix(t.warning, 18, t.surface)],
      ["success on 12% success tint", t.success, mix(t.success, 12, t.surface)],
    ];
    for (const [label, fg, bg] of text) assert.ok(contrast(fg, bg) >= 4.5, `${theme}: ${label} ${fg} on ${bg} is ${contrast(fg, bg).toFixed(2)}:1 (< 4.5:1)`);
    const nonText = [["control-line", t["control-line"], t.surface], ["focus-ring", t["focus-ring"], t.surface], ["focus-ring", t["focus-ring"], t.paper], ["focus-ring vs halo", t["focus-ring"], t["focus-halo"]]];
    for (const [label, fg, bg] of nonText) assert.ok(contrast(fg, bg) >= 3, `${theme}: ${label} ${fg} on ${bg} is ${contrast(fg, bg).toFixed(2)}:1 (< 3:1)`);
  }
  // Highlight (yellow) carries dark text in light and the page background colour in dark (guest notice, badges).
  assert.ok(contrast(light.ink, light.highlight) >= 4.5);
  assert.ok(contrast(dark.paper, dark.highlight) >= 4.5);
});

test("tokens: a single brand red is shared by the app, the static pages, the consent banner and the page chrome", async () => {
  const { light, dark } = themeTokens();
  assert.equal(light.brand.toLowerCase(), "#b1122f");
  const seo = await read("public/seo.css");
  assert.equal(declOf(seo, ":root", "--seo-brand")?.toLowerCase(), light.brand.toLowerCase());
  assert.equal(declOf(seo, ':root[data-theme="dark"]', "--seo-brand")?.toLowerCase(), dark.brand.toLowerCase());
  assert.equal(declOf(seo, ":root", "--seo-brand-fill")?.toLowerCase(), light["brand-fill"].toLowerCase());
  assert.equal(declOf(seo, ':root[data-theme="dark"]', "--seo-brand-fill")?.toLowerCase(), dark["brand-fill"].toLowerCase());
  for (const file of ["app/styles/tokens.css", "public/seo.css", "public/consent.css", "public/seo-tools.css", "github-pages/index.html"]) {
    assert.doesNotMatch(await read(file), /#be1128/i, `${file} still uses the retired brand red #be1128`);
  }
  assert.match(await read("github-pages/index.html"), /<meta name="theme-color" content="#b1122f"/);
  assert.match(await read("public/consent.css"), /--cgs-accent: var\(--seo-accent, #b1122f\)/);
});

// ---- Navy "digital defence desk" tokens (frontend-design.css) --------------------------------------------------------

/** Resolves a token for one theme. tokens.css only uses #hex, var(--x) and color-mix(in srgb, A p%, B), which is all this understands. */
function tokenResolver(theme) {
  const tokens = readStyle("tokens.css");
  const raw = (name) => (theme === "dark" ? declOf(tokens, ':root[data-theme="dark"]', `--${name}`) : undefined) ?? declOf(tokens, ":root", `--${name}`);
  const colour = (value) => {
    const text = String(value).trim();
    if (/^#[0-9a-f]{6}$/i.test(text)) return text;
    const reference = /^var\(--([a-z0-9-]+)\)$/i.exec(text);
    if (reference) return colour(raw(reference[1]));
    const blend = /^color-mix\(in srgb, (.+) (\d+)%, (.+)\)$/.exec(text);
    if (blend) return mix(colour(blend[1]), Number(blend[2]), colour(blend[3]));
    throw new Error(`token value is not a colour this test understands: ${text}`);
  };
  return (name) => colour(raw(name));
}

test("tokens: the navy family is declared for both themes and resolves to real colours", () => {
  for (const theme of ["light", "dark"]) {
    const token = tokenResolver(theme);
    for (const name of ["night", "on-night", "night-deep", "night-chip", "ink-strong", "rule-strong", "command-rule", "on-highlight"]) {
      assert.match(token(name), /^#[0-9a-f]{6}$/i, `${theme}: --${name}`);
    }
  }
  assert.equal(tokenResolver("light")("night").toLowerCase(), "#0c2538");
  // Upstream neutrals (owner's design) are the single source for page, card, text and line colours.
  const light = tokenResolver("light");
  const dark = tokenResolver("dark");
  assert.deepEqual(["paper", "surface", "ink", "muted", "line"].map((name) => light(name).toLowerCase()), ["#f4f6f7", "#ffffff", "#15212b", "#5e6973", "#d9e0e5"]);
  assert.deepEqual(["paper", "surface", "ink", "muted", "line"].map((name) => dark(name).toLowerCase()), ["#0b1721", "#122330", "#f2f6f8", "#b6c1c8", "#2c414f"]);
});

test("tokens: text on the navy surfaces and on the yellow and navy tints used by frontend-design.css meets 4.5:1 in both themes", () => {
  for (const theme of ["light", "dark"]) {
    const token = tokenResolver(theme);
    const surface = token("surface");
    const pairs = [
      ["ink-strong on surface", token("ink-strong"), surface],
      ["ink-strong on paper", token("ink-strong"), token("paper")],
      ["ink-strong on banner tint", token("ink-strong"), mix(token("highlight"), 14, surface)],
      ["ink-strong on case file gradient", token("ink-strong"), mix(token("night"), 3, surface)],
      ["ink on story box", token("ink"), mix(token("night"), 4, surface)],
      ["ink on red-flag chip", token("ink"), mix(token("highlight"), 12, surface)],
      ["ink on unlock tint", token("ink"), mix(token("highlight"), 9, surface)],
      ["on-night on night (coach card)", token("on-night"), token("night")],
      ["on-night on night-chip (choice letter)", token("on-night"), token("night-chip")],
      ["highlight on night (coach eyebrow)", token("highlight"), token("night")],
      ["highlight on night-deep (hero icon)", token("highlight"), token("night-deep")],
      ["on-highlight on status icon tint", token("on-highlight"), mix(token("highlight"), 64, surface)],
      ["brand on selected scenario tint", token("brand"), mix(token("brand"), 7, surface)],
      ["success on progress icon tint", token("success"), mix(token("success"), 12, surface)],
    ];
    for (const [label, fg, bg] of pairs) assert.ok(contrast(fg, bg) >= 4.5, `${theme}: ${label} ${fg} on ${bg} is ${contrast(fg, bg).toFixed(2)}:1 (< 4.5:1)`);
  }
});
