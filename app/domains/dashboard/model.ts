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
