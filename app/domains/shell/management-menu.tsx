import { useEffect, useState } from "react";
import { Icon } from "../../shared/icons";
import { loadManagementRole, type ManagementRole } from "./gateway";
import { MENU_SURFACE_PROPS } from "./header-menus";
import { adminHash, type ManagementTab } from "./navigation";

/** Role of the signed-in account in the content management area (null while loading, for guests and for members). */
export function useManagementRole(accountId: string | null): ManagementRole | null {
  const [loaded, setLoaded] = useState<{ accountId: string; role: ManagementRole | null } | null>(null);

  useEffect(() => {
    if (!accountId) return;
    let active = true;
    void loadManagementRole().then((role) => { if (active) setLoaded({ accountId, role }); });
    return () => { active = false; };
  }, [accountId]);

  return loaded && loaded.accountId === accountId ? loaded.role : null;
}

type MenuProps = { role: ManagementRole; onClose: () => void };

/** Links of the management menu: everyone with a role sees content management, admins also see the analytics. */
function ManagementPopover({ role, onClose, className }: MenuProps & { className: string }) {
  const go = (hash: string) => { onClose(); window.location.hash = hash; };
  return (
    <div className={className} role="group" aria-label="Chức năng quản lý" {...MENU_SURFACE_PROPS}>
      {role === "admin" && <button type="button" onClick={() => go("#/dashboard")}>Dashboard</button>}
      <button type="button" onClick={() => go(adminHash("content"))}>Quản lý nội dung</button>
      {role === "admin" && (["traffic", "users"] as ManagementTab[]).map((tab) => (
        <button type="button" key={tab} onClick={() => go(adminHash(tab))}>{tab === "traffic" ? "Thống kê truy cập" : "Phân quyền"}</button>
      ))}
    </div>
  );
}

/** The "more" button in the top bar. On wide screens the menu drops down from it; on small ones see ManagementSheet. */
export function ManagementMenu({ role, open, compact, onToggle, onClose, triggerRef }: MenuProps & {
  open: boolean;
  compact: boolean;
  onToggle: () => void;
  triggerRef: (element: HTMLElement | null) => void;
}) {
  return (
    <div className="ux-utility-menu" {...MENU_SURFACE_PROPS}>
      <button type="button" ref={triggerRef} className="ux-utility-trigger" aria-expanded={open} aria-haspopup="true" aria-label="Mở chức năng quản lý" onClick={onToggle}><Icon name="more" size={20} /></button>
      {open && !compact && <ManagementPopover role={role} onClose={onClose} className="ux-utility-popover" />}
    </div>
  );
}

/** Small-screen version of the management menu: drawn below the mobile bar, outside the header's stacking context. */
export function ManagementSheet({ role, onClose }: MenuProps) {
  return (
    <>
      <button type="button" className="ux-utility-backdrop" aria-label="Đóng menu quản lý" onClick={onClose} />
      <ManagementPopover role={role} onClose={onClose} className="ux-utility-popover ux-utility-popover-mobile" />
    </>
  );
}
