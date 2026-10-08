/**
 * Wake Lock support check — no React.
 * The hook lives in wakeLock.js so Node/api tests can import the barrel.
 */
export function isWakeLockSupported(navigatorOverride) {
  const nav =
    navigatorOverride !== undefined
      ? navigatorOverride
      : typeof navigator !== 'undefined'
        ? navigator
        : undefined;

  return Boolean(nav && 'wakeLock' in nav && typeof nav.wakeLock?.request === 'function');
}
