import type { FormEventHandler } from "react";
import { Modal } from "../../shared/ui-primitives";
import type { AuthMode, SessionAccount } from "./model";

type AuthFields = {
  email: string;
  username: string;
  displayName: string;
  password: string;
  confirmPassword: string;
};

type AuthSetters = {
  setEmail: (value: string) => void;
  setUsername: (value: string) => void;
  setDisplayName: (value: string) => void;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
};

export function AccountDialogs({
  showGuestLimitNotice,
  authOpen,
  profileOpen,
  authMode,
  authFields,
  authSetters,
  authError,
  authNotice,
  authBusy,
  account,
  playerName,
  onPlayerNameChange,
  onDismissGuestNotice,
  onOpenAuthFromGuestNotice,
  onCloseAuth,
  onSwitchAuthMode,
  onSubmitAuth,
  onContinueAsGuest,
  onCloseProfile,
  onLogout,
}: {
  showGuestLimitNotice: boolean;
  authOpen: boolean;
  profileOpen: boolean;
  authMode: AuthMode;
  authFields: AuthFields;
  authSetters: AuthSetters;
  authError: string;
  authNotice: string;
  authBusy: boolean;
  account: SessionAccount | null;
  playerName: string;
  onPlayerNameChange: (value: string) => void;
  onDismissGuestNotice: () => void;
  onOpenAuthFromGuestNotice: (mode: AuthMode) => void;
  onCloseAuth: () => void;
  onSwitchAuthMode: (mode: AuthMode) => void;
  onSubmitAuth: FormEventHandler<HTMLFormElement>;
  onContinueAsGuest: () => void | Promise<void>;
  onCloseProfile: () => void | Promise<void>;
  onLogout: () => void | Promise<void>;
}) {
  return (
    <>
      <Modal open={showGuestLimitNotice} onClose={onDismissGuestNotice} labelledBy="guest-limit-title" className="guest-limit-modal">
        <button className="modal-close" aria-label="Đóng thông báo chế độ khách" onClick={onDismissGuestNotice}>×</button>
        <span className="modal-symbol">K</span>
        <span className="eyebrow">CHẾ ĐỘ KHÁCH</span>
        <h2 id="guest-limit-title">Bạn đang sử dụng với tính năng giới hạn</h2>
        <p className="guest-limit-intro">Bạn vẫn có thể làm thử thách ngay, nhưng kết quả chỉ lưu trên thiết bị hiện tại và có thể mất khi xóa dữ liệu trình duyệt.</p>
        <div className="guest-limit-grid" aria-label="So sánh chế độ khách và tài khoản">
          <article><strong>Khách</strong><span>Lưu tiến trình cục bộ, nhận bản ghi nhận PDF cục bộ và không đồng bộ giữa các thiết bị.</span></article>
          <article><strong>Tài khoản</strong><span>Đồng bộ tiến trình, lưu lịch sử lượt chơi, dùng chứng nhận đã xác minh và mở đầy đủ tính năng theo quyền được cấp.</span></article>
        </div>
        <div className="guest-limit-actions">
          <button className="primary-button" onClick={() => onOpenAuthFromGuestNotice("register")}>Tạo tài khoản</button>
          <button className="admin-secondary" onClick={() => onOpenAuthFromGuestNotice("login")}>Đăng nhập</button>
          <button className="guest-continue" type="button" onClick={onDismissGuestNotice}>Tiếp tục với tư cách khách</button>
        </div>
      </Modal>

      <Modal open={authOpen} onClose={onCloseAuth} labelledBy="auth-title" className="auth-modal">
        <button className="modal-close" aria-label="Đóng đăng nhập" onClick={onCloseAuth}>×</button>
        <span className="modal-symbol">H</span>
        <span className="eyebrow">CẢNH GIÁC SỐ · TÀI KHOẢN ĐỒNG BỘ</span>
        <div className="auth-tabs" aria-label="Chọn hình thức tài khoản">
          <button type="button" aria-pressed={authMode === "login"} className={authMode === "login" ? "active" : ""} onClick={() => onSwitchAuthMode("login")}>Đăng nhập</button>
          <button type="button" aria-pressed={authMode === "register"} className={authMode === "register" ? "active" : ""} onClick={() => onSwitchAuthMode("register")}>Đăng ký</button>
        </div>
        <h2 id="auth-title">{authMode === "login" ? "Chào mừng trở lại" : "Tạo hồ sơ phòng vệ"}</h2>
        <p className="auth-intro">Đăng nhập để lưu kết quả và tiếp tục trên thiết bị khác. Tài khoản mới được sử dụng ngay, không cần xác nhận email. Tiến trình khách được giữ riêng trên thiết bị và không tự chuyển vào tài khoản. Không sử dụng mật khẩu ngân hàng thật.</p>
        <form className="auth-form" onSubmit={onSubmitAuth}>
          {authMode === "register" && (
            <label><span>Tên hiển thị</span><input autoComplete="name" value={authFields.displayName} maxLength={32} onChange={(event) => authSetters.setDisplayName(event.target.value)} placeholder="Ví dụ: Minh An" /></label>
          )}
          {authMode === "register" && (
            <label><span>Tên đăng nhập</span><input autoComplete="username" value={authFields.username} minLength={3} maxLength={24} onChange={(event) => authSetters.setUsername(event.target.value)} placeholder="tanthanh381" autoCapitalize="none" spellCheck={false} /></label>
          )}
          <label><span>Email</span><input type="email" autoComplete="email" value={authFields.email} onChange={(event) => authSetters.setEmail(event.target.value)} placeholder="email@example.com" autoCapitalize="none" spellCheck={false} /></label>
          <label><span>Mật khẩu</span><input type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} value={authFields.password} minLength={8} maxLength={72} onChange={(event) => authSetters.setPassword(event.target.value)} placeholder={authMode === "register" ? "Hoa, thường, số và ký tự đặc biệt" : "Ít nhất 8 ký tự"} /></label>
          {authMode === "register" && (
            <label><span>Xác nhận mật khẩu</span><input type="password" autoComplete="new-password" value={authFields.confirmPassword} onChange={(event) => authSetters.setConfirmPassword(event.target.value)} placeholder="Nhập lại mật khẩu" /></label>
          )}
          {authError && <p className="auth-error" role="alert">{authError}</p>}
          {authNotice && <p className="auth-notice" role="status">{authNotice}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={authBusy}>
            {authBusy ? "Đang bảo vệ tài khoản…" : authMode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
          <div className="auth-or" aria-hidden="true"><span>hoặc</span></div>
          <button className="guest-continue" type="button" onClick={() => void onContinueAsGuest()}>Tiếp tục với tư cách khách</button>
        </form>
      </Modal>

      <Modal open={profileOpen} onClose={() => void onCloseProfile()} labelledBy="profile-title" className="profile-modal">
        <button className="modal-close" aria-label="Đóng hồ sơ" onClick={() => void onCloseProfile()}>×</button>
        <span className="eyebrow">TÀI KHOẢN ĐÃ ĐĂNG NHẬP</span>
        <h2 id="profile-title">Hồ sơ của bạn</h2>
        <p className="account-username">@{account?.username} · {account?.email}</p>
        <label className="profile-name-field">
          <span>Tên hiển thị</span>
          <input
            aria-label="Tên hiển thị"
            value={playerName}
            maxLength={32}
            onChange={(event) => onPlayerNameChange(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void onCloseProfile(); }}
          />
        </label>
        <div className="profile-actions">
          <button className="primary-button" onClick={() => void onCloseProfile()}>Lưu thay đổi</button>
          <button className="logout-button" onClick={() => void onLogout()}>Đăng xuất</button>
        </div>
        <p className="profile-note">Tiến trình được đồng bộ an toàn và phiên cũ trên trình duyệt được xoá khi đổi tài khoản.</p>
      </Modal>
    </>
  );
}
