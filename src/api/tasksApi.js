// Domain API helper for Tasks, Ideas and Purchases
export const tasksApiModule = (request) => ({
  tasks: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/api/tasks${query ? '?' + query : ''}`);
    },
    get: (id) => request(`/api/tasks/${id}`),
    create: (data) => request('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    reorder: (orderedIds) => request('/api/tasks/reorder', { method: 'PATCH', body: JSON.stringify({ ordered_ids: orderedIds }) }),
    /** Empurra data para amanhã; status permanece aberto. Body: { reason? } */
    notToday: (id, body = {}) =>
      request(`/api/tasks/${id}/not-today`, { method: 'POST', body: JSON.stringify(body) }),
    delete: (id) => request(`/api/tasks/${id}`, { method: 'DELETE' }),
  },

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
});
