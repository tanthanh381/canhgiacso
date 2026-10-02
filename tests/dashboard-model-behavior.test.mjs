// Behavioural tests for the CISO dashboard mapping/aggregation layer
// (app/domains/dashboard/model.ts). The real functions are executed.
import assert from "node:assert/strict";
import test from "node:test";
import { createTsLoader } from "./helpers/ts-loader.mjs";

const load = createTsLoader();
const { mapAnalyticsUsers, mapScenarioRisks, summarizeAnalytics, topScenarioRisks } = load("app/domains/dashboard/model.ts");

const user = (overrides = {}) => ({
  username: "u", displayName: "U", createdAt: "2026-09-01", completed: 0, correct: 0,
  accuracy: 0, awareness: 100, balance: 300_000_000, loss: 0, risk: "Thấp", ...overrides,
});

test("mapAnalyticsUsers converts snake_case rows and coerces numeric strings", () => {
  const [mapped] = mapAnalyticsUsers([{
    username: "an", display_name: "Nguyễn An", created_at: "2026-09-20T00:00:00Z",
    completed: "12", correct: "9", accuracy: "75", awareness: "60", balance: "250000000", loss: "50000000", risk: "Cao",
  }]);
  assert.deepEqual(mapped, {
    username: "an", displayName: "Nguyễn An", createdAt: "2026-09-20T00:00:00Z",
    completed: 12, correct: 9, accuracy: 75, awareness: 60, balance: 250_000_000, loss: 50_000_000, risk: "Cao",
  });
});

test("mapAnalyticsUsers applies safe defaults for missing fields", () => {
  const [mapped] = mapAnalyticsUsers([{}]);
  assert.equal(mapped.username, "");
  assert.equal(mapped.completed, 0);
  assert.equal(mapped.awareness, 100, "unknown awareness defaults to the starting value");
  assert.equal(mapped.balance, 300_000_000, "unknown balance defaults to the starting balance");
  assert.equal(mapped.risk, "Trung bình", "unknown risk is the neutral level");
});

test("mapAnalyticsUsers only trusts the three known risk labels", () => {
  const risks = mapAnalyticsUsers([{ risk: "Cao" }, { risk: "Thấp" }, { risk: "Trung bình" }, { risk: "Critical" }, { risk: null }]).map((u) => u.risk);
  assert.deepEqual(risks, ["Cao", "Thấp", "Trung bình", "Trung bình", "Trung bình"]);
});

test("mapScenarioRisks maps scenario rows and defaults to zero", () => {
  assert.deepEqual(mapScenarioRisks([{ scenario_id: "4", attempts: "10", wrong: "3", rate: "30" }, {}]), [
    { scenarioId: 4, attempts: 10, wrong: 3, rate: 30 },
    { scenarioId: 0, attempts: 0, wrong: 0, rate: 0 },
  ]);
});

test("summarizeAnalytics on an empty cohort never divides by zero", () => {
  assert.deepEqual(summarizeAnalytics([]), { active: 0, participation: 0, attempts: 0, correct: 0, accuracy: 0, highRisk: 0, totalLoss: 0 });
});

test("summarizeAnalytics aggregates participation, accuracy, high-risk users and loss", () => {
  const summary = summarizeAnalytics([
    user({ completed: 10, correct: 8, risk: "Thấp", loss: 0 }),
    user({ completed: 5, correct: 1, risk: "Cao", loss: 60_000_000 }),
    user({ completed: 0, correct: 0, risk: "Cao", loss: 0 }),
    user({ completed: 0, correct: 0, risk: "Trung bình", loss: 10_000_000 }),
  ]);
  assert.equal(summary.active, 2);
  assert.equal(summary.participation, 50);
  assert.equal(summary.attempts, 15);
  assert.equal(summary.correct, 9);
  assert.equal(summary.accuracy, 60);
  assert.equal(summary.highRisk, 2, "high risk counts users regardless of activity");
  assert.equal(summary.totalLoss, 70_000_000);
});

test("summarizeAnalytics rounds percentages to whole numbers", () => {
  const summary = summarizeAnalytics([user({ completed: 3, correct: 1 }), user({ completed: 0 }), user({ completed: 0 })]);
  assert.equal(summary.participation, 33);
  assert.equal(summary.accuracy, 33);
});

test("topScenarioRisks sorts by failure rate, then attempts, and honours the limit", () => {
  const library = [1, 2, 3, 4, 5, 6, 7].map((id) => ({ id, title: `Tình huống ${id}` }));
  const risks = [
    { scenarioId: 1, attempts: 10, wrong: 5, rate: 50 },
    { scenarioId: 2, attempts: 40, wrong: 20, rate: 50 },
    { scenarioId: 3, attempts: 8, wrong: 7, rate: 88 },
    { scenarioId: 4, attempts: 5, wrong: 0, rate: 0 },
    { scenarioId: 5, attempts: 9, wrong: 3, rate: 33 },
    { scenarioId: 6, attempts: 1, wrong: 1, rate: 100 },
  ];
  const top = topScenarioRisks(library, risks);
  assert.deepEqual(top.map((item) => item.scenarioId), [6, 3, 2, 1, 5], "default limit is 5");
  assert.equal(top[0].title, "Tình huống 6", "scenario details are merged into the risk row");
  assert.deepEqual(topScenarioRisks(library, risks, 2).map((item) => item.scenarioId), [6, 3]);
  assert.equal(risks[0].scenarioId, 1, "the input array is not reordered");
});

test("topScenarioRisks falls back to the first scenario for unknown ids", () => {
  const library = [{ id: 1, title: "Đầu tiên" }];
  const [row] = topScenarioRisks(library, [{ scenarioId: 99, attempts: 2, wrong: 1, rate: 50 }]);
  assert.equal(row.title, "Đầu tiên");
  assert.equal(row.scenarioId, 99);
});
