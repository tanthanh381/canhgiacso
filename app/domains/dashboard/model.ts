import type { Scenario } from "../../data";

export type AnalyticsUser = {
  username: string;
  displayName: string;
  createdAt: string;
  completed: number;
  correct: number;
  accuracy: number;
  awareness: number;
  balance: number;
  loss: number;
  risk: "Thấp" | "Trung bình" | "Cao";
};

export type DashboardStatus = "idle" | "loading" | "ready" | "forbidden" | "error";
export type ScenarioRisk = { scenarioId: number; attempts: number; wrong: number; rate: number };

export function mapAnalyticsUsers(rows: Array<Record<string, unknown>>): AnalyticsUser[] {
  return rows.map((user) => ({
    username: String(user.username ?? ""),
    displayName: String(user.display_name ?? ""),
    createdAt: String(user.created_at ?? ""),
    completed: Number(user.completed ?? 0),
    correct: Number(user.correct ?? 0),
    accuracy: Number(user.accuracy ?? 0),
    awareness: Number(user.awareness ?? 100),
    balance: Number(user.balance ?? 300_000_000),
    loss: Number(user.loss ?? 0),
    risk: user.risk === "Cao" || user.risk === "Thấp" ? user.risk : "Trung bình",
  }));
}

export function mapScenarioRisks(rows: Array<Record<string, unknown>>): ScenarioRisk[] {
  return rows.map((item) => ({
    scenarioId: Number(item.scenario_id ?? 0),
    attempts: Number(item.attempts ?? 0),
    wrong: Number(item.wrong ?? 0),
    rate: Number(item.rate ?? 0),
  }));
}

export function summarizeAnalytics(users: AnalyticsUser[]) {
  const attempts = users.reduce((sum, user) => sum + user.completed, 0);
  const correct = users.reduce((sum, user) => sum + user.correct, 0);
  const active = users.filter((user) => user.completed > 0).length;
  return {
    active,
    participation: users.length ? Math.round((active / users.length) * 100) : 0,
    attempts,
    correct,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
    highRisk: users.filter((user) => user.risk === "Cao").length,
    totalLoss: users.reduce((sum, user) => sum + user.loss, 0),
  };
}

export function topScenarioRisks(scenarios: Scenario[], risks: ScenarioRisk[], limit = 5) {
  return risks
    .map((risk) => ({
      ...(scenarios.find((scenario) => scenario.id === risk.scenarioId) ?? scenarios[0]),
      ...risk,
    }))
    .sort((a, b) => b.rate - a.rate || b.attempts - a.attempts)
    .slice(0, limit);
}
