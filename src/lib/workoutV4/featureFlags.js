/**
 * Praxis Treinos V4 — Feature Flags
 *
 * Checks if Treinos V4 features are enabled via Vite environment variable.
 */

export function isTreinosV4Enabled() {
  const flag = typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_TREINOS_V4
    : typeof process !== 'undefined' && process.env
      ? process.env.VITE_TREINOS_V4
      : undefined;

  return flag === '1' || flag === 'true' || flag === true;
}
