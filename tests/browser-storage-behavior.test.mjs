// Behavioural tests for app/shared/browser-storage.ts using a fake
// `window.localStorage`, including storage that throws (private mode, blocked
// cookies, quota) and non-browser environments where `window` does not exist.
import assert from "node:assert/strict";
import test from "node:test";
import { createTsLoader } from "./helpers/ts-loader.mjs";

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { data.set(key, String(value)); },
    removeItem: (key) => { data.delete(key); },
  };
}

function throwingStorage() {
  const fail = () => { throw new DOMException("The operation is insecure.", "SecurityError"); };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

const withWindow = (storage) => createTsLoader({ globals: { window: { localStorage: storage } } })("app/shared/browser-storage.ts");

test("storage keys are stable (changing them would orphan saved progress)", () => {
  const api = withWindow(memoryStorage());
  assert.equal(api.LEGACY_PROGRESS_KEY, "khien-so-progress");
  assert.equal(api.THEME_KEY, "khien-so-theme");
  assert.equal(api.GUEST_CERTIFICATE_KEY, "canh-giac-so-guest-certificate");
  assert.equal(api.progressKey(null), "khien-so-progress:guest");
  assert.equal(api.progressKey("an.nguyen"), "khien-so-progress:an.nguyen");
});

test("safeStorage get/set/remove round-trip through localStorage", () => {
  const storage = memoryStorage();
  const api = withWindow(storage);
  assert.equal(api.safeStorageGet("k"), null, "missing keys read as null");
  assert.equal(api.safeStorageSet("k", "v"), true);
  assert.equal(storage.data.get("k"), "v");
  assert.equal(api.safeStorageGet("k"), "v");
  assert.equal(api.safeStorageRemove("k"), true);
  assert.equal(api.safeStorageGet("k"), null);
});

test("safeStorage helpers swallow storage exceptions and report failure", () => {
  const api = withWindow(throwingStorage());
  assert.equal(api.safeStorageGet("k"), null);
  assert.equal(api.safeStorageSet("k", "v"), false);
  assert.equal(api.safeStorageRemove("k"), false);
});

test("safeStorage helpers are inert where `window` does not exist (SSR / workers)", () => {
  const api = createTsLoader({ globals: { window: undefined } })("app/shared/browser-storage.ts");
  assert.equal(api.safeStorageGet("k"), null);
  assert.equal(api.safeStorageSet("k", "v"), false);
  assert.equal(api.safeStorageRemove("k"), false);
});

test("safeStorageSet reports a full quota instead of throwing", () => {
  const full = { getItem: () => null, setItem: () => { throw new DOMException("quota", "QuotaExceededError"); }, removeItem() {} };
  assert.equal(withWindow(full).safeStorageSet("k", "v"), false);
});

test("readStoredProgress returns null for missing, empty or corrupt entries", () => {
  const key = "khien-so-progress:guest";
  assert.equal(withWindow(memoryStorage()).readStoredProgress(key), null);
  assert.equal(withWindow(memoryStorage({ [key]: "" })).readStoredProgress(key), null);
  assert.equal(withWindow(memoryStorage({ [key]: "{not json" })).readStoredProgress(key), null);
  assert.equal(withWindow(throwingStorage()).readStoredProgress(key), null, "a throwing storage must not crash the game");
});

test("readStoredProgress restores a well-formed save", () => {
  const key = "khien-so-progress:an";
  const saved = {
    balance: 120_000_000, awareness: 80, dark: true, playerName: "  An  ",
    results: [{ scenarioId: 1, correct: true, choiceIndex: 0 }, { scenarioId: 2, correct: false, choiceIndex: 2 }],
  };
  const progress = withWindow(memoryStorage({ [key]: JSON.stringify(saved) })).readStoredProgress(key);
  assert.deepEqual(progress, {
    balance: 120_000_000, awareness: 80, dark: true, playerName: "An", results: saved.results,
  });
});

test("readStoredProgress falls back to safe defaults for wrong types", () => {
  const key = "p";
  const progress = withWindow(memoryStorage({ [key]: JSON.stringify({ balance: "999", awareness: null, dark: "yes", playerName: 42, results: "none" }) })).readStoredProgress(key);
  assert.deepEqual(progress, { balance: 300_000_000, awareness: 100, dark: false, playerName: "Người chơi ẩn danh", results: [] });
});

test("readStoredProgress clamps tampered balance and awareness into the legal range", () => {
  const read = (saved) => withWindow(memoryStorage({ p: JSON.stringify(saved) })).readStoredProgress("p");
  assert.equal(read({ balance: 9e12, awareness: 500 }).balance, 300_000_000, "cannot invent money");
  assert.equal(read({ balance: 9e12, awareness: 500 }).awareness, 100);
  assert.equal(read({ balance: -5, awareness: -1 }).balance, 0);
  assert.equal(read({ balance: -5, awareness: -1 }).awareness, 0);
  assert.equal(read({ balance: null }).balance, 300_000_000, "JSON turns Infinity/NaN into null, which falls back to the default");
});

test("readStoredProgress drops malformed or out-of-range results", () => {
  const good = { scenarioId: 5, correct: true, choiceIndex: 1 };
  const bad = [
    null, "x", 7, [],
    { scenarioId: 0, correct: true, choiceIndex: 0 },
    { scenarioId: 101, correct: true, choiceIndex: 0 },
    { scenarioId: 1.5, correct: true, choiceIndex: 0 },
    { scenarioId: 3, correct: "true", choiceIndex: 0 },
    { scenarioId: 3, correct: true, choiceIndex: 3 },
    { scenarioId: 3, correct: true, choiceIndex: -1 },
    { scenarioId: "3", correct: true, choiceIndex: 0 },
  ];
  const progress = withWindow(memoryStorage({ p: JSON.stringify({ results: [...bad, good] }) })).readStoredProgress("p");
  assert.deepEqual(progress.results, [good]);
});

test("readStoredProgress truncates the player name to 32 characters", () => {
  const progress = withWindow(memoryStorage({ p: JSON.stringify({ playerName: "x".repeat(80) }) })).readStoredProgress("p");
  assert.equal(progress.playerName.length, 32);
  const blank = withWindow(memoryStorage({ p: JSON.stringify({ playerName: "   " }) })).readStoredProgress("p");
  assert.equal(blank.playerName, "Người chơi ẩn danh");
});
