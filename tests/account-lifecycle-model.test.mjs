// Hành vi thật của các hàm thuần cho: quên/đặt lại mật khẩu, chuyển hướng email của Supabase Auth,
// xuất dữ liệu và xóa tài khoản (app/domains/auth/model.ts, app/auth-error.ts).
import assert from "node:assert/strict";
import test from "node:test";
import { createTsLoader } from "./helpers/ts-loader.mjs";

const load = createTsLoader();
const model = load("app/domains/auth/model.ts");
const { passwordUpdateErrorMessage } = load("app/auth-error.ts");

test("yêu cầu đặt lại mật khẩu: email được chuẩn hóa, email sai bị chặn trước khi gọi mạng", () => {
  assert.deepEqual(model.validatePasswordResetRequest("  An.Nguyen@Example.COM "), { ok: true, email: "an.nguyen@example.com" });
  for (const bad of ["", "an", "an@", "an@example", "an @example.com", "@example.com", `${"a".repeat(250)}@x.vn`]) {
    assert.equal(model.validatePasswordResetRequest(bad).ok, false, `"${bad}" phải bị từ chối`);
  }
});

test("kết quả đặt lại mật khẩu trung tính: chỉ lỗi hạ tầng mới khác", () => {
  assert.equal(model.passwordResetOutcome(null), "neutral");
  assert.equal(model.passwordResetOutcome({ status: 200 }), "neutral");
  // Không tìm thấy tài khoản, giới hạn gửi theo người dùng, email không hợp lệ: cùng một kết quả.
  assert.equal(model.passwordResetOutcome({ status: 400, code: "user_not_found" }), "neutral");
  assert.equal(model.passwordResetOutcome({ status: 429, code: "over_email_send_rate_limit" }), "neutral");
  assert.equal(model.passwordResetOutcome({ status: 422, code: "validation_failed" }), "neutral");
  // Mạng lỗi (status 0 / thiếu) và 5xx: cho phép thử lại, không lộ gì về tài khoản.
  assert.equal(model.passwordResetOutcome({ status: 0 }), "retry");
  assert.equal(model.passwordResetOutcome({ message: "Failed to fetch" }), "retry");
  assert.equal(model.passwordResetOutcome({ status: 500 }), "retry");
  assert.equal(model.passwordResetOutcome({ status: 503 }), "retry");
  assert.doesNotMatch(model.PASSWORD_RESET_NEUTRAL_MESSAGE, /không tồn tại|không tìm thấy|chưa đăng ký/i);
  assert.match(model.PASSWORD_RESET_NEUTRAL_MESSAGE, /Nếu địa chỉ email này có tài khoản/);
});

test("mật khẩu mới theo PASSWORD_PATTERN (10–72 ký tự) và phải khớp xác nhận", () => {
  const ok = "Matkhau#2026";
  assert.deepEqual(model.validateNewPassword(ok, ok), { ok: true });
  assert.equal(model.validateNewPassword(ok, `${ok}x`).ok, false);
  assert.match(model.validateNewPassword(ok, `${ok}x`).error, /xác nhận/);
  for (const weak of ["Ab1#xyz", "matkhau#2026", "MATKHAU#2026", "Matkhau20260", "Mat khau#2026", "", `Aa1#${"x".repeat(69)}`]) {
    const result = model.validateNewPassword(weak, weak);
    assert.equal(result.ok, false, `"${weak.slice(0, 12)}…" (${weak.length} ký tự) phải bị từ chối`);
    assert.match(result.error, /10–72 ký tự/);
  }
  assert.equal(model.validateNewPassword(`Aa1#${"x".repeat(68)}`, `Aa1#${"x".repeat(68)}`).ok, true, "72 ký tự là giới hạn trên");
  assert.equal(model.validateNewPassword("Aa1#xxxxx", "Aa1#xxxxx").ok, false, "9 ký tự bị từ chối");
  assert.equal(model.validateNewPassword("Aa1#xxxxxx", "Aa1#xxxxxx").ok, true, "10 ký tự là giới hạn dưới");
});

test("mã TOTP: chỉ nhận đúng 6 chữ số, bỏ khoảng trắng", () => {
  assert.equal(model.normalizeTotpCode("123 456"), "123456");
  assert.equal(model.normalizeTotpCode(" 123456 "), "123456");
  for (const bad of ["", "12345", "1234567", "12a456", "abcdef"]) assert.equal(model.normalizeTotpCode(bad), null);
});

test("chuyển hướng email: nhận ra liên kết khôi phục và lỗi hết hạn, KHÔNG trả lại token", () => {
  const recovery = model.parseAuthRedirect("#access_token=AAA.BBB.CCC&expires_in=3600&refresh_token=rrr&token_type=bearer&type=recovery", "");
  assert.deepEqual(recovery, { kind: "recovery" });
  assert.doesNotMatch(JSON.stringify(recovery), /AAA|rrr|token/i);

  // Liên kết đăng ký không phải khôi phục mật khẩu.
  assert.deepEqual(model.parseAuthRedirect("#access_token=a&refresh_token=b&type=signup", ""), { kind: "none" });
  // type=recovery nhưng thiếu token thì không mở hộp thoại.
  assert.deepEqual(model.parseAuthRedirect("#type=recovery", ""), { kind: "none" });

  assert.deepEqual(
    model.parseAuthRedirect("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired", ""),
    { kind: "error", reason: "expired" },
  );
  assert.deepEqual(model.parseAuthRedirect("", "?error=access_denied&error_code=otp_expired"), { kind: "error", reason: "expired" });
  assert.deepEqual(model.parseAuthRedirect("#error=server_error&error_description=boom", ""), { kind: "error", reason: "invalid" });
  assert.deepEqual(model.parseAuthRedirect("", ""), { kind: "none" });
  assert.deepEqual(model.parseAuthRedirect("#admin?tab=traffic", "?utm_source=x"), { kind: "none" });
  assert.match(model.authRedirectErrorMessage("expired"), /hết hạn/);
});

test("làm sạch URL: gỡ token / mã lỗi khỏi query và hash nhưng giữ tham số của ứng dụng", () => {
  assert.equal(model.sanitizeAuthRedirectUrl("https://canhgiacso.com/#access_token=a&refresh_token=b&type=recovery"), "/");
  assert.equal(model.sanitizeAuthRedirectUrl("https://canhgiacso.com/#"), "/");
  assert.equal(
    model.sanitizeAuthRedirectUrl("https://canhgiacso.com/?utm_source=mail&error=access_denied&error_code=otp_expired&error_description=x#error=access_denied&error_code=otp_expired"),
    "/?utm_source=mail",
  );
  assert.equal(model.sanitizeAuthRedirectUrl("https://canhgiacso.com/?type=quiz#admin?tab=traffic"), "/?type=quiz#admin?tab=traffic", "tham số ứng dụng được giữ nguyên");
  assert.equal(model.sanitizeAuthRedirectUrl("/trang?x=1#cookie"), "/trang?x=1#cookie");
});

test("xóa tài khoản: cụm xác nhận là tên đăng nhập (không phân biệt hoa thường, bỏ khoảng trắng đầu cuối)", () => {
  assert.equal(model.matchesDeletionConfirmation("  An.Nguyen ", "an.nguyen"), true);
  assert.equal(model.matchesDeletionConfirmation("an.nguye", "an.nguyen"), false);
  assert.equal(model.matchesDeletionConfirmation("", ""), false, "không bao giờ khớp khi chưa có tên đăng nhập");
  assert.equal(model.validateDeletionRequest({ password: "", typed: "an", username: "an" }).ok, false);
  assert.equal(model.validateDeletionRequest({ password: "x", typed: "sai", username: "an" }).ok, false);
  assert.deepEqual(model.validateDeletionRequest({ password: "x", typed: "an", username: "an" }), { ok: true });
});

test("lỗi xóa tài khoản được phân loại theo SQLSTATE của RPC", () => {
  assert.equal(model.classifyDeletionError({ code: "CG005" }), "privileged");
  assert.equal(model.classifyDeletionError({ code: "CG006" }), "reauth");
  assert.equal(model.classifyDeletionError({ code: "22023" }), "confirmation");
  assert.equal(model.classifyDeletionError({ code: "42501" }), "session");
  assert.equal(model.classifyDeletionError({ status: 429 }), "rate-limit");
  assert.equal(model.classifyDeletionError({ code: "XX000" }), "unknown");
  assert.equal(model.classifyDeletionError(null), "unknown");
  assert.match(model.deletionFailureMessage("privileged", "last_admin"), /quản trị viên cuối cùng/);
  assert.match(model.deletionFailureMessage("privileged", "editor"), /quyền quản trị hoặc biên tập/);
  for (const failure of ["wrong-password", "confirmation", "privileged", "reauth", "rate-limit", "session", "unknown"]) {
    assert.match(model.deletionFailureMessage(failure), /chưa bị xóa|chưa bị thay đổi|đăng nhập lại/i, `${failure}: nói rõ tài khoản chưa bị xóa`);
  }
});

test("tệp xuất dữ liệu ghép thêm bản ghi đồng ý cookie của trình duyệt và có tên tệp theo ngày", () => {
  const consent = model.parseConsentRecord(JSON.stringify({ analytics: false, ts: Date.UTC(2026, 9, 1, 8, 0, 0), v: 1 }));
  assert.deepEqual(consent, { analytics: false, recordedAt: "2026-10-01T08:00:00.000Z", version: 1 });
  assert.equal(model.parseConsentRecord(null), null);
  assert.equal(model.parseConsentRecord("{không phải json"), null);
  assert.equal(model.parseConsentRecord(JSON.stringify({ analytics: "yes", ts: 1 })), null);

  const exported = model.buildDataExport({ schemaVersion: 1, account: { email: "a@b.vn" } }, consent);
  assert.equal(exported.schemaVersion, 1);
  assert.equal(exported.account.email, "a@b.vn");
  assert.equal(exported.consent.analytics, false);
  assert.equal(exported.consent.recordedAt, "2026-10-01T08:00:00.000Z");
  assert.equal(model.buildDataExport({ schemaVersion: 1 }, null).consent.analytics, null);
  assert.deepEqual(Object.keys(model.buildDataExport(null, null)), ["consent"], "dữ liệu máy chủ rỗng không làm hỏng việc xuất");

  assert.equal(model.dataExportFileName(new Date("2026-10-02T03:04:05Z")), "canhgiacso-du-lieu-cua-toi-2026-10-02.json");
  assert.equal(model.dataExportFileName(new Date("invalid")), "canhgiacso-du-lieu-cua-toi-du-lieu.json");
});

test("lỗi đổi mật khẩu được dịch sang thông điệp tiếng Việt, không lộ thông điệp thô của máy chủ", () => {
  assert.match(passwordUpdateErrorMessage({ code: "same_password", message: "New password should be different from the old password." }), /khác mật khẩu hiện tại/);
  assert.match(passwordUpdateErrorMessage({ code: "weak_password" }), /10–72 ký tự/);
  assert.match(passwordUpdateErrorMessage({ code: "session_not_found" }), /Quên mật khẩu/);
  assert.match(passwordUpdateErrorMessage({ status: 401 }), /hết hạn/);
  assert.match(passwordUpdateErrorMessage({ status: 429 }), /chờ vài phút/);
  assert.match(passwordUpdateErrorMessage({ code: "unexpected", message: "boom internal" }), /Chưa đổi được mật khẩu/);
  assert.doesNotMatch(passwordUpdateErrorMessage({ code: "unexpected", message: "boom internal" }), /boom/);
});
