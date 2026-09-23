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

export function bestCorrectStreak(results: Array<{ correct: boolean }>) {
  let current = 0;
  let best = 0;
  for (const result of results) {
    current = result.correct ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}

function createBadge(badge: Omit<DefenseBadge, "progress" | "unlocked">): DefenseBadge {
  return {
    ...badge,
    progress: Math.min(100, Math.round((badge.current / badge.target) * 100)),
    unlocked: badge.current >= badge.target,
  };
}

export function buildDefenseBadges(
  safeIds: ReadonlySet<number>,
  resultCount: number,
  streak: number,
  scenarioCount: number,
): DefenseBadge[] {
  const safeIn = (ids: number[]) => ids.filter((id) => safeIds.has(id)).length;
  return [
    createBadge({ icon: "◇", name: "Tân binh cảnh giác", description: "Hoàn thành tình huống đầu tiên và bắt đầu hồ sơ phòng vệ.", tier: "Khởi động", tone: "starter", current: Math.min(resultCount, 1), target: 1 }),
    createBadge({ icon: "⬟", name: "Lá chắn Đồng", description: "Xử lý an toàn 5 tình huống thuộc bất kỳ nhóm rủi ro nào.", tier: "Đồng", tone: "bronze", current: safeIds.size, target: 5 }),
    createBadge({ icon: "⬢", name: "Lá chắn Bạc", description: "Xử lý an toàn 10 tình huống và duy trì phản xạ xác minh.", tier: "Bạc", tone: "silver", current: safeIds.size, target: 10 }),
    createBadge({ icon: "◆", name: "Lá chắn Vàng", description: "Xử lý an toàn 20 tình huống trong thư viện Cảnh Giác Số.", tier: "Vàng", tone: "gold", current: safeIds.size, target: 20 }),
    createBadge({ icon: "▲", name: "Tâm lý thép", description: "Đạt chuỗi 5 tình huống xử lý an toàn liên tiếp.", tier: "Kỹ năng", tone: "expert", current: streak, target: 5 }),
    createBadge({ icon: "✦", name: "Khắc tinh mạo danh", description: "Vượt toàn bộ tình huống giả danh công an, điện lực và nhà trường.", tier: "Chuyên môn", tone: "expert", current: safeIn([1, 12, 13]), target: 3 }),
    createBadge({ icon: "◉", name: "Đôi mắt phishing", description: "Nhận diện đủ các bẫy liên kết, OTP, QR đăng nhập và brandname giả.", tier: "Chuyên môn", tone: "expert", current: safeIn([2, 8, 14, 16, 20, 24, 27, 29]), target: 8 }),
    createBadge({ icon: "♬", name: "Khắc tinh Deepfake", description: "Xử lý an toàn các cuộc gọi giả khuôn mặt và giọng nói người thân.", tier: "Chuyên môn", tone: "expert", current: safeIn([3, 22, 23]), target: 3 }),
    createBadge({ icon: "⌗", name: "Vệ sĩ giao dịch", description: "Chặn các bẫy QR, chuyển nhầm, biên lai giả và giao hàng tam giác.", tier: "Chuyên môn", tone: "expert", current: safeIn([5, 9, 15, 26]), target: 4 }),
    createBadge({ icon: "◒", name: "Miễn nhiễm đầu tư", description: "Vượt các bẫy sàn giả, tình cảm–đầu tư, airdrop và hội thảo trực tuyến.", tier: "Chuyên môn", tone: "expert", current: safeIn([7, 11, 25, 30]), target: 4 }),
    createBadge({ icon: "⚐", name: "Người tìm việc tỉnh táo", description: "Nhận diện đủ bẫy cộng tác viên, tuyển mẫu, vay phí trước và việc ở nước ngoài.", tier: "Chuyên môn", tone: "expert", current: safeIn([4, 17, 18, 28]), target: 4 }),
    createBadge({ icon: "◎", name: "Người giữ danh tính", description: "Bảo vệ OTP, sinh trắc học, tài khoản và quyền truy cập thiết bị.", tier: "Chuyên môn", tone: "expert", current: safeIn([6, 8, 14, 16, 19, 20, 27, 29]), target: 8 }),
    createBadge({ icon: "✹", name: "Thợ săn xu hướng mới", description: "Vượt các thủ đoạn mới về nhập học, sự kiện, nhà ở, livestream, việc làm và thao túng tâm lý.", tier: "Cập nhật 2026", tone: "expert", current: safeIn([31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42]), target: 12 }),
    createBadge({ icon: "⬣", name: "Chuyên gia Cảnh Giác Số", description: "Xử lý an toàn toàn bộ thư viện tình huống hiện có.", tier: "Huyền thoại", tone: "legendary", current: safeIds.size, target: scenarioCount }),
  ];
}
