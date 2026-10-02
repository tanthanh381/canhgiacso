import { guestSupabase, supabase } from "../../supabase";
import type { SiteContent } from "../../data";
import { evaluateGuestChoice, type ChoiceOutcome } from "./model";

export function loadTrainingAccountData(userId: string) {
  return Promise.all([
    supabase.from("profiles").select("username, display_name, created_at").eq("id", userId).single(),
    supabase.rpc("get_game_state"),
    supabase.rpc("get_my_training_certificates"),
  ]);
}

export function submitTrainingChoice(runId: string, scenarioId: number, choiceIndex: number) {
  return supabase.rpc("submit_game_choice", {
    expected_run: runId,
    scenario_id: scenarioId,
    choice_index: choiceIndex,
  });
}

export function restartTrainingRun(runId: string) {
  return supabase.rpc("restart_game", { expected_run: runId });
}

export function loadTrainingCertificates() {
  return supabase.rpc("get_my_training_certificates");
}

export function issueTrainingCertificate(runId: string) {
  return supabase.rpc("issue_training_certificate", { expected_run: runId });
}

type GuestScenario = SiteContent["scenarios"][number];

export type GuestChoiceEvaluation =
  | { ok: true; outcome: ChoiceOutcome }
  | { ok: false; message: string };

// Chỉ đúng khi máy chủ CŨ còn trả khóa đáp án trong payload công khai. Payload hiện
// hành (get_public_site_content) đã gỡ correct/moneyDelta/awarenessDelta/feedback.
function carriesAnswerKey(choice: GuestScenario["choices"][number]) {
  return typeof choice.correct === "boolean"
    && Number.isInteger(choice.moneyDelta)
    && Number.isInteger(choice.awarenessDelta)
    && typeof choice.feedback === "string";
}

function parseGuestOutcome(value: unknown, scenario: GuestScenario, index: number): ChoiceOutcome | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.scenarioId !== scenario.id || record.choiceIndex !== index) return null;
  if (typeof record.correct !== "boolean") return null;
  if (!Number.isInteger(record.moneyDelta) || !Number.isInteger(record.awarenessDelta)) return null;
  return {
    scenarioId: scenario.id,
    choiceIndex: index,
    correct: record.correct,
    moneyDelta: record.moneyDelta as number,
    awarenessDelta: record.awarenessDelta as number,
    feedback: typeof record.feedback === "string" && record.feedback ? record.feedback : scenario.tip,
  };
}

const GUEST_SCORING_UNAVAILABLE =
  "Chưa chấm điểm được lựa chọn này. Chế độ khách cần kết nối tới máy chủ; hãy kiểm tra mạng và thử lại, hoặc đăng nhập để lưu kết quả đã được xác minh.";

// Chấm MỘT lựa chọn của khách. Đáp án không nằm trong dữ liệu trình duyệt: máy chủ trả về
// kết quả của đúng lựa chọn đã chọn (RPC evaluate_guest_choice, có giới hạn tốc độ, không
// ghi dữ liệu người dùng). Khi RPC không dùng được, KHÔNG tự chấm "sai": trả thông báo rõ
// ràng và để trạng thái chơi không đổi để khách có thể thử lại.
export async function requestGuestChoiceOutcome(scenario: GuestScenario, index: number): Promise<GuestChoiceEvaluation> {
  const choice = scenario.choices[index];
  if (!choice) return { ok: false, message: "Không tìm thấy lựa chọn này. Vui lòng tải lại trang và thử lại." };

  if (carriesAnswerKey(choice)) {
    const local = evaluateGuestChoice(scenario, index);
    if (local) return { ok: true, outcome: local };
  }

  try {
    const { data, error, status } = await guestSupabase.rpc("evaluate_guest_choice", {
      scenario_id: scenario.id,
      choice_index: index,
    });
    if (error) {
      if (status === 429) return { ok: false, message: "Bạn đang trả lời quá nhanh. Vui lòng chờ vài phút rồi thử lại." };
      if (error.code === "22023") return { ok: false, message: "Nội dung tình huống đã thay đổi. Vui lòng tải lại trang và thử lại." };
      return { ok: false, message: GUEST_SCORING_UNAVAILABLE };
    }
    const outcome = parseGuestOutcome(data, scenario, index);
    return outcome ? { ok: true, outcome } : { ok: false, message: GUEST_SCORING_UNAVAILABLE };
  } catch {
    return { ok: false, message: GUEST_SCORING_UNAVAILABLE };
  }
}
