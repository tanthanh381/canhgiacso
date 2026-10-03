import { Icon } from "../../shared/icons";
import { MENU_SURFACE_PROPS } from "./header-menus";
import { ABOUT_PATH, isNavItemActive, PRIMARY_NAV, type View } from "./navigation";

export const MOBILE_KNOWLEDGE_MENU_ID = "ux-mobile-knowledge-menu";

/**
 * Navigation bar shown under the header on small screens (the class keeps its historical "bottom nav" name,
 * the bar itself is fixed below the header). Same destinations and order as the desktop header, plus "Giới thiệu".
 */
export function MobileNav({ view, knowledgeOpen, onNavigate, onToggleKnowledge, knowledgeTriggerRef }: {
  view: View;
  knowledgeOpen: boolean;
  onNavigate: (view: View) => void;
  onToggleKnowledge: () => void;
  knowledgeTriggerRef: (element: HTMLElement | null) => void;
}) {
  return (
    <nav className="ux-bottom-nav" aria-label="Điều hướng di động">
      {PRIMARY_NAV.map((item) => {
        const active = isNavItemActive(item.view, view);
        const isKnowledge = item.view === "knowledge";
        return (
          <button
            key={item.view}
            type="button"
            ref={isKnowledge ? knowledgeTriggerRef : undefined}
            className={active ? "active" : ""}
            aria-current={active ? "page" : undefined}
            aria-label={item.ariaLabel}
            aria-expanded={isKnowledge ? knowledgeOpen : undefined}
            aria-controls={isKnowledge ? MOBILE_KNOWLEDGE_MENU_ID : undefined}
            onClick={isKnowledge ? onToggleKnowledge : () => onNavigate(item.view)}
            {...(isKnowledge ? MENU_SURFACE_PROPS : {})}
          >
            <span aria-hidden="true"><Icon name={item.icon} size={22} /></span>
            <small>{item.label}</small>
          </button>
        );
      })}
      <button type="button" className="ux-about-nav-item" onClick={() => window.location.assign(ABOUT_PATH)}>
        <span aria-hidden="true"><Icon name="info" size={22} /></span>
        <small>Giới thiệu</small>
      </button>
    </nav>
  );
}

/** The two Cẩm nang destinations as a sheet under the mobile bar. Rendered next to (not inside) the bar so it escapes the bar's stacking context. */
export function MobileKnowledgeMenu({ onOpenArticles, onOpenChecklist, onClose }: {
  onOpenArticles: () => void;
  onOpenChecklist: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <button type="button" className="ux-mobile-menu-backdrop" aria-label="Đóng menu Cẩm nang" onClick={onClose} />
      <div id={MOBILE_KNOWLEDGE_MENU_ID} className="ux-mobile-knowledge-menu" role="group" aria-label="Cẩm nang" {...MENU_SURFACE_PROPS}>
        <button type="button" onClick={onOpenArticles}>
          <strong>Bài viết kiến thức</strong>
          <small>Hướng dẫn, cảnh báo và nội dung tra cứu</small>
        </button>
        <button type="button" onClick={onOpenChecklist}>
          <strong>Danh sách kiểm tra</strong>
          <small>Tự kiểm tra an toàn số và lưu tiến độ</small>
        </button>
      </div>
    </>
  );
}
