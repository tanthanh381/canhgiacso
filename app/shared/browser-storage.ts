import type { Result, StoredProgress } from "../domains/training/model";

export const LEGACY_PROGRESS_KEY = "khien-so-progress";
export const THEME_KEY = "khien-so-theme";
export const GUEST_CERTIFICATE_KEY = "canh-giac-so-guest-certificate";

export function safeStorageGet(key: string) {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
}

export function safeStorageSet(key: string, value: string) {
  if (typeof window === "undefined") return false;
  try { window.localStorage.setItem(key, value); return true; } catch { return false; }
}

export function safeStorageRemove(key: string) {
  if (typeof window === "undefined") return false;
  try { window.localStorage.removeItem(key); return true; } catch { return false; }
}

export function progressKey(username: string | null) {
  return `khien-so-progress:${username ?? "guest"}`;
}

export function readStoredProgress(key: string): StoredProgress | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Record<string, unknown>;
    const results = Array.isArray(saved.results)
      ? saved.results.filter((result): result is Result => {
          if (!result || typeof result !== "object") return false;
          const candidate = result as Record<string, unknown>;
          return Number.isInteger(candidate.scenarioId)
            && Number(candidate.scenarioId) >= 1
            && Number(candidate.scenarioId) <= 100
            && typeof candidate.correct === "boolean"
            && Number.isInteger(candidate.choiceIndex)
            && Number(candidate.choiceIndex) >= 0
            && Number(candidate.choiceIndex) <= 2;
        })
      : [];

    return {
      balance: typeof saved.balance === "number" && Number.isFinite(saved.balance)
        ? Math.max(0, Math.min(300_000_000, saved.balance))
        : 300_000_000,
      awareness: typeof saved.awareness === "number" && Number.isFinite(saved.awareness)
        ? Math.max(0, Math.min(100, saved.awareness))
        : 100,
      results,
      dark: saved.dark === true,
      playerName: typeof saved.playerName === "string" && saved.playerName.trim()
        ? saved.playerName.trim().slice(0, 32)
        : "Người chơi ẩn danh",
    };
  } catch {
    return null;
  }
}
