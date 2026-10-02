"use client";

import { useEffect, useState, type FormEvent } from "react";
import { passwordUpdateErrorMessage } from "../../auth-error";
import { Icon } from "../../shared/icons";
import { Modal } from "../../shared/ui-primitives";
import {
  getInitialAuthRedirect,
  requestPasswordReset,
  signOutLocal,
  signOutOtherSessions,
  subscribeToAuthChanges,
  updateAccountPassword,
  verifyTotpForPasswordChange,
} from "./gateway";
import {
  PASSWORD_REQUIREMENTS_MESSAGE,
  PASSWORD_RESET_NEUTRAL_MESSAGE,
  PASSWORD_RESET_RETRY_MESSAGE,
  RESET_REQUEST_COOLDOWN_SECONDS,
  authRedirectErrorMessage,
  normalizeTotpCode,
  passwordResetOutcome,
  validateNewPassword,
  validatePasswordResetRequest,
} from "./model";

// Hộp thoại đặt lại mật khẩu chỉ được dựng một lần cho mỗi lần tải trang; biến này tránh mở lại
// khi component bị dựng lại (ví dụ StrictMode) sau khi người dùng đã xử lý xong.
let initialRedirectHandled = false;

/** Biểu mẫu "Quên mật khẩu" nằm trong hộp thoại đăng nhập. Luôn trả thông điệp trung tính. */
export function ForgotPasswordForm({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || cooldown > 0) return;
    const checked = validatePasswordResetRequest(email);
    if (!checked.ok) {
      setError(checked.error);
      setNotice("");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { error: requestError } = await requestPasswordReset(checked.email);
      if (passwordResetOutcome(requestError) === "retry") {
        setError(PASSWORD_RESET_RETRY_MESSAGE);
      } else {
        setNotice(PASSWORD_RESET_NEUTRAL_MESSAGE);
        setCooldown(RESET_REQUEST_COOLDOWN_SECONDS);
      }
    } catch {
      setError(PASSWORD_RESET_RETRY_MESSAGE);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={(event) => void submit(event)} noValidate>
      <p className="auth-intro">Nhập email đã dùng để đăng ký. Chúng tôi sẽ gửi liên kết để bạn đặt mật khẩu mới. Vì lý do bảo mật, thông báo sau khi gửi luôn giống nhau dù email có tài khoản hay không.</p>
      <label>
        <span>Email</span>
        <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" autoCapitalize="none" spellCheck={false} />
      </label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {notice && <p className="auth-notice" role="status">{notice}</p>}
      <button className="primary-button auth-submit" type="submit" disabled={busy || cooldown > 0}>
        {busy ? "Đang gửi…" : cooldown > 0 ? `Gửi lại sau ${cooldown} giây` : notice ? "Gửi lại liên kết" : "Gửi liên kết đặt lại mật khẩu"}
      </button>
      <button className="admin-secondary" type="button" onClick={onBack}>Quay lại đăng nhập</button>
    </form>
  );
}

type RecoveryStep = "password" | "totp" | "done";

/**
 * Hộp thoại đặt mật khẩu mới khi người dùng quay lại từ liên kết trong email, và thông báo khi liên kết
 * hết hạn / không hợp lệ. Phiên khôi phục là phiên đăng nhập thật nên hộp thoại không đóng bằng Esc:
 * người dùng phải chọn đặt mật khẩu hoặc đăng xuất.
 */
export function PasswordRecoveryDialog({ onRequestNewLink }: { onRequestNewLink: () => void }) {
  const [initial] = useState(() => getInitialAuthRedirect());
  const [open, setOpen] = useState(() => !initialRedirectHandled && initial.kind === "recovery");
  const [linkProblem, setLinkProblem] = useState<"expired" | "invalid" | null>(
    () => (!initialRedirectHandled && initial.kind === "error" ? initial.reason : null),
  );
  const [step, setStep] = useState<RecoveryStep>("password");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const { data } = subscribeToAuthChanges((event) => {
      if (event === "PASSWORD_RECOVERY") setOpen(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  function reset() {
    setPassword("");
    setConfirmPassword("");
    setTotp("");
    setError("");
    setStep("password");
  }

  async function finish() {
    try {
      await signOutOtherSessions();
    } catch {
      // Không đăng xuất được các phiên khác không làm hỏng việc đổi mật khẩu.
    }
    initialRedirectHandled = true;
    setPassword("");
    setConfirmPassword("");
    setTotp("");
    setStep("done");
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const checked = validateNewPassword(password, confirmPassword);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error: updateError } = await updateAccountPassword(password);
      if (updateError?.code === "insufficient_aal") {
        setStep("totp");
      } else if (updateError) {
        setError(passwordUpdateErrorMessage(updateError));
      } else {
        await finish();
      }
    } catch {
      setError("Không thể kết nối dịch vụ tài khoản. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function submitTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const code = normalizeTotpCode(totp);
    if (!code) {
      setError("Nhập mã xác thực gồm 6 chữ số.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (!(await verifyTotpForPasswordChange(code))) {
        setError("Mã xác thực không hợp lệ hoặc đã hết hạn. Hãy thử mã mới.");
        return;
      }
      const { error: updateError } = await updateAccountPassword(password);
      if (updateError) setError(passwordUpdateErrorMessage(updateError));
      else await finish();
    } catch {
      setError("Không thể kết nối dịch vụ tài khoản. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelAndSignOut() {
    if (busy) return;
    setBusy(true);
    try {
      await signOutLocal();
    } catch {
      // Phiên cục bộ vẫn được dọn ở lần tải sau; không chặn người dùng thoát.
    }
    initialRedirectHandled = true;
    reset();
    setBusy(false);
    setOpen(false);
  }

  function closeDone() {
    reset();
    setOpen(false);
  }

  function closeLinkProblem() {
    initialRedirectHandled = true;
    setLinkProblem(null);
  }

  function requestNewLink() {
    closeLinkProblem();
    onRequestNewLink();
  }

  return (
    <>
      <Modal open={open} onClose={() => undefined} labelledBy="password-recovery-title" className="password-recovery-modal">
        <span className="eyebrow">CẢNH GIÁC SỐ · KHÔI PHỤC TÀI KHOẢN</span>
        {step === "done" ? (
          <>
            <h2 id="password-recovery-title">Đã đổi mật khẩu</h2>
            <p className="auth-notice" role="status">Mật khẩu mới đã được lưu. Các thiết bị khác đang đăng nhập sẽ cần đăng nhập lại bằng mật khẩu mới.</p>
            <div className="profile-actions">
              <button className="primary-button" type="button" onClick={closeDone}>Tiếp tục</button>
            </div>
          </>
        ) : step === "totp" ? (
          <>
            <h2 id="password-recovery-title">Xác thực hai lớp</h2>
            <p className="auth-intro">Tài khoản này bật xác thực hai lớp. Nhập mã 6 số từ ứng dụng Authenticator để hoàn tất việc đổi mật khẩu.</p>
            <form className="auth-form" onSubmit={(event) => void submitTotp(event)} noValidate>
              <label>
                <span>Mã xác thực</span>
                <input inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={totp} onChange={(event) => setTotp(event.target.value)} placeholder="123456" />
              </label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "Đang xác thực…" : "Xác thực và đổi mật khẩu"}</button>
              <button className="admin-secondary" type="button" disabled={busy} onClick={() => void cancelAndSignOut()}>Hủy và đăng xuất</button>
            </form>
          </>
        ) : (
          <>
            <h2 id="password-recovery-title">Đặt mật khẩu mới</h2>
            <p className="auth-intro">Bạn vừa mở liên kết khôi phục trong email. Hãy đặt mật khẩu mới cho tài khoản. {PASSWORD_REQUIREMENTS_MESSAGE}</p>
            <form className="auth-form" onSubmit={(event) => void submitPassword(event)} noValidate>
              <label>
                <span>Mật khẩu mới</span>
                <input type="password" autoComplete="new-password" maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Từ 10 ký tự: hoa, thường, số, ký tự đặc biệt" />
              </label>
              <label>
                <span>Xác nhận mật khẩu mới</span>
                <input type="password" autoComplete="new-password" maxLength={72} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Nhập lại mật khẩu mới" />
              </label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu mật khẩu mới"}</button>
              <button className="admin-secondary" type="button" disabled={busy} onClick={() => void cancelAndSignOut()}>Hủy và đăng xuất</button>
            </form>
          </>
        )}
      </Modal>

      <Modal open={Boolean(linkProblem)} onClose={closeLinkProblem} labelledBy="auth-link-problem-title" className="auth-link-problem-modal">
        <button className="modal-close" aria-label="Đóng thông báo" onClick={closeLinkProblem}><Icon name="close" size={18} /></button>
        <span className="eyebrow">LIÊN KẾT KHÔNG DÙNG ĐƯỢC</span>
        <h2 id="auth-link-problem-title">Không mở được liên kết</h2>
        <p className="auth-error" role="alert">{authRedirectErrorMessage(linkProblem ?? "invalid")}</p>
        <div className="profile-actions">
          <button className="primary-button" type="button" onClick={requestNewLink}>Nhận liên kết mới</button>
          <button className="admin-secondary" type="button" onClick={closeLinkProblem}>Đóng</button>
        </div>
      </Modal>
    </>
  );
}
