import type { SiteContent } from "../../data";
import { Icon } from "../../shared/icons";
import { BrandMark, FooterNotice } from "../../shared/ui-primitives";
import type { SessionAccount } from "../auth/model";
import { MENU_SURFACE_PROPS, useHeaderMenus } from "./header-menus";
import { ManagementMenu, ManagementSheet, useManagementRole } from "./management-menu";
import { MobileKnowledgeMenu, MobileNav } from "./mobile-nav";
import { SimulationBanner, SimulationChip, useSimulationBanner } from "./simulation-banner";
import { ABOUT_PATH, isNavItemActive, KNOWLEDGE_ARTICLES_PATH, PRIMARY_NAV, scrollToChecklist, SIMULATION_BANNER_VIEWS, type View } from "./navigation";

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
  const menus = useHeaderMenus();
  const banner = useSimulationBanner();
  const managementRole = useManagementRole(account?.id ?? null);
  const knowledgeOpen = menus.open === "knowledge";
  const bannerView = SIMULATION_BANNER_VIEWS.has(view);

  const navigate = (next: View) => { menus.close(); onNavigate(next); };
  const openChecklist = () => { navigate("knowledge"); scrollToChecklist(); };
  const openArticles = () => { menus.close(); window.location.assign(KNOWLEDGE_ARTICLES_PATH); };

  return (
    <>
      <header className="topbar">
        <button className="brand" onClick={() => navigate("game")} aria-label="Cảnh Giác Số — về màn chơi">
          <BrandMark />
          <span className="brand-divider" aria-hidden="true" />
          <span className="product-lockup"><strong>{copy.productName}</strong><small>{copy.departmentName}</small></span>
        </button>
        <nav aria-label="Điều hướng chính">
          {PRIMARY_NAV.map((item) => {
            const active = isNavItemActive(item.view, view);
            const current = active ? "page" : undefined;
            if (item.view !== "knowledge") {
              return <button key={item.view} aria-current={current} className={active ? "active" : ""} onClick={() => navigate(item.view)}>{item.label}</button>;
            }
            return (
              <details key={item.view} className="knowledge-menu" open={knowledgeOpen && !menus.compact} {...MENU_SURFACE_PROPS}>
                <summary
                  ref={menus.triggerRef("knowledge-desktop")}
                  aria-label="Mở menu Cẩm nang"
                  aria-current={current}
                  className={active ? "active" : ""}
                  onClick={(event) => { event.preventDefault(); menus.toggle("knowledge"); }}
                >{item.label}</summary>
                <div className="knowledge-submenu" role="group" aria-label="Cẩm nang">
                  <button type="button" onClick={openArticles}><strong>Bài viết kiến thức</strong><small>Hướng dẫn, cảnh báo và nội dung tra cứu</small></button>
                  <button type="button" onClick={openChecklist}><strong>Danh sách kiểm tra</strong><small>Tự kiểm tra an toàn số và lưu tiến độ</small></button>
                </div>
              </details>
            );
          })}
          <button type="button" onClick={() => window.location.assign(ABOUT_PATH)}>Giới thiệu</button>
        </nav>
        <div className="top-actions">
          <button className="icon-button" aria-pressed={dark} onClick={onToggleDark} aria-label="Đổi chế độ sáng tối"><Icon name={dark ? "sun" : "moon"} size={20} /></button>
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
          {bannerView && banner.dismissed && <SimulationChip onRestore={banner.restore} />}
          {account && managementRole && (
            <ManagementMenu
              role={managementRole}
              open={menus.open === "management"}
              compact={menus.compact}
              onToggle={() => menus.toggle("management")}
              onClose={menus.close}
              triggerRef={menus.triggerRef("management")}
            />
          )}
        </div>
      </header>
      {bannerView && !banner.dismissed && <SimulationBanner onDismiss={banner.dismiss} />}
      <MobileNav
        view={view}
        knowledgeOpen={knowledgeOpen}
        onNavigate={navigate}
        onToggleKnowledge={() => menus.toggle("knowledge")}
        knowledgeTriggerRef={menus.triggerRef("knowledge-mobile")}
      />
      {menus.compact && menus.open === "management" && account && managementRole && <ManagementSheet role={managementRole} onClose={menus.close} />}
      {menus.compact && knowledgeOpen && <MobileKnowledgeMenu onOpenArticles={openArticles} onOpenChecklist={openChecklist} onClose={menus.close} />}
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

/** Older published copy repeats the product name ("Cảnh Giác Số · …"); the lockup above already says it. */
function footerTagline(copy: SiteContent["copy"]) {
  return copy.footerTagline.replace(/^c[ảa]nh\s+gi[áa]c\s+s[ốo]\s*[·•:–—-]\s*/i, "");
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
        <span><b>{copy.productName}</b><small>{copy.departmentName}</small><small className="footer-tagline">{footerTagline(copy)}</small></span>
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
