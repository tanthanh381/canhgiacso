import type { Scenario } from "../../data";

export type AnalyticsUser = {
  username: string;
  displayName: string;
  createdAt: string;
  completed: number;
  correct: number;
  advancedCompleted: number;
  advancedCorrect: number;
  advancedCompletedAt: string | null;
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
    advancedCompleted: Number(user.advanced_completed ?? 0),
    advancedCorrect: Number(user.advanced_correct ?? 0),
    advancedCompletedAt: user.advanced_completed_at ? String(user.advanced_completed_at) : null,
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


export type AwardCandidate = AnalyticsUser & {
  rank: number;
  awardTier: "Quán quân" | "Á quân" | "Hạng ba" | "Bảng vàng";
};

export function rankAwardCandidates(users: AnalyticsUser[], scenarioCount: number, limit = 10): AwardCandidate[] {
  return users
    .filter((user) => user.completed >= scenarioCount && user.advancedCompleted >= 6)
    .sort((a, b) =>
      b.advancedCorrect - a.advancedCorrect
      || b.correct - a.correct
      || b.balance - a.balance
      || b.awareness - a.awareness
      || new Date(a.advancedCompletedAt ?? "9999-12-31").getTime() - new Date(b.advancedCompletedAt ?? "9999-12-31").getTime()
      || a.username.localeCompare(b.username, "vi")
    )
    .slice(0, Math.max(1, limit))
    .map((user, index) => ({
      ...user,
      rank: index + 1,
      awardTier: index === 0 ? "Quán quân" : index === 1 ? "Á quân" : index === 2 ? "Hạng ba" : "Bảng vàng",
    }));
}
