import { useEffect } from "react";
import { useCrypto } from "./useCrypto";

const IDLE_LOCK_MS = 15 * 60 * 1000;
const HIDDEN_LOCK_MS = 5 * 60 * 1000;

export const useAutoLock = () => {
  const { isUnlocked, lock } = useCrypto();

  useEffect(() => {
    if (!isUnlocked) return;

    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let hiddenTimer: ReturnType<typeof setTimeout> | undefined;

    const resetIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => lock(), IDLE_LOCK_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenTimer = setTimeout(() => lock(), HIDDEN_LOCK_MS);
        return;
      }
      if (hiddenTimer) {
        clearTimeout(hiddenTimer);
        hiddenTimer = undefined;
      }
      resetIdle();
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];

    for (const event of events) window.addEventListener(event, resetIdle, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    resetIdle();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (hiddenTimer) clearTimeout(hiddenTimer);
      for (const event of events) window.removeEventListener(event, resetIdle);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isUnlocked, lock]);
};
