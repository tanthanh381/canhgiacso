import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { declOf, parseCss, readAppStyles, readStyle, stylesDir } from "./helpers/styles.mjs";

// The owner's frontend design (command bar, rails instead of floating cards, one status strip, the "case file" scenario, the
// night coach card, sentence-case eyebrows) lives in app/styles/frontend-design.css. It is part of the same cascade-layer
// system as every other stylesheet: tokens only, no !important, no theme-class selectors.

const read = (path) => readFileSync(path, "utf8");
const design = readStyle("frontend-design.css");
const index = readStyle("index.css");
const walk = (dir, extensions, out = []) => {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, extensions, out);
    else if (extensions.some((extension) => name.endsWith(extension))) out.push(path);
  }
  return out;
};

test("frontend-design.css lives in app/styles and is imported in the components layer, after the screens and before the accessibility layer", () => {
  assert.ok(!existsSync("app/frontend-design.css"), "the old, unimported copy must not come back");
  assert.ok(existsSync(new URL("frontend-design.css", stylesDir)));
  const imports = [...index.matchAll(/@import\s+"\.\/([^"]+)"\s+layer\(([a-z0-9-]+)\)/g)].map((match) => ({ file: match[1], layer: match[2] }));
  const position = (file) => imports.findIndex((entry) => entry.file === file);
  assert.equal(imports[position("frontend-design.css")]?.layer, "components");
  for (const entry of imports.filter((candidate) => candidate.layer === "components" && candidate.file !== "frontend-design.css")) {
    assert.ok(position(entry.file) < position("frontend-design.css"), `${entry.file} must load before frontend-design.css so the design refines it`);
  }
  assert.ok(position("frontend-design.css") < position("a11y.css"), "the accessibility layer stays last");
});

test("frontend-design.css uses tokens only: no raw colours, no !important, no theme-class selectors, no retired token names", () => {
  const css = design.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(css, /!important/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i, "colours come from tokens.css");
  assert.doesNotMatch(css, /\b(?:rgba?|hsla?)\(/i, "colours come from tokens.css (use color-mix on tokens for tints)");
  assert.doesNotMatch(css, /\.(?:app\.)?dark\b|\[data-theme|:root/, "the dark theme is switched by the tokens, not by selectors");
  for (const retired of ["--fd-", "--green", "--mint", "--red:", "--orange", "--ux-", "--visual-", "--cgs-"]) assert.ok(!css.includes(retired), `${retired} must not be used`);
  assert.doesNotMatch(css, /transition:\s*none/, "motion is controlled by the reduced-motion block in the accessibility layer");
});

test("frontend-design.css only styles classes that the React components render", () => {
  const sources = [...walk("app", [".ts", ".tsx"])].map(read).join("\n");
  const missing = new Set();
  for (const rule of parseCss(design)) {
    for (const selector of rule.selectors) {
      for (const match of selector.matchAll(/\.([a-zA-Z][\w-]*)/g)) {
        const name = match[1];
        if (!new RegExp(`(?<![\\w-])${name}(?![\\w-])`).test(sources)) missing.add(`.${name} (${selector})`);
      }
    }
  }
  assert.deepEqual([...missing], [], "selectors for markup that no longer exists are dead CSS");
});

test("eyebrows and small labels use sentence case across the SPA styles and copy", () => {
  const css = readAppStyles();
  for (const selector of [".eyebrow", ".scenario-meta", ".guest-limit-grid strong", ".security-awareness-banner strong", ".red-flags strong"]) {
    for (const rule of parseCss(css)) {
      if (!rule.selectors.includes(selector)) continue;
      for (const decl of rule.decls) assert.ok(!(decl.prop === "text-transform" && decl.value === "uppercase"), `${selector} must not be uppercased by CSS (${rule.ctx || "base"})`);
    }
  }
  assert.equal(declOf(design, ".eyebrow", "text-transform"), "none");
  assert.equal(declOf(design, ".scenario-meta", "text-transform"), "none");
  assert.equal(declOf(design, ".guest-limit-grid strong", "text-transform"), "none");
  assert.equal(declOf(design, ".red-flags strong", "text-transform"), "none");
  // No eyebrow of the player-facing screens is typed in capitals (the admin area and the HDBANK · IT SECURITY brand tag keep theirs).
  const screens = ["app/page.tsx", ...walk("app/domains", [".tsx"]), "app/data.ts"];
  for (const file of screens) {
    for (const match of read(file).matchAll(/className="eyebrow"[^>]*>([^<{]+)</g)) {
      const text = match[1].replace(/HDBANK · IT SECURITY/g, "").trim();
      assert.doesNotMatch(text, /\p{Lu}{3,}/u, `${file}: eyebrow "${match[1]}" is typed in capitals`);
    }
    for (const match of read(file).matchAll(/(?:library|news)Eyebrow:\s*"([^"]+)"/g)) assert.doesNotMatch(match[1], /\p{Lu}{3,}/u, `${file}: ${match[0]}`);
  }
});

test("the scenario stage is a case file: 6px brand rail, night coach card, one status strip", () => {
  assert.equal(declOf(design, ".scenario-stage.card-surface", "border-left"), "6px solid var(--brand)");
  assert.equal(declOf(design, ".coach-card", "background"), "var(--night)");
  assert.equal(declOf(design, ".coach-card", "color"), "var(--on-night)");
  assert.equal(declOf(design, ".status-card", "border-right"), "1px solid var(--line)");
  assert.equal(declOf(design, ".status-grid", "gap"), "0");
  assert.match(readStyle("base.css"), /\.app\s*\{[^}]*72px 72px/s, "the 72px desk grid is the .app background");
});

test("the desktop tips and progress drawer is reachable: stage actions are shown at every width and only the scenario trigger is compact-only", () => {
  const game = readStyle("game.css");
  assert.notEqual(declOf(game, ".ux-stage-actions", "display"), "none");
  assert.equal(declOf(game, ".ux-scenario-trigger", "display"), "none");
  assert.equal(declOf(game, ".ux-scenario-trigger", "display", "@media (max-width: 900px)"), "inline-flex");
  assert.notEqual(declOf(game, ".ux-insight-trigger", "display"), "none");
  const drawers = read("app/domains/shell/drawers.tsx");
  assert.match(drawers, /available: Readonly<Record<Drawer, boolean>>/);
  assert.match(drawers, /available\[requested\]/);
  assert.match(read("app/page.tsx"), /useDrawers\(\{ scenarios: view === "game" && compactLayout, insight: view === "game" \}\)/);
});

test("the redundant practice call-to-action next to the Thực hành tab stays removed (the tab is the entry point)", () => {
  assert.ok(!/ux-practice-cta|Luyện nhận diện phishing/.test(readAppStyles() + read("app/domains/security-awareness/view.tsx")));
});
