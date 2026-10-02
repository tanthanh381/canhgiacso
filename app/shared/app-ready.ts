import { useEffect } from "react";

/** Class set on <body> by app/layout.tsx while its loading screen is up (the static build has no loading screen). */
export const APP_BOOT_CLASS = "refresh-boot";
/** Class that lifts the loading screen. */
export const APP_READY_CLASS = "refresh-ready";

/** The page calls this with "the first interaction can work" (content loaded, progress restored); the loading screen then goes away. */
export function useAppReady(ready: boolean) {
  useEffect(() => {
    if (ready && document.body.classList.contains(APP_BOOT_CLASS)) document.body.classList.add(APP_READY_CLASS);
  }, [ready]);
}
