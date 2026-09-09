import type { Difficulty, Scenario } from "./data";

export const difficultyOrder: Difficulty[] = ["Dễ", "Trung bình", "Khó", "Rất khó"];

export function getUnlockedDifficulties(
  scenarios: Scenario[],
  completedIds: ReadonlySet<number>,
): Set<Difficulty> {
  const unlocked = new Set<Difficulty>();

  for (let index = 0; index < difficultyOrder.length; index += 1) {
    const difficulty = difficultyOrder[index];
    if (index === 0) {
      unlocked.add(difficulty);
      continue;
    }

    const previousDifficulty = difficultyOrder[index - 1];
    const previousScenarios = scenarios.filter((scenario) => scenario.difficulty === previousDifficulty);
    const previousCompleted = previousScenarios.every((scenario) => completedIds.has(scenario.id));
    if (!previousCompleted) break;
    unlocked.add(difficulty);
  }

  return unlocked;
}

export function getLevelProgress(
  scenarios: Scenario[],
  completedIds: ReadonlySet<number>,
  unlockedDifficulties: ReadonlySet<Difficulty>,
) {
  const highestUnlockedIndex = difficultyOrder.reduce(
    (highest, difficulty, index) => (unlockedDifficulties.has(difficulty) ? index : highest),
    0,
  );
  const currentDifficulty = difficultyOrder[highestUnlockedIndex];
  const nextDifficulty = difficultyOrder[highestUnlockedIndex + 1] ?? null;
  const currentScenarios = scenarios.filter((scenario) => scenario.difficulty === currentDifficulty);
  const completed = currentScenarios.filter((scenario) => completedIds.has(scenario.id)).length;

  return {
    currentDifficulty,
    nextDifficulty,
    completed,
    total: currentScenarios.length,
  };
}
