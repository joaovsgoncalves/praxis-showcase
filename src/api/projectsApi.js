export const projectsApiModule = (request) => ({
  projects: {
    list: () => request('/api/projects'),
    guidanceToday: () => request('/api/projects/guidance/today'),
    get: (id) => request(`/api/projects/${encodeURIComponent(id)}`),
    create: (data) => request('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) =>
      request(`/api/projects/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    listUpdates: (id, limit = 40) =>
      request(`/api/projects/${encodeURIComponent(id)}/updates?limit=${encodeURIComponent(limit)}`),
    addUpdate: (id, data) =>
      request(`/api/projects/${encodeURIComponent(id)}/updates`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    completeNextStep: (id, data = {}) =>
      request(`/api/projects/${encodeURIComponent(id)}/complete-next-step`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
});
