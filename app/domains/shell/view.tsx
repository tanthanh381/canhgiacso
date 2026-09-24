import type { SiteContent } from "../../data";
import { BrandMark, FooterNotice } from "../../shared/ui-primitives";
import type { SessionAccount } from "../auth/model";
import { SIMULATION_BANNER_VIEWS, type View } from "./navigation";

export function AppHeader({
  view,
  copy,
  account,
  playerName,
  dark,
  onNavigate,
  onToggleDark,
  onOpenProfile,
  onOpenGuestNotice,
  onOpenAuth,
}: {
  view: View;
  copy: SiteContent["copy"];
  account: SessionAccount | null;
  playerName: string;
  dark: boolean;
  onNavigate: (view: View) => void;
  onToggleDark: () => void;
  onOpenProfile: () => void;
  onOpenGuestNotice: () => void;
  onOpenAuth: (mode: "login" | "register") => void;
}) {
  return (
    <>
      <header className="topbar">
        <button className="brand" onClick={() => onNavigate("game")} aria-label="Cảnh Giác Số — về màn chơi">
          <BrandMark />
          <span className="brand-divider" aria-hidden="true" />
          <span className="product-lockup"><strong>{copy.productName}</strong><small>{copy.departmentName}</small></span>
        </button>
        <nav aria-label="Điều hướng chính">
          <button aria-current={view === "game" ? "page" : undefined} className={view === "game" ? "active" : ""} onClick={() => onNavigate("game")}>Thử thách</button>
          <details className="knowledge-menu">
            <summary aria-label="Mở menu Cẩm nang" aria-current={view === "knowledge" ? "page" : undefined} className={view === "knowledge" ? "active" : ""}>Cẩm nang</summary>
            <div className="knowledge-submenu" role="group" aria-label="Cẩm nang">
              <button type="button" onClick={() => window.location.assign("/kien-thuc/")}><strong>Bài viết kiến thức</strong><small>Hướng dẫn, cảnh báo và nội dung tra cứu</small></button>
              <button type="button" onClick={() => {
                document.querySelector<HTMLDetailsElement>(".knowledge-menu")?.removeAttribute("open");
                onNavigate("knowledge");
                window.setTimeout(() => document.getElementById("security-checklist-title")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
              }}><strong>Danh sách kiểm tra</strong><small>Tự kiểm tra an toàn số và lưu tiến độ</small></button>
            </div>
          </details>
          <button aria-current={view === "news" ? "page" : undefined} className={view === "news" ? "active" : ""} onClick={() => onNavigate("news")}>Tin tức</button>
          <button aria-current={view === "quiz" ? "page" : undefined} className={view === "quiz" ? "active" : ""} onClick={() => onNavigate("quiz")}>Thực hành</button>
          <button aria-current={view === "stats" ? "page" : undefined} className={view === "stats" ? "active" : ""} onClick={() => onNavigate("stats")}>Thành tích</button>
          <button aria-current={view === "dashboard" ? "page" : undefined} className={view === "dashboard" ? "active" : ""} onClick={() => onNavigate("dashboard")}>Dashboard</button>
          {account && <button aria-current={view === "admin" ? "page" : undefined} className={view === "admin" ? "active" : ""} onClick={() => onNavigate("admin")}>Quản trị</button>}
        </nav>
        <div className="top-actions">
          <button className="icon-button" aria-pressed={dark} onClick={onToggleDark} aria-label="Đổi chế độ sáng tối">{dark ? "☀" : "☾"}</button>
          {account ? (
            <button className="profile-button" onClick={onOpenProfile} aria-label={`Mở tài khoản của ${playerName}`}>
              <span>{playerName.trim().slice(0, 1).toUpperCase() || "N"}</span>{playerName}
            </button>
          ) : (
            <div className="auth-actions">
              <button className="guest-badge guest-badge-button" type="button" onClick={onOpenGuestNotice}>Khách</button>
              <button className="login-button" onClick={() => onOpenAuth("login")}>Đăng nhập</button>
              <button className="signup-button" onClick={() => onOpenAuth("register")}>Đăng ký</button>
            </div>
          )}
        </div>
      </header>
      {SIMULATION_BANNER_VIEWS.has(view) && (
        <div className="security-awareness-banner" role="note">
          <strong>Môi trường mô phỏng</strong>
          <span>Không nhập mật khẩu ngân hàng, OTP, số thẻ hoặc dữ liệu thật. Mọi số tiền chỉ dùng cho đào tạo.</span>
        </div>
      )}
    </>
  );
}

export function SyncStatus({
  message,
  hasPendingChoice,
  saving,
  onRetry,
}: {
  message: string;
  hasPendingChoice: boolean;
  saving: boolean;
  onRetry: () => void;
}) {
  if (!message && !hasPendingChoice) return null;
  return (
    <div className="sync-status">
      {message && <span role="status" aria-live="polite">{message}</span>}
      {hasPendingChoice && <button className="admin-secondary" disabled={saving} onClick={onRetry}>{saving ? "Đang lưu…" : "Thử lưu lại"}</button>}
    </div>
  );
}

export function AppFooter({
  copy,
  onOpenGuide,
}: {
  copy: SiteContent["copy"];
  onOpenGuide: () => void;
}) {
  return (
    <footer>
      <div className="footer-brand" aria-label="Cảnh Giác Số">
        <BrandMark />
        <span><b>{copy.departmentName}</b><small>{copy.footerTagline}</small></span>
      </div>
      <FooterNotice notice={copy.footerNotice} />
      <div className="footer-actions">
        <nav aria-label="Thông tin website">
          <a href="/gioi-thieu/">Giới thiệu</a>
          <a href="/quyen-rieng-tu/">Quyền riêng tư</a>
        </nav>
        <button onClick={onOpenGuide}>Hướng dẫn & trợ giúp</button>
      </div>
    </footer>
  );
}
