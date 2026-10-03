import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createReauthClient, initialAuthRedirect, supabase } from "../../supabase";
import { buildDataExport, classifyDeletionError, parseConsentRecord, type DeletionFailure } from "./model";
import { safeStorageGet } from "../../shared/browser-storage";

// Synchronous handler. `Parameters<typeof onAuthStateChange>[0]` resolves to the
// last overload (the async one), which rejects the plain callbacks used by the UI.
export type AuthChangeHandler = (event: AuthChangeEvent, session: Session | null) => void;

export function getCurrentAuthSession() {
  return supabase.auth.getSession();
}

export function subscribeToAuthChanges(callback: AuthChangeHandler) {
  return supabase.auth.onAuthStateChange(callback);
}

export function signOutLocal() {
  return supabase.auth.signOut({ scope: "local" });
}

export function registerAccount({
  email,
  password,
  username,
  displayName,
}: {
  email: string;
  password: string;
  username: string;
  displayName: string;
}) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { username, display_name: displayName } },
  });
}

// Gửi lại email xác nhận đăng ký (Supabase giới hạn ~1 lần/60 giây cho mỗi địa chỉ).
export function resendSignupConfirmation(email: string) {
  return supabase.auth.resend({ type: "signup", email });
}

export function loginAccount(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function updateProfileDisplayName(userId: string, displayName: string) {
  return supabase.from("profiles").update({ display_name: displayName }).eq("id", userId);
}

// Trạng thái chuyển hướng từ email (đặt lại mật khẩu / liên kết hết hạn) đã được ghi nhận trước khi
// thư viện xác thực xử lý và xóa URL.
export function getInitialAuthRedirect() {
  return initialAuthRedirect;
}

// Địa chỉ quay về sau khi bấm liên kết trong email. Cố định (gốc của trang) để dễ khai báo trong
// Supabase Auth > URL Configuration > Redirect URLs; địa chỉ không nằm trong danh sách sẽ bị
// Supabase thay bằng Site URL nên không thể chuyển hướng người dùng sang miền khác.
export function passwordResetRedirectUrl() {
  return `${window.location.origin}/`;
}

export function requestPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo: passwordResetRedirectUrl() });
}

export function updateAccountPassword(password: string) {
  return supabase.auth.updateUser({ password });
}

// Tài khoản bật TOTP cần phiên aal2 mới đổi được mật khẩu (Auth trả "insufficient_aal").
export async function verifyTotpForPasswordChange(code: string): Promise<boolean> {
  const factors = await supabase.auth.mfa.listFactors();
  // Chỉ dùng yếu tố đã xác minh: người dùng có thể còn một lần đăng ký dang dở (unverified)
  // nằm trước yếu tố thật trong danh sách, khi đó mã từ ứng dụng xác thực đang dùng sẽ bị từ chối.
  const factor = factors.data?.totp?.find((item) => item.status === "verified");
  if (factors.error || !factor) return false;
  const verified = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  return !verified.error;
}

// Các phiên khác của người dùng bị đăng xuất sau khi đổi mật khẩu (best-effort).
export function signOutOtherSessions() {
  return supabase.auth.signOut({ scope: "others" });
}

export type NormalizedRpcError = { code?: string; message: string; details?: string | null; status?: number };

export async function exportMyData(): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: NormalizedRpcError }> {
  const response = await supabase.rpc("export_my_data");
  if (response.error || !response.data || typeof response.data !== "object") {
    return {
      ok: false,
      error: {
        code: response.error?.code,
        message: response.error?.message ?? "Empty export",
        details: response.error?.details,
        status: response.status,
      },
    };
  }
  const consent = parseConsentRecord(safeStorageGet("cgs-consent-v1"));
  return { ok: true, data: buildDataExport(response.data, consent) };
}

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; failure: DeletionFailure; detail?: string | null };

// Xóa tài khoản: đăng nhập lại bằng mật khẩu trên một ứng dụng khách tách biệt (phiên mới, "xác
// thực gần đây" do máy chủ kiểm tra lại) rồi gọi RPC. Phiên đang dùng của người dùng không bị đổi.
export async function deleteMyAccount({ email, password, confirmation }: { email: string; password: string; confirmation: string }): Promise<DeleteAccountResult> {
  const reauth = createReauthClient();
  try {
    const login = await reauth.auth.signInWithPassword({ email, password });
    if (login.error || !login.data.session) {
      const code = login.error?.code;
      if (code === "invalid_credentials" || login.error?.status === 400) return { ok: false, failure: "wrong-password" };
      if (login.error?.status === 429 || code === "over_request_rate_limit") return { ok: false, failure: "rate-limit" };
      return { ok: false, failure: "unknown" };
    }
    const response = await reauth.rpc("delete_my_account", { confirmation });
    if (response.error) {
      const failure = classifyDeletionError({ code: response.error.code, status: response.status });
      return { ok: false, failure, detail: response.error.details };
    }
    return { ok: true };
  } finally {
    // Sau khi xóa, phiên này đã bị vô hiệu: chỉ cần dọn bộ nhớ cục bộ.
    try { await reauth.auth.signOut({ scope: "local" }); } catch { /* bỏ qua */ }
  }
}
