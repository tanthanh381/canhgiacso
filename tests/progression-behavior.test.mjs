// Behavioural tests: these EXECUTE app/progression.ts (level unlock rules)
// against the real scenario library instead of matching its source text.
import assert from "node:assert/strict";
import test from "node:test";
import { createTsLoader } from "./helpers/ts-loader.mjs";

const load = createTsLoader();
const { difficultyOrder, getUnlockedDifficulties, getLevelProgress } = load("app/progression.ts");
const { scenarios } = load("app/data.ts");

const idsOf = (...levels) => scenarios.filter((s) => levels.includes(s.difficulty)).map((s) => s.id);
const unlocked = (ids) => [...getUnlockedDifficulties(scenarios, new Set(ids))];

test("difficulty order is Dễ -> Trung bình -> Khó -> Rất khó and every level has scenarios", () => {
  assert.deepEqual(difficultyOrder, ["Dễ", "Trung bình", "Khó", "Rất khó"]);
  for (const level of difficultyOrder) {
    assert.ok(idsOf(level).length > 0, `level "${level}" must contain at least one scenario`);
  }
  assert.equal(scenarios.length, 42);
});

test("a new player only has the easiest level unlocked", () => {
  assert.deepEqual(unlocked([]), ["Dễ"]);
});

test("a level unlocks only after EVERY scenario of the previous level is completed", () => {
  const easy = idsOf("Dễ");
  assert.deepEqual(unlocked(easy.slice(0, -1)), ["Dễ"], "one easy scenario missing keeps level 2 locked");
  assert.deepEqual(unlocked(easy), ["Dễ", "Trung bình"]);
  assert.deepEqual(unlocked([...easy, ...idsOf("Trung bình").slice(0, -1)]), ["Dễ", "Trung bình"]);
  assert.deepEqual(unlocked([...easy, ...idsOf("Trung bình")]), ["Dễ", "Trung bình", "Khó"]);
});

test("completing everything unlocks all four levels in order", () => {
  assert.deepEqual(unlocked(scenarios.map((s) => s.id)), difficultyOrder);
});

test("skipping a level never unlocks a later one", () => {
  // Hard + very hard done, but the easy level is untouched: nothing beyond level 1.
  assert.deepEqual(unlocked(idsOf("Khó", "Rất khó")), ["Dễ"]);
  // Easy + hard done but medium missing: stops at medium.
  assert.deepEqual(unlocked([...idsOf("Dễ"), ...idsOf("Khó")]), ["Dễ", "Trung bình"]);
});

test("unrelated or unknown completed ids do not unlock anything", () => {
  assert.deepEqual(unlocked([999, -1, 0]), ["Dễ"]);
});

test("a level with no scenarios counts as already completed (documented edge case)", () => {
  const withoutEasy = scenarios.filter((s) => s.difficulty !== "Dễ");
  const result = [...getUnlockedDifficulties(withoutEasy, new Set())];
  assert.deepEqual(result, ["Dễ", "Trung bình"]);
});

test("getLevelProgress reports the highest unlocked level and its completion count", () => {
  const easy = idsOf("Dễ");
  const start = getLevelProgress(scenarios, new Set(), new Set(["Dễ"]));
  assert.deepEqual(start, { currentDifficulty: "Dễ", nextDifficulty: "Trung bình", completed: 0, total: easy.length });

  const partial = getLevelProgress(scenarios, new Set(easy.slice(0, 2)), new Set(["Dễ"]));
  assert.equal(partial.completed, 2);
  assert.equal(partial.total, easy.length);

  const medium = getLevelProgress(scenarios, new Set(easy), getUnlockedDifficulties(scenarios, new Set(easy)));
  assert.equal(medium.currentDifficulty, "Trung bình");
  assert.equal(medium.nextDifficulty, "Khó");
  assert.equal(medium.completed, 0, "completions of the previous level are not counted for the current one");
  assert.equal(medium.total, idsOf("Trung bình").length);
});

test("getLevelProgress at the top level has no next level", () => {
  const all = new Set(scenarios.map((s) => s.id));
  const top = getLevelProgress(scenarios, all, getUnlockedDifficulties(scenarios, all));
  assert.equal(top.currentDifficulty, "Rất khó");
  assert.equal(top.nextDifficulty, null);
  assert.equal(top.completed, top.total);
});

test("getLevelProgress falls back to the first level when nothing is unlocked", () => {
  const progress = getLevelProgress(scenarios, new Set(), new Set());
  assert.equal(progress.currentDifficulty, "Dễ");
  assert.equal(progress.nextDifficulty, "Trung bình");
});
