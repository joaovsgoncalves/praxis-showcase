/** Limites alinhados ao multer da API (10MB) e gravação na UI (90s). */
export const VOICE_CAPTURE_MAX_BYTES = 10 * 1024 * 1024;
export const VOICE_CAPTURE_MAX_DURATION_MS = 90_000;
export const VOICE_CAPTURE_WARN_DURATION_MS = 75_000;

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateVoiceBlob(blob, durationMs) {
  if (!blob || blob.size < 200) {
    return 'Áudio muito curto. Grave pelo menos 1 segundo e fale uma tarefa.';
  }
  if (blob.size > VOICE_CAPTURE_MAX_BYTES) {
    return `Arquivo grande demais (${formatBytes(blob.size)}). Máximo ${formatBytes(VOICE_CAPTURE_MAX_BYTES)} — grave menos de 90s.`;
  }
  if (durationMs > VOICE_CAPTURE_MAX_DURATION_MS) {
    return 'Gravação passou de 90 segundos. Pare antes e envie em partes menores.';
  }
  return null;
}