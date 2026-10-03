import type { SiteContent } from "../../data";
import { BrandMark, FooterNotice } from "../../shared/ui-primitives";
import type { SessionAccount } from "../auth/model";
import { SIMULATION_BANNER_VIEWS, type View } from "./navigation";

export function AppHeader({
  view,
  account,
  playerName,
  dark,
  onNavigate,
  onToggleDark,
  onOpenProfile,
  onOpenAuth,
}: {
  view: View;
  account: SessionAccount | null;
  playerName: string;
  dark: boolean;
  onNavigate: (view: View) => void;
  onToggleDark: () => void;
  onOpenProfile: () => void;
  onOpenAuth: (mode: "login" | "register") => void;
}) {
  return (
    <aside className="left-rail" role="navigation" aria-label="Điều hướng chính">
      <div className="left-rail-brand">
        <button onClick={() => onNavigate("game")} aria-label="Cảnh Giác Số — về màn chơi" title="Cảnh Giác Số">
          <BrandMark />
        </button>
      </div>

      <nav className="left-rail-nav" aria-label="Chuyên mục">
        <button aria-current={view === "game" ? "page" : undefined} className={view === "game" ? "active" : ""} onClick={() => onNavigate("game")} aria-label="Thử thách" title="Thử thách">🎮</button>
        <button aria-current={view === "knowledge" ? "page" : undefined} className={view === "knowledge" ? "active" : ""} onClick={() => onNavigate("knowledge")} aria-label="Cẩm nang" title="Cẩm nang">📚</button>
        <button aria-current={view === "news" ? "page" : undefined} className={view === "news" ? "active" : ""} onClick={() => onNavigate("news")} aria-label="Tin tức" title="Tin tức">📰</button>
        <button aria-current={view === "quiz" ? "page" : undefined} className={view === "quiz" ? "active" : ""} onClick={() => onNavigate("quiz")} aria-label="Thực hành" title="Thực hành">⚡</button>
        <button aria-current={view === "stats" ? "page" : undefined} className={view === "stats" ? "active" : ""} onClick={() => onNavigate("stats")} aria-label="Thành tích" title="Thành tích">🏆</button>
        <button type="button" onClick={() => window.location.assign("/gioi-thieu/")} aria-label="Giới thiệu" title="Giới thiệu">ℹ</button>
      </nav>

      <div className="left-rail-actions">
        <button aria-pressed={dark} onClick={onToggleDark} aria-label="Đổi chế độ sáng tối" title={dark ? "Chế độ sáng" : "Chế độ tối"}>{dark ? "☀" : "☾"}</button>
        {account ? (
          <button onClick={onOpenProfile} aria-label={`Tài khoản: ${playerName}`} title="Tài khoản">{playerName.trim().slice(0, 1).toUpperCase() || "N"}</button>
        ) : (
          <button type="button" onClick={() => onOpenAuth("register")} aria-label="Đăng ký" title="Đăng ký">+</button>
        )}
      </div>

      {SIMULATION_BANNER_VIEWS.has(view) && (
        <div className="security-awareness-banner" role="note">
          <strong>Mô phỏng</strong>
        </div>
      )}
    </aside>
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
