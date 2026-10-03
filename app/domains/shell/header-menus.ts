import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "../../shared/media-query";

export type HeaderMenu = "knowledge" | "management";

/** Below this width the header navigation is replaced by the mobile bar and its sheets (see styles/mobile-nav.css). */
export const COMPACT_QUERY = "(max-width: 900px)";

/** Marks every element that belongs to an open menu, so a click anywhere else can dismiss it. */
export const MENU_SURFACE_PROPS = { "data-menu-surface": "" } as const;

/**
 * One header menu can be open at a time (the desktop Cẩm nang menu, its mobile sheet, or the management menu).
 * The open menu closes on Escape (focus returns to its trigger), on a click outside of every menu surface and
 * when the viewport crosses the mobile breakpoint, because the menu is then drawn by a different component.
 */
export function useHeaderMenus() {
  const compact = useMediaQuery(COMPACT_QUERY);
  const [state, setState] = useState<{ menu: HeaderMenu | null; compact: boolean }>({ menu: null, compact: false });
  // Crossing the breakpoint swaps the menu for a different component: start closed (state adjusted while rendering).
  if (state.compact !== compact) setState({ menu: null, compact });
  const open = state.compact === compact ? state.menu : null;
  const triggers = useRef(new Map<string, HTMLElement>());

  const close = useCallback(() => setState({ menu: null, compact }), [compact]);
  const toggle = useCallback((menu: HeaderMenu) => setState((current) => ({
    menu: current.compact === compact && current.menu === menu ? null : menu,
    compact,
  })), [compact]);
  /** Ref callback that remembers the element that opens a menu ("knowledge-desktop", "knowledge-mobile", "management"). */
  const triggerRef = useCallback((key: string) => (element: HTMLElement | null) => {
    if (element) triggers.current.set(key, element);
    else triggers.current.delete(key);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const key = open === "management" ? "management" : `knowledge-${compact ? "mobile" : "desktop"}`;
      triggers.current.get(key)?.focus();
      setState({ menu: null, compact });
    };
    // A click (not a press) so that the backdrop under a mobile sheet still receives the whole gesture.
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-menu-surface]")) return;
      setState({ menu: null, compact });
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick);
    };
  }, [open, compact]);

  return { open, compact, toggle, close, triggerRef };
}
