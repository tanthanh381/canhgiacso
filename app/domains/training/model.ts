import type { SiteContent } from "../../data";

export type Result = { scenarioId: number; correct: boolean; choiceIndex: number };
export type GameHistory = { runId: string; finishedAt: string; balance: number; completed: number; correct: number };
export type ChoiceOutcome = { scenarioId: number; choiceIndex: number; correct: boolean; moneyDelta: number; awarenessDelta: number; feedback: string };
export type GameState = { run_id: string; balance: number; awareness: number; results: Result[]; history: GameHistory[]; outcome?: ChoiceOutcome };
export type PendingChoice = { userId: string; runId: string; scenario: SiteContent["scenarios"][number]; index: number };

export type StoredProgress = {
  balance: number;
  awareness: number;
  results: Result[];
  dark: boolean;
  playerName: string;
};

export function evaluateGuestChoice(
  scenario: SiteContent["scenarios"][number],
  index: number,
): ChoiceOutcome | null {
  const choice = scenario.choices[index];
  if (!choice) return null;
  return {
    scenarioId: scenario.id,
    choiceIndex: index,
    correct: choice.correct === true,
    moneyDelta: typeof choice.moneyDelta === "number" ? choice.moneyDelta : 0,
    awarenessDelta: typeof choice.awarenessDelta === "number" ? choice.awarenessDelta : 0,
    feedback: choice.feedback ?? scenario.tip,
  };
}
