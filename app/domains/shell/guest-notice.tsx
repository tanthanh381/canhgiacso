import { useSyncExternalStore } from "react";
import { Icon } from "../../shared/icons";
import { safeStorageGet, safeStorageSet } from "../../shared/browser-storage";

/** Own storage key: dismissing this notice must not touch any progress, theme or consent key. */
export const GUEST_NOTICE_KEY = "canhgiacso:guest-notice-dismissed";

// Storage can be blocked (private mode, policies); keep the choice for this page view in memory as well.
let dismissedInMemory = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

const isDismissed = () => dismissedInMemory || safeStorageGet(GUEST_NOTICE_KEY) === "1";

function dismiss() {
  dismissedInMemory = true;
  safeStorageSet(GUEST_NOTICE_KEY, "1");
  listeners.forEach((listener) => listener());
}

/**
 * Remembers whether the first-visit guest notice was closed. The server snapshot is "dismissed", so the
 * notice is never part of the server HTML and a returning visitor never sees a flash of it after hydration.
 */
export function useGuestNoticeDismissed() {
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true);
  return { visible: !dismissed, dismiss };
}

type GuestNoticeProps = {
  onLogin: () => void;
  onRegister: () => void;
  onContinue: () => void;
  onClose: () => void;
};

/**
 * Compact, non-blocking replacement for the first-visit guest modal: a labelled region above the scenario,
 * no focus trap, and the player can start immediately. The full comparison modal still opens from the "Khách" chip.
 */
export function GuestNotice({ onLogin, onRegister, onContinue, onClose }: GuestNoticeProps) {
  return (
    <div className="guest-notice" role="region" aria-labelledby="guest-notice-title" data-guest-notice>
      <div className="guest-notice-copy">
        <strong id="guest-notice-title">Bạn đang dùng chế độ khách</strong>
        <small>Kết quả chỉ lưu trên thiết bị này.<span className="guest-notice-more"> Tạo tài khoản để đồng bộ tiến trình.</span></small>
      </div>
      <div className="guest-notice-actions">
        <button type="button" className="guest-notice-primary" onClick={onLogin}>Đăng nhập</button>
        <button type="button" className="guest-notice-secondary" onClick={onRegister}>Tạo tài khoản</button>
        <button type="button" className="guest-notice-continue" data-guest-dismiss onClick={onContinue}>Tiếp tục với tư cách khách</button>
      </div>
      <button type="button" className="guest-notice-close" aria-label="Đóng thông báo chế độ khách" onClick={onClose}>
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
