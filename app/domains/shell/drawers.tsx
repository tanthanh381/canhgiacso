import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../../shared/icons";

export type Drawer = "scenarios" | "insight";

/**
 * Open state of the two slide-over panels of the challenge screen (scenario list and tips/progress) that
 * replace the side columns on small screens. Only one is open at a time; Escape closes it and focus goes
 * back to the button that opened it. The open drawer is exposed as a class on the app root for the CSS.
 */
export function useDrawers(active: boolean) {
  const [requested, setOpen] = useState<Drawer | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  // The panels are slide-overs only on the challenge screen of a small viewport: leaving it (also with the browser's back button or by rotating the device) closes the drawer.
  if (!active && requested) setOpen(null);
  const open = active ? requested : null;

  const show = useCallback((drawer: Drawer) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(drawer);
  }, []);
  const close = useCallback(() => {
    setOpen(null);
    opener.current?.focus();
    opener.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  const rootClassName = (dark: boolean) => ["app", dark && "dark", open === "scenarios" && "ux-scenarios-open", open === "insight" && "ux-insight-open"]
    .filter(Boolean).join(" ");

  return { open, show, close, rootClassName };
}

const DRAWER_LABELS: Record<Drawer, { label: string; className: string }> = {
  scenarios: { label: "Đóng danh sách tình huống", className: "ux-scenario-close" },
  insight: { label: "Đóng bảng mẹo và tiến trình", className: "ux-insight-close" },
};

/** Backdrop and close button of the open drawer (the panel itself is part of the page). */
export function DrawerControls({ open, onClose }: { open: Drawer | null; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  // Move focus into the drawer when it opens, so keyboard and screen reader users land in it.
  useEffect(() => { if (open) closeButton.current?.focus(); }, [open]);
  if (!open) return null;
  const { label, className } = DRAWER_LABELS[open];
  return (
    <>
      <button type="button" className={open === "insight" ? "ux-drawer-backdrop ux-insight-backdrop" : "ux-drawer-backdrop"} aria-label={label} onClick={onClose} />
      <button type="button" className={`ux-drawer-close ${className}`} aria-label={label} ref={closeButton} onClick={onClose}><Icon name="close" size={20} /></button>
    </>
  );
}
