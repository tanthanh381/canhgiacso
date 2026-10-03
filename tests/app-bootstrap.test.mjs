import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const entry = read("github-pages/main.tsx");
const layout = read("app/layout.tsx");
const root = read("app/bootstrap.tsx");
const page = read("app/page.tsx");
const theme = read("app/shared/theme.ts");
const widgets = read("app/domains/training/stage-widgets.tsx");

test("both entry points start the application through the shared AppRoot", () => {
  assert.match(entry, /import \{ AppRoot, initTheme \} from "\.\.\/app\/bootstrap"/);
  assert.match(entry, /initTheme\(\);/);
  assert.match(entry, /<AppRoot>\s*<App \/>\s*<\/AppRoot>/);
  assert.match(layout, /import \{ AppRoot \} from "\.\/bootstrap"/);
  assert.match(layout, /<AppRoot verifySession=\{false\}>\{children\}<\/AppRoot>/);
  // Nothing else is mounted next to the application: the old overlay components are gone.
  assert.doesNotMatch(entry, /UxRefresh|InteractivePracticeNav/);
});

test("AppRoot adds an error boundary, the session check and the MFA gate in one place", () => {
  assert.match(root, /class AppErrorBoundary extends Component/);
  assert.match(root, /static getDerivedStateFromError\(\)/);
  assert.match(root, /Trang gặp lỗi khi hiển thị/);
  assert.match(root, /Tiến trình đã lưu của bạn không bị xóa/);
  assert.match(root, /<PrivilegedMfaGate \/>/);
  assert.match(root, /verifySession \? <SessionBootstrap>\{app\}<\/SessionBootstrap> : app/);
});

test("the server-rendered build loads the same consent and theme scripts as the static pages, without scanning the DOM", () => {
  assert.match(layout, /<script src="\/theme-init\.js" defer \/>/);
  assert.match(layout, /<script src="\/consent\.js" defer \/>/);
  assert.doesNotMatch(layout, /MutationObserver|querySelector/);
  assert.match(page, /useAppReady\(hydrated && contentReady\)/);
  assert.match(read("app/shared/app-ready.ts"), /APP_READY_CLASS = "refresh-ready"/);
  assert.match(layout, /body\.refresh-ready #refresh-shell/);
});

test("theme: one storage key and one rule (saved choice, then the system setting) in the app, the static pages and the consent banner", () => {
  const key = read("app/shared/browser-storage.ts").match(/THEME_KEY = "([^"]+)"/)?.[1];
  assert.equal(key, "khien-so-theme");
  assert.match(read("public/theme-init.js"), new RegExp(`KEY = "${key}"`));
  assert.match(read("public/consent.js"), new RegExp(`THEME_KEY = '${key}'`));
  assert.match(theme, /safeStorageGet\(THEME_KEY\)/);
  assert.match(theme, /prefers-color-scheme: dark/);
  assert.match(theme, /document\.documentElement\.dataset\.theme = theme/);
  assert.match(page, /applyTheme\(dark \? "dark" : "light"\)/);
});

test("challenge widgets are plain components driven by props", () => {
  assert.match(widgets, /export function ScenarioTools/);
  assert.match(widgets, /disabled=\{locked\}/, "locked difficulties can not be selected");
  assert.match(widgets, /GUEST_CONVERSION_THRESHOLD = 3/);
  assert.match(widgets, /export function LearningMoment\(\{ safe, redFlags, tip \}/);
  assert.match(page, /<StageActions onOpenScenarios=\{\(\) => drawers\.show\("scenarios"\)\}/);
  assert.match(page, /attemptedCount >= GUEST_CONVERSION_THRESHOLD/);
  assert.match(page, /<LearningMoment safe=\{selectedOutcome\.correct\} redFlags=\{selected\.redFlags\} tip=\{selected\.tip\} \/>/);
  // The side panels are not reachable by keyboard while they are off-screen.
  assert.match(page, /inert=\{compactLayout && drawers\.open !== "scenarios"\}/);
  assert.match(page, /inert=\{drawers\.open !== "insight"\}/);
});

test("the evidence box has a visible entry on the achievements page", () => {
  assert.match(page, /className="evidence-entry" onClick=\{\(\) => setView\("evidence"\)\}/);
  assert.match(page, /Quay lại thành tích/);
});
