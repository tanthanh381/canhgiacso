import { useEffect, useRef } from "react";
import { GlyphIcon, Icon, type IconName } from "./icons";

/** Decorative badge. Text children (content glyphs from data files) are drawn as inline SVG, never as font glyphs. */
export function BadgeIcon({ children, name }: { children?: React.ReactNode; name?: IconName }) {
  return (
    <span className="badge-icon" aria-hidden="true">
      {name ? <Icon name={name} size={22} /> : typeof children === "string" ? <GlyphIcon glyph={children} size={22} /> : children}
    </span>
  );
}

export function BrandMark() {
  return <span className="brand-logo" aria-hidden="true" />;
}

export function FooterNotice({ notice }: { notice: string }) {
  const match = notice.match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/);
  // Published copy may still carry the old "bởi:" wording; the brand line has no colon.
  const heading = match?.[1]?.replace(/vận hành bởi:\s*/i, "vận hành bởi ");
  const detail = match?.[2] ?? notice;
  const lines = detail.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return (
    <p className="footer-notice">
      {heading && <strong>{heading}</strong>}
      {lines.map((line, index) => (
        <span className={line.startsWith("Lưu ý:") ? "footer-warning" : undefined} key={`${index}-${line}`}>
          {line}
        </span>
      ))}
    </p>
  );
}

export function Modal({
  open,
  onClose,
  labelledBy,
  className = "",
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusableSelector = "button, input, select, textarea, a[href], [tabindex]:not([tabindex='-1'])";
    const focusTimer = window.setTimeout(() => {
      dialog?.querySelector<HTMLElement>(focusableSelector)?.focus();
    }, 0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-layer">
      <button className="modal-backdrop" aria-label="Đóng hộp thoại" onClick={onClose} />
      <section ref={dialogRef} className={`modal ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </section>
    </div>
  );
}
