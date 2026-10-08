// Praxis API Client — unified client for the Praxis backend
import { tasksApiModule } from './tasksApi';
import { nutritionApiModule } from './nutritionApi';
import { workoutsApiModule } from './workoutsApi';
import { financeApiModule } from './financeApi';
import { projectsApiModule } from './projectsApi';

// Em produção, usa API relativa para passar pelo proxy /api do Vercel.
// Em dev local, .env define VITE_PRAXIS_API/VITE_FORJA_API para o backend da Praxis.
// Nunca colocar segredo administrativo em VITE_*: tudo que começa com VITE é exposto no bundle.
const PRAXIS_API = import.meta.env.PROD ? '' : (import.meta.env.VITE_PRAXIS_API || import.meta.env.VITE_FORJA_API || '');

// Endpoints whose GET responses we mirror to localStorage so the UI keeps
// working when the backend is unreachable (Tailscale offline, VPS down, etc).
const OFFLINE_CACHEABLE = [
  '/api/tasks',
  '/api/habits',
  '/api/habit-logs',
  '/api/wellness',
  '/api/goals',
  '/api/gamification',
  '/api/calendar/today',
  '/api/focus/stats',
  '/api/insights/best-hours',
  '/api/insights/correlation',
  '/api/insights/weekly',
  '/api/insights/avoidance',
  '/api/workouts/summary',
  '/api/workouts/programs',
  '/api/workouts/exercises',
  '/api/workouts/sessions',
  '/api/workouts/heatmap',
  '/api/weekly-reviews',
  '/api/finance/overview',
  '/api/projects',
];

const OFFLINE_KEY_PREFIX = 'praxis:offline:';

function isCacheable(path) {
  if (path.startsWith('/api/projects/guidance')) return false;
  return OFFLINE_CACHEABLE.some(p => path === p || path.startsWith(p + '?') || path.startsWith(p + '/'));
}

function readOfflineCache(path) {
  try {
    // Tenta ler o novo prefixo 'praxis:offline:' primeiro
    let raw = localStorage.getItem('praxis:offline:' + path);
    if (!raw) {
      // Tenta ler o antigo 'forja:offline:' como fallback
      raw = localStorage.getItem('forja:offline:' + path);
    }
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeOfflineCache(path, data) {
  try {
    localStorage.setItem(
      OFFLINE_KEY_PREFIX + path,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {}
}

export function getOfflineStatus() {
  // Heuristic: most-recently-cached entry; UI uses this to show a stale banner.
  let mostRecent = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !(key.startsWith('praxis:offline:') || key.startsWith('forja:offline:'))) continue;
    try {
      const entry = JSON.parse(localStorage.getItem(key));
      if (entry?.timestamp > mostRecent) mostRecent = entry.timestamp;
    } catch {}
  }
  return { lastSyncAt: mostRecent || null };
}

// ---------------------------------------------------------------------------
// Stale-serving signal.
// A cacheable GET that falls back to localStorage returns data flagged with
// __stale, but every screen would have to read that flag to warn the user.
// Instead the client broadcasts the transition once and OfflineBanner (mounted
// in AppLayout) renders the warning for whatever page is open.
// ---------------------------------------------------------------------------
const OFFLINE_STATE_EVENT = 'praxis:offline-state';
let servingStale = false;
let servingStaleSince = null;

function emitOfflineState(stale, cachedAt = null) {
  if (stale === servingStale && cachedAt === servingStaleSince) return;
  servingStale = stale;
  servingStaleSince = stale ? cachedAt : null;
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(OFFLINE_STATE_EVENT, {
      detail: { stale: servingStale, cachedAt: servingStaleSince },
    }),
  );
}

/** Current stale state — for components mounting after the last transition. */
export function getStaleState() {
  return { stale: servingStale, cachedAt: servingStaleSince };
}

/** Subscribe to stale transitions. Returns an unsubscribe function. */
export function subscribeStaleState(listener) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event) => listener(event.detail);
  window.addEventListener(OFFLINE_STATE_EVENT, handler);
  return () => window.removeEventListener(OFFLINE_STATE_EVENT, handler);
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  const isGet = !options.method || options.method === 'GET';

  try {
    const res = await fetch(`${PRAXIS_API}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const err = new Error(body?.error || body?.detail || `API error: ${res.status}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    if (res.status === 204) return null;
    const data = await res.json();
    if (isGet && isCacheable(path)) {
      writeOfflineCache(path, data);
      emitOfflineState(false);
    }
    return data;
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) throw err;
    // Fall back to cached payload only on cacheable GETs — never silently swallow writes.
    if (isGet && isCacheable(path)) {
      const cached = readOfflineCache(path);
      if (cached) {
        emitOfflineState(true, cached.timestamp);
        const stale = { __stale: true, __cachedAt: cached.timestamp };
        return Array.isArray(cached.data)
          ? Object.assign(cached.data.slice(), stale)
          : { ...cached.data, ...stale };
      }
    }
    throw err;
  }
}

export const praxisApi = {
  // Health
  health: () => request('/api/health'),

  auth: {
    config: () => request('/api/auth/config'),
    me: () => request('/api/auth/me'),
    login: (password) =>
      request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password: String(password ?? '').trim() }),
      }),
    logout: () => request('/api/auth/logout', { method: 'POST', body: '{}' }),
  },

  ...tasksApiModule(request),
  ...nutritionApiModule(request),
  // Workouts live only in workoutsApiModule. Do not redeclare `workouts` here — it drops heatmap, agentSnapshot, exercises.stats, and sessions.addExercise.
  ...workoutsApiModule(request),
  ...financeApiModule(request),
  ...projectsApiModule(request),


  ideas: {
    list: (params = {}) => {
      const query = new URLSearchParams({ category: 'ideias', limit: 100, ...params }).toString();
      return request(`/api/tasks?${query}`);
    },
    promoteToTask: (id, data = {}) =>
      request(`/api/ideas/${id}/to-task`, { method: 'POST', body: JSON.stringify(data) }),
  },

  purchases: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/api/purchases${query ? `?${query}` : ''}`);
    },
    create: (data) => request('/api/purchases', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/api/purchases/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => request(`/api/purchases/${id}`, { method: 'DELETE' }),
  },

  // Nutrition lives only in nutritionApiModule; redeclaring it here silently drops methods.

  // Habits
  habits: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/api/habits${query ? '?' + query : ''}`);
    },
    create: (data) => request('/api/habits', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/api/habits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    reorder: (orderedIds) => request('/api/habits/reorder', { method: 'PATCH', body: JSON.stringify({ ordered_ids: orderedIds }) }),
    reorderChildren: (id, orderedIds) =>
      request(`/api/habits/${id}/children`, {
        method: 'PATCH',
        body: JSON.stringify({ ordered_ids: orderedIds }),
      }),
    delete: (id) => request(`/api/habits/${id}`, { method: 'DELETE' }),
  },

  // Habit Logs — body: { habit_id, date, outcome?: 'done'|'skipped', skip_reason?, note?, completed?, value? }
  habitLogs: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/api/habit-logs${query ? '?' + query : ''}`);
    },
    create: (data) => request('/api/habit-logs', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/api/habit-logs/${id}`, { method: 'DELETE' }),
  },

  // Wellness
  wellness: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/api/wellness${query ? '?' + query : ''}`);
    },
    create: (data) => request('/api/wellness', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Focus Sessions
  focus: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/api/focus${query ? '?' + query : ''}`);
    },
    create: (data) => request('/api/focus', { method: 'POST', body: JSON.stringify(data) }),
    stats: (days = 30) => request(`/api/focus/stats?days=${days}`),
  },

  // Goals
  goals: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/api/goals${query ? '?' + query : ''}`);
    },
    get: (id) => request(`/api/goals/${id}`),
    create: (data) => request('/api/goals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/api/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/api/goals/${id}`, { method: 'DELETE' }),
  },

  // User Settings
  ops: {
    backupMeta: () => request('/api/ops/backup-meta'),
  },

  user: {
    getSettings: () => request('/api/user/settings'),
    updateSettings: (data) => request('/api/user/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // Parse Voice (LLM)
  parseVoice: (text) => request('/api/parse-voice', { method: 'POST', body: JSON.stringify({ text }) }),

  captures: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/api/captures${q ? `?${q}` : ''}`);
    },
    pendingCount: () => request('/api/captures/pending-count'),
    get: (id) => request(`/api/captures/${id}`),
    createText: (text, source = 'share') =>
      request('/api/captures/text', {
        method: 'POST',
        body: JSON.stringify({ text, source }),
      }),
    retry: async (id) => {
      const res = await fetch(`${PRAXIS_API}/api/captures/${id}/retry`, {
        method: 'POST',
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(body.detail || body.error || 'Retry failed');
        err.status = res.status;
        err.body = body;
        throw err;
      }
      return body;
    },
    saveParsed: (id, parsedItems) =>
      request(`/api/captures/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ parsed_items: parsedItems }),
      }),
    archive: (id) =>
      request(`/api/captures/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'archived' }),
      }),
    submitAudio: async (audioBlob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      const res = await fetch(`${PRAXIS_API}/api/captures`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(body.detail || body.error || 'Capture failed');
        err.status = res.status;
        err.body = body;
        throw err;
      }
      return body;
    },
  },

  // Gamification
  gamification: {
    get: () => request('/api/gamification'),
    addXp: (amount, reason) =>
      request('/api/gamification/add-xp', {
        method: 'POST',
        body: JSON.stringify({ amount, reason }),
      }),
    checkAchievements: () =>
      request('/api/gamification/check-achievements', {
        method: 'POST',
      }),
  },

  // Insights
  insights: {
    bestHours: () => request('/api/insights/best-hours'),
    correlation: (days = 60) => request(`/api/insights/correlation?days=${days}`),
    weekly: (weekStart) =>
      request(`/api/insights/weekly${weekStart ? `?week_start=${encodeURIComponent(weekStart)}` : ''}`),
    avoidance: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/api/insights/avoidance${q ? `?${q}` : ''}`);
    },
  },

  praxia: {
    confront: (body = {}) =>
      request('/api/praxia/confront', { method: 'POST', body: JSON.stringify(body) }),
  },

  // Weekly reviews
  weeklyReviews: {
    list: (limit = 12) => request(`/api/weekly-reviews?limit=${limit}`),
    current: (date) => request(`/api/weekly-reviews/current${date ? '?date=' + date : ''}`),
    save: (data) => request('/api/weekly-reviews', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/api/weekly-reviews/${id}`, { method: 'DELETE' }),
  },

  // Calendar
  getTodayCalendar: () => request('/api/calendar/today'),

  // Transcription
  transcribe: async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    const res = await fetch(`${PRAXIS_API}/api/transcribe`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Transcription failed');
    return res.json();
  },
};

export default praxisApi;
