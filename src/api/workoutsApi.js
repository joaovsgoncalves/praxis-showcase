// Domain API helper for Workouts (Exercises, Programs, Sessions, Summary)

/** Body for POST /api/workouts/sessions. String → {workout_day_id}; object is sent as-is. */
export function sessionStartBody(data) {
  if (typeof data === 'string') return { workout_day_id: data };
  return data && typeof data === 'object' ? data : {};
}

export const workoutsApiModule = (request) => ({
  workouts: {
    muscleMap: (params = {}) => {
      const query = new URLSearchParams();
      if (params.mode) query.set('mode', params.mode);
      if (params.days !== undefined && params.days !== null) query.set('days', String(params.days));
      const qs = query.toString();
      return request(`/api/workouts/muscle-map${qs ? `?${qs}` : ''}`);
    },
    summary: () => request('/api/workouts/summary'),
    agentSnapshot: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/api/workouts/agent-snapshot${q ? `?${q}` : ''}`);
    },
    heatmap: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/api/workouts/heatmap${q ? `?${q}` : ''}`);
    },
    programs: {
      list: () => request('/api/workouts/programs'),
      get: (id) => request(`/api/workouts/programs/${id}`),
      create: (data) => request('/api/workouts/programs', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) => request(`/api/workouts/programs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id) => request(`/api/workouts/programs/${id}`, { method: 'DELETE' }),
      activate: (id) => request(`/api/workouts/programs/${id}/activate`, { method: 'POST', body: '{}' }),
      advance: (id, data = {}) => request(`/api/workouts/programs/${id}/advance`, { method: 'POST', body: JSON.stringify(data) }),
      reorderDays: (id, orderedIds) => request(`/api/workouts/programs/${id}/days/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ ordered_ids: orderedIds }),
      }),
    },
    days: {
      create: (programId, data) => request(`/api/workouts/programs/${programId}/days`, { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) => request(`/api/workouts/days/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id) => request(`/api/workouts/days/${id}`, { method: 'DELETE' }),
      addExercise: (id, data) => request(`/api/workouts/days/${id}/exercises`, { method: 'POST', body: JSON.stringify(data) }),
      reorderExercises: (id, orderedIds) => request(`/api/workouts/days/${id}/exercises/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ ordered_ids: orderedIds }),
      }),
    },
    exercises: {
      list: (params = {}) => {
        const query = new URLSearchParams();
        if (params.q) query.set('q', params.q);
        if (params.limit !== undefined && params.limit !== null) query.set('limit', String(params.limit));
        if (params.offset !== undefined && params.offset !== null) query.set('offset', String(params.offset));
        if (params.page !== undefined && params.page !== null) query.set('page', String(params.page));
        if (params.body_part) query.set('body_part', params.body_part);
        if (params.equipment) query.set('equipment', params.equipment);
        if (params.equipment_key) query.set('equipment_key', params.equipment_key);
        if (params.target_muscle) query.set('target_muscle', params.target_muscle);
        if (params.source) query.set('source', params.source);
        if (params.meta !== undefined && params.meta !== null && params.meta !== false) {
          query.set('meta', params.meta === true ? '1' : String(params.meta));
        }
        const qs = query.toString();
        return request(`/api/workouts/exercises${qs ? `?${qs}` : ''}`);
      },
      get: (id) => request(`/api/workouts/exercises/${id}`),
      create: (data) => request('/api/workouts/exercises', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) => request(`/api/workouts/exercises/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id) => request(`/api/workouts/exercises/${id}`, { method: 'DELETE' }),
      stats: (id) => request(`/api/workouts/exercises/${id}/stats`),
    },
    dayExercises: {
      update: (id, data) => request(`/api/workouts/day-exercises/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id) => request(`/api/workouts/day-exercises/${id}`, { method: 'DELETE' }),
    },
    sessions: {
      list: (params = {}) => {
        const query = new URLSearchParams();
        if (params.status) query.set('status', params.status);
        if (params.limit) query.set('limit', String(params.limit));
        const qs = query.toString();
        return request(`/api/workouts/sessions${qs ? `?${qs}` : ''}`);
      },
      active: () => request('/api/workouts/sessions/active'),
      get: (id) => request(`/api/workouts/sessions/${id}`),
      start: (data) => request('/api/workouts/sessions', {
        method: 'POST',
        body: JSON.stringify(sessionStartBody(data)),
      }),
      addExercise: (sessionId, data) =>
        request(`/api/workouts/sessions/${sessionId}/exercises`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      updateExercise: (sessionExerciseId, data) =>
        request(`/api/workouts/session-exercises/${sessionExerciseId}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      addSet: (sessionId, data) => request(`/api/workouts/sessions/${sessionId}/sets`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      updateSet: (setId, data) => request(`/api/workouts/sets/${setId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
      deleteSet: (setId) => request(`/api/workouts/sets/${setId}`, { method: 'DELETE' }),
      finish: (sessionId, data = {}) => request(`/api/workouts/sessions/${sessionId}/finish`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      abandon: (sessionId) => request(`/api/workouts/sessions/${sessionId}/abandon`, { method: 'POST', body: '{}' }),
    },
  },
});
