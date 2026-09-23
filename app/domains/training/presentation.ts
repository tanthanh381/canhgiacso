import type { Difficulty } from "../../data";

export type BadgeTone = "starter" | "bronze" | "silver" | "gold" | "expert" | "legendary";
export type DefenseBadge = {
  icon: string;
  name: string;
  description: string;
  tier: string;
  tone: BadgeTone;
  current: number;
  target: number;
  progress: number;
  unlocked: boolean;
};

export const difficulties: Array<"Tất cả" | Difficulty> = ["Tất cả", "Dễ", "Trung bình", "Khó", "Rất khó"];

export const difficultyTone: Record<Difficulty, string> = {
  Dễ: "easy",
  "Trung bình": "medium",
  Khó: "hard",
  "Rất khó": "extreme",
};

export function scenarioCategoryLabel(category: string) {
  if (category === "Deepfake") return "Giả mạo bằng AI (deepfake)";
  if (category === "Phishing") return "Lừa đảo giả mạo (phishing)";
  if (category === "Brandname giả") return "SMS Brandname giả mạo";
  return category;
}

export function scenarioChannelLabel(channel: string) {
  if (channel === "Video call") return "Cuộc gọi video";
  if (channel === "Nhóm chat") return "Nhóm trò chuyện";
  return channel;
}
