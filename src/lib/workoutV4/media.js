/**
 * Praxis Treinos V4 — Media & CDN Helpers
 *
 * Provides CDN path resolution for exercise thumbnails and animated GIFs
 * along with the required attribution metadata.
 */

export const CDN_IMG_BASE = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/images/';
export const CDN_GIF_BASE = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/';
export const MEDIA_ATTRIBUTION = '© Gym visual — https://gymvisual.com/';

function cleanMediaPath(raw, prefix) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  let path = trimmed.replace(/^\/+/, '');
  if (path.toLowerCase().startsWith('images/')) {
    path = path.slice('images/'.length);
  } else if (path.toLowerCase().startsWith('videos/')) {
    path = path.slice('videos/'.length);
  }
  path = path.replace(/^\/+/, '');
  if (!path) return null;

  return prefix + path;
}

export function thumbUrl(exerciseOrPath) {
  if (!exerciseOrPath) return null;
  if (typeof exerciseOrPath === 'string') {
    return cleanMediaPath(exerciseOrPath, CDN_IMG_BASE);
  }
  const raw = exerciseOrPath.thumb_path || exerciseOrPath.image || exerciseOrPath.thumbUrl || null;
  return cleanMediaPath(raw, CDN_IMG_BASE);
}

export function gifUrl(exerciseOrPath) {
  if (!exerciseOrPath) return null;
  if (typeof exerciseOrPath === 'string') {
    return cleanMediaPath(exerciseOrPath, CDN_GIF_BASE);
  }
  const raw = exerciseOrPath.gif_path || exerciseOrPath.gif_url || exerciseOrPath.gifUrl || null;
  return cleanMediaPath(raw, CDN_GIF_BASE);
}
