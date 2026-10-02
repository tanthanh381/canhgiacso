import { useSyncExternalStore } from "react";
import { Icon } from "../../shared/icons";
import { safeStorageGet, safeStorageRemove, safeStorageSet } from "../../shared/browser-storage";

/** Documented in the privacy table (public/quyen-rieng-tu): the only thing stored is that the notice was hidden. */
export const SIMULATION_BANNER_KEY = "canhgiacso:simulation-banner-dismissed";

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

const isDismissed = () => dismissedInMemory || safeStorageGet(SIMULATION_BANNER_KEY) === "1";

function setDismissed(value: boolean) {
  dismissedInMemory = value;
  if (value) safeStorageSet(SIMULATION_BANNER_KEY, "1");
  else safeStorageRemove(SIMULATION_BANNER_KEY);
  listeners.forEach((listener) => listener());
}

/** Whether the "môi trường mô phỏng" notice was hidden. The server snapshot is "shown", so the HTML always contains the notice. */
export function useSimulationBanner() {
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => false);
  return { dismissed, dismiss: () => setDismissed(true), restore: () => setDismissed(false) };
}

export function SimulationBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="security-awareness-banner" role="note">
      <strong>Môi trường mô phỏng</strong>
      <span>Không nhập mật khẩu ngân hàng, OTP, số thẻ hoặc dữ liệu thật. Mọi số tiền chỉ dùng cho đào tạo.</span>
      <button type="button" className="ux-banner-close" aria-label="Ẩn lưu ý môi trường mô phỏng" onClick={onDismiss}><Icon name="close" size={18} /></button>
    </div>
  );
}

/** Small button in the top bar that brings the hidden notice back. */
export function SimulationChip({ onRestore }: { onRestore: () => void }) {
  return <button type="button" className="ux-simulation-chip" onClick={onRestore}><Icon name="shield" size={16} /> Mô phỏng</button>;
}
