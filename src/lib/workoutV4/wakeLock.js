import { useEffect, useRef } from "react";
import { isWakeLockSupported } from "./wakeLockSupport.js";

export { isWakeLockSupported };

/**
 * React hook to acquire and maintain Screen Wake Lock while session is active.
 * Graceful no-op on unsupported browsers or when permission is denied.
 * Automatically releases lock on unmount or session exit.
 *
 * @param {boolean} isActive - Whether the workout session is currently active
 */
export function useSessionWakeLock(isActive = true) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;
    if (!isWakeLockSupported()) return;

    let isDisposed = false;

    const requestLock = async () => {
      if (isDisposed || !isActive) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

      try {
        if (sentinelRef.current && !sentinelRef.current.released) {
          await sentinelRef.current.release().catch(() => {});
        }
        const sentinel = await navigator.wakeLock.request("screen");
        if (isDisposed) {
          await sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener?.("release", () => {
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null;
          }
        });
      } catch {
        sentinelRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestLock();
      }
    };

    requestLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isDisposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (sentinelRef.current) {
        try {
          if (!sentinelRef.current.released) {
            sentinelRef.current.release().catch?.(() => {});
          }
        } catch {
          // ignore
        }
        sentinelRef.current = null;
      }
    };
  }, [isActive]);
}
