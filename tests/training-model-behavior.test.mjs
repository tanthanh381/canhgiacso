// Behavioural tests for the training domain: scoring model, presentation
// helpers and the harder-wording table. The real modules are executed.
import assert from "node:assert/strict";
import test from "node:test";
import { createTsLoader } from "./helpers/ts-loader.mjs";

const load = createTsLoader();
const { evaluateGuestChoice } = load("app/domains/training/model.ts");
const presentation = load("app/domains/training/presentation.ts");
const { challengeDifficultyUpgrades } = load("app/domains/training/difficulty-upgrade.ts");
const { scenarios } = load("app/data.ts");

const scenario = {
  id: 7,
  title: "Tình huống thử",
  tip: "Mẹo mặc định",
  choices: [
    { text: "A", correct: true, moneyDelta: 0, awarenessDelta: 5, feedback: "Đúng rồi" },
    { text: "B", correct: false, moneyDelta: -2_000_000, awarenessDelta: -10 },
    { text: "C" },
  ],
};

test("evaluateGuestChoice maps a correct choice to its outcome and feedback", () => {
  assert.deepEqual(evaluateGuestChoice(scenario, 0), {
    scenarioId: 7,
    choiceIndex: 0,
    correct: true,
    moneyDelta: 0,
    awarenessDelta: 5,
    feedback: "Đúng rồi",
  });
});

test("evaluateGuestChoice reports losses and falls back to the scenario tip", () => {
  const wrong = evaluateGuestChoice(scenario, 1);
  assert.equal(wrong.correct, false);
  assert.equal(wrong.moneyDelta, -2_000_000);
  assert.equal(wrong.awarenessDelta, -10);
  assert.equal(wrong.feedback, "Mẹo mặc định");
});

test("evaluateGuestChoice treats missing answer fields as a safe, non-correct outcome", () => {
  const bare = evaluateGuestChoice(scenario, 2);
  assert.equal(bare.correct, false, "only an explicit correct === true counts");
  assert.equal(bare.moneyDelta, 0);
  assert.equal(bare.awarenessDelta, 0);
});

test("evaluateGuestChoice rejects out-of-range choice indexes", () => {
  assert.equal(evaluateGuestChoice(scenario, 3), null);
  assert.equal(evaluateGuestChoice(scenario, -1), null);
  assert.equal(evaluateGuestChoice(scenario, 1.5), null);
});

test("evaluateGuestChoice does not trust a truthy non-boolean correct flag", () => {
  const forged = { ...scenario, choices: [{ text: "X", correct: "true" }] };
  assert.equal(evaluateGuestChoice(forged, 0).correct, false);
});

test("bestCorrectStreak returns the longest run of correct answers", () => {
  const { bestCorrectStreak } = presentation;
  assert.equal(bestCorrectStreak([]), 0);
  assert.equal(bestCorrectStreak([{ correct: false }, { correct: false }]), 0);
  assert.equal(bestCorrectStreak([{ correct: true }, { correct: true }, { correct: false }, { correct: true }]), 2);
  assert.equal(bestCorrectStreak([{ correct: true }, { correct: false }, { correct: true }, { correct: true }, { correct: true }]), 3);
});

test("category and channel labels are localised and unknown values pass through", () => {
  const { scenarioCategoryLabel, scenarioChannelLabel } = presentation;
  assert.equal(scenarioCategoryLabel("Deepfake"), "Giả mạo bằng AI (deepfake)");
  assert.equal(scenarioCategoryLabel("Phishing"), "Lừa đảo giả mạo (phishing)");
  assert.equal(scenarioCategoryLabel("Brandname giả"), "SMS Brandname giả mạo");
  assert.equal(scenarioCategoryLabel("Đầu tư"), "Đầu tư");
  assert.equal(scenarioChannelLabel("Video call"), "Cuộc gọi video");
  assert.equal(scenarioChannelLabel("Nhóm chat"), "Nhóm trò chuyện");
  assert.equal(scenarioChannelLabel("Điện thoại"), "Điện thoại");
});

test("difficulty filters and tones cover every level exactly once", () => {
  const { difficulties, difficultyTone } = presentation;
  assert.deepEqual(difficulties, ["Tất cả", "Dễ", "Trung bình", "Khó", "Rất khó"]);
  assert.deepEqual(Object.keys(difficultyTone).sort(), ["Dễ", "Khó", "Rất khó", "Trung bình"].sort());
  assert.equal(new Set(Object.values(difficultyTone)).size, 4);
});

test("defense badges unlock from safe ids, streak and result count", () => {
  const { buildDefenseBadges } = presentation;
  const byName = (badges, name) => badges.find((badge) => badge.name === name);

  const empty = buildDefenseBadges(new Set(), 0, 0, 42);
  assert.equal(empty.length, 14);
  assert.ok(empty.every((badge) => badge.progress === 0 && badge.unlocked === false));

  const first = buildDefenseBadges(new Set([1]), 1, 1, 42);
  assert.equal(byName(first, "Tân binh cảnh giác").unlocked, true);
  assert.equal(byName(first, "Lá chắn Đồng").progress, 20);

  const five = buildDefenseBadges(new Set([1, 2, 3, 4, 5]), 5, 5, 42);
  assert.equal(byName(five, "Lá chắn Đồng").unlocked, true);
  assert.equal(byName(five, "Lá chắn Bạc").progress, 50);
  assert.equal(byName(five, "Tâm lý thép").unlocked, true);

  const impersonation = buildDefenseBadges(new Set([1, 12, 13]), 3, 3, 42);
  assert.equal(byName(impersonation, "Khắc tinh mạo danh").unlocked, true);
});

test("the legendary badge needs the full library and progress is capped at 100%", () => {
  const { buildDefenseBadges } = presentation;
  const all = new Set(scenarios.map((s) => s.id));
  const done = buildDefenseBadges(all, all.size, all.size, all.size);
  const legendary = done.find((badge) => badge.tier === "Huyền thoại");
  assert.equal(legendary.unlocked, true);
  assert.ok(done.every((badge) => badge.progress <= 100));
  const almost = buildDefenseBadges(new Set([...all].slice(1)), all.size - 1, 3, all.size);
  assert.equal(almost.find((badge) => badge.tier === "Huyền thoại").unlocked, false);
});

// --- harder-wording table (app/domains/training/difficulty-upgrade.ts) ---

test("every scenario has exactly one upgrade entry and no entry is orphaned", () => {
  const scenarioIds = scenarios.map((s) => s.id).sort((a, b) => a - b);
  const upgradeIds = Object.keys(challengeDifficultyUpgrades).map(Number).sort((a, b) => a - b);
  assert.deepEqual(upgradeIds, scenarioIds);
});

test("each upgrade has three distinct, substantive choices and exposes no answer key", () => {
  for (const [id, upgrade] of Object.entries(challengeDifficultyUpgrades)) {
    assert.deepEqual(Object.keys(upgrade), ["choices"], `scenario ${id}: only wording may be public`);
    assert.equal(upgrade.choices.length, 3, `scenario ${id}`);
    assert.equal(new Set(upgrade.choices).size, 3, `scenario ${id}: choices must differ`);
    for (const text of upgrade.choices) {
      assert.equal(typeof text, "string");
      assert.ok(text.trim().length >= 40, `scenario ${id}: choice too short to be a plausible action`);
      assert.equal(text, text.trim(), `scenario ${id}: stray whitespace`);
    }
  }
});

test("the published scenario library uses the upgraded wording and keeps answers server-side", () => {
  for (const item of scenarios) {
    assert.deepEqual(
      item.choices.map((choice) => choice.text),
      challengeDifficultyUpgrades[item.id].choices,
      `scenario ${item.id} must publish the upgraded choices`,
    );
    for (const choice of item.choices) {
      assert.deepEqual(Object.keys(choice), ["text"], `scenario ${item.id}: public choices carry no answer fields`);
    }
  }
});
