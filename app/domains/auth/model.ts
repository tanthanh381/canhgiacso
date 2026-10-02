export type SessionAccount = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  createdAt: string;
};

export type AuthMode = "login" | "register";

export const USERNAME_PATTERN = /^[a-z0-9._-]{3,24}$/;
export const PASSWORD_PATTERN = /^(?=.{10,72}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])\S+$/;

export type AuthSubmission = {
  mode: AuthMode;
  email: string;
  username: string;
  displayName: string;
  password: string;
  confirmPassword: string;
};

export type ValidatedAuthSubmission =
  | { ok: true; email: string; username: string; displayName: string }
  | { ok: false; error: string };

export function validateAuthSubmission(input: AuthSubmission): ValidatedAuthSubmission {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim().toLowerCase();
  const displayName = input.displayName.trim();

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, error: "Vui lòng nhập địa chỉ email hợp lệ." };
  }
  if (input.mode === "register" && !USERNAME_PATTERN.test(username)) {
    return { ok: false, error: "Tên đăng nhập cần 3–24 ký tự: chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới." };
  }
  if (input.mode === "register" && !PASSWORD_PATTERN.test(input.password)) {
    return { ok: false, error: "Mật khẩu cần 10–72 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt; không chứa khoảng trắng." };
  }
  if (input.mode === "login" && input.password.length < 8) {
    return { ok: false, error: "Mật khẩu cần ít nhất 8 ký tự." };
  }
  if (input.mode === "register" && (displayName.length < 2 || displayName.length > 32)) {
    return { ok: false, error: "Tên hiển thị cần từ 2 đến 32 ký tự." };
  }
  if (input.mode === "register" && input.password !== input.confirmPassword) {
    return { ok: false, error: "Mật khẩu xác nhận chưa khớp." };
  }

  return { ok: true, email, username, displayName };
}

// ---------------------------------------------------------------------------------------------
// Quên mật khẩu / đặt lại mật khẩu
// ---------------------------------------------------------------------------------------------

export const RESET_REQUEST_COOLDOWN_SECONDS = 60;

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export const PASSWORD_REQUIREMENTS_MESSAGE =
  "Mật khẩu cần 10–72 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt; không chứa khoảng trắng.";

export function validatePasswordResetRequest(rawEmail: string): { ok: true; email: string } | { ok: false; error: string } {
  const email = rawEmail.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Vui lòng nhập địa chỉ email hợp lệ." };
  }
  return { ok: true, email };
}

// Thông điệp hiển thị SAU MỌI yêu cầu đặt lại hợp lệ, dù email có tài khoản hay không, nên không
// thể dùng form này để dò xem email nào đã đăng ký.
export const PASSWORD_RESET_NEUTRAL_MESSAGE =
  "Nếu địa chỉ email này có tài khoản, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Thư có thể mất vài phút để đến; hãy kiểm tra cả thư mục Spam. Liên kết trong thư chỉ dùng được một lần và sẽ hết hạn.";

export const PASSWORD_RESET_RETRY_MESSAGE =
  "Chưa gửi được yêu cầu đặt lại mật khẩu. Vui lòng kiểm tra kết nối và thử lại sau ít phút.";

type ResetErrorLike = { code?: string; status?: number; message?: string } | null | undefined;

// Chỉ phân biệt lỗi hạ tầng (mạng, 5xx) với mọi trường hợp còn lại. Việc không tìm thấy tài khoản
// hay chạm giới hạn gửi theo từng người dùng đều được coi như thành công để không lộ tồn tại tài khoản.
export function passwordResetOutcome(error: ResetErrorLike): "neutral" | "retry" {
  if (!error) return "neutral";
  const status = typeof error.status === "number" ? error.status : 0;
  if (status === 0 || status >= 500) return "retry";
  return "neutral";
}

export function validateNewPassword(password: string, confirmPassword: string): { ok: true } | { ok: false; error: string } {
  if (!PASSWORD_PATTERN.test(password)) return { ok: false, error: PASSWORD_REQUIREMENTS_MESSAGE };
  if (password !== confirmPassword) return { ok: false, error: "Mật khẩu xác nhận chưa khớp." };
  return { ok: true };
}

export function normalizeTotpCode(raw: string) {
  const code = raw.replace(/\s+/g, "");
  return /^\d{6}$/.test(code) ? code : null;
}

// ---------------------------------------------------------------------------------------------
// Chuyển hướng từ email của Supabase Auth (liên kết đặt lại mật khẩu, liên kết hết hạn)
// ---------------------------------------------------------------------------------------------

export type AuthRedirectState =
  | { kind: "none" }
  | { kind: "recovery" }
  | { kind: "error"; reason: "expired" | "invalid" };

// Tham số do Supabase Auth gắn vào URL chuyển hướng. "type" và "code" cố ý KHÔNG nằm trong danh sách
// vì có thể là tham số của chính ứng dụng; chúng chỉ bị gỡ cùng cả đoạn hash khi đi kèm token.
const AUTH_REDIRECT_KEYS = [
  "access_token", "refresh_token", "provider_token", "provider_refresh_token", "expires_in", "expires_at",
  "token_type", "error", "error_code", "error_description",
] as const;

function paramsFrom(part: string, prefix: "#" | "?") {
  const body = part.startsWith(prefix) ? part.slice(1) : part;
  try {
    return new URLSearchParams(body);
  } catch {
    return new URLSearchParams();
  }
}

// Đọc trạng thái chuyển hướng xác thực từ URL. KHÔNG trả lại token, chỉ trả loại sự kiện.
export function parseAuthRedirect(hash: string, search: string): AuthRedirectState {
  const hashParams = paramsFrom(hash, "#");
  const queryParams = paramsFrom(search, "?");
  const pick = (name: string) => hashParams.get(name) ?? queryParams.get(name);

  const errorCode = pick("error_code");
  const error = pick("error");
  if (error || errorCode || pick("error_description")) {
    const code = (errorCode ?? "").toLowerCase();
    const description = (pick("error_description") ?? "").toLowerCase();
    const expired = code === "otp_expired" || description.includes("expired") || description.includes("invalid");
    return { kind: "error", reason: expired ? "expired" : "invalid" };
  }
  if (hashParams.get("type") === "recovery" && hashParams.get("access_token")) {
    return { kind: "recovery" };
  }
  return { kind: "none" };
}

// Trả về đường dẫn tương đối đã gỡ mọi tham số xác thực khỏi query/hash để token, mã lỗi không nằm
// trong thanh địa chỉ, lịch sử trình duyệt hay các công cụ đo lường.
export function sanitizeAuthRedirectUrl(href: string) {
  const url = new URL(href, "https://canhgiacso.invalid");
  for (const key of AUTH_REDIRECT_KEYS) url.searchParams.delete(key);
  const hashParams = paramsFrom(url.hash, "#");
  const hasAuthHash = AUTH_REDIRECT_KEYS.some((key) => hashParams.has(key));
  const hash = hasAuthHash || url.hash === "#" ? "" : url.hash;
  return `${url.pathname}${url.search}${hash}`;
}

export function authRedirectErrorMessage(reason: "expired" | "invalid") {
  return reason === "expired"
    ? "Liên kết trong email đã hết hạn hoặc đã được sử dụng. Hãy chọn “Quên mật khẩu” để nhận liên kết mới."
    : "Liên kết trong email không hợp lệ. Hãy chọn “Quên mật khẩu” để nhận liên kết mới.";
}

// ---------------------------------------------------------------------------------------------
// Xuất dữ liệu / xóa tài khoản
// ---------------------------------------------------------------------------------------------

// Cụm xác nhận khi xóa tài khoản là tên đăng nhập (trùng với kiểm tra phía máy chủ).
export function matchesDeletionConfirmation(typed: string, username: string) {
  const expected = username.trim().toLowerCase();
  return expected.length > 0 && typed.trim().toLowerCase() === expected;
}

export function validateDeletionRequest(input: { password: string; typed: string; username: string }): { ok: true } | { ok: false; error: string } {
  if (!input.password) return { ok: false, error: "Nhập mật khẩu hiện tại để xác nhận bạn là chủ tài khoản." };
  if (!matchesDeletionConfirmation(input.typed, input.username)) {
    return { ok: false, error: `Nhập chính xác tên đăng nhập “${input.username}” để xác nhận xóa tài khoản.` };
  }
  return { ok: true };
}

export type DeletionFailure = "wrong-password" | "confirmation" | "privileged" | "reauth" | "rate-limit" | "session" | "unknown";

type RpcErrorLike = { code?: string; status?: number; message?: string; details?: string | null } | null | undefined;

export function classifyDeletionError(error: RpcErrorLike): DeletionFailure {
  if (!error) return "unknown";
  switch (error.code) {
    case "CG005": return "privileged";
    case "CG006": return "reauth";
    case "22023": return "confirmation";
    case "42501": return "session";
    default: break;
  }
  if (error.status === 429) return "rate-limit";
  return "unknown";
}

export function deletionFailureMessage(failure: DeletionFailure, detail?: string | null) {
  switch (failure) {
    case "wrong-password": return "Mật khẩu không đúng. Tài khoản chưa bị xóa.";
    case "confirmation": return "Tên đăng nhập xác nhận chưa khớp. Tài khoản chưa bị xóa.";
    case "privileged":
      return detail?.includes("last_admin")
        ? "Đây là tài khoản quản trị viên cuối cùng nên chưa thể xóa. Hãy cấp quyền quản trị cho một người khác, nhờ họ chuyển tài khoản này về thành viên, rồi thử lại."
        : "Tài khoản đang giữ quyền quản trị hoặc biên tập nên chưa thể tự xóa. Hãy nhờ quản trị viên chuyển tài khoản về thành viên trước. Tài khoản chưa bị xóa.";
    case "reauth": return "Phiên xác thực đã quá cũ. Vui lòng thử lại và nhập mật khẩu. Tài khoản chưa bị xóa.";
    case "rate-limit": return "Bạn đã thử quá nhiều lần. Vui lòng chờ vài phút rồi thử lại. Tài khoản chưa bị xóa.";
    case "session": return "Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại. Tài khoản chưa bị xóa.";
    default: return "Chưa xóa được tài khoản. Vui lòng thử lại sau; dữ liệu của bạn chưa bị thay đổi.";
  }
}

export type ConsentSnapshot = { analytics: boolean; recordedAt: string; version: number } | null;

// Bản ghi đồng ý cookie nằm trong localStorage ("cgs-consent-v1": { analytics, ts, v }) chứ không
// nằm trong cơ sở dữ liệu, nên được ghép vào tệp xuất ở phía trình duyệt.
export function parseConsentRecord(raw: string | null): ConsentSnapshot {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== "object") return null;
    if (typeof value.analytics !== "boolean" || typeof value.ts !== "number" || !Number.isFinite(value.ts)) return null;
    const version = typeof value.v === "number" ? value.v : 1;
    return { analytics: value.analytics, recordedAt: new Date(value.ts).toISOString(), version };
  } catch {
    return null;
  }
}

export function buildDataExport(serverData: unknown, consent: ConsentSnapshot) {
  const base = serverData && typeof serverData === "object" && !Array.isArray(serverData)
    ? (serverData as Record<string, unknown>)
    : {};
  return {
    ...base,
    consent: consent
      ? { analytics: consent.analytics, recordedAt: consent.recordedAt, version: consent.version, storedIn: "Trình duyệt của bạn (localStorage), không lưu trên máy chủ" }
      : { analytics: null, note: "Chưa có lựa chọn cookie nào được ghi nhận trên trình duyệt này." },
  };
}

export function dataExportFileName(now: Date) {
  const day = Number.isNaN(now.getTime()) ? "du-lieu" : now.toISOString().slice(0, 10);
  return `canhgiacso-du-lieu-cua-toi-${day}.json`;
}
