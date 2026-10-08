// Domain API helper for Nutrition (Profile, Foods, Meals, Logs, Barcode, Weight)
export const nutritionApiModule = (request) => ({
  nutrition: {
    profile: () => request('/api/nutrition/profile'),
    updateProfile: (data) =>
      request('/api/nutrition/profile', { method: 'PUT', body: JSON.stringify(data) }),
    suggestProfile: (data = {}) =>
      request('/api/nutrition/profile/suggest', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    day: (date) => {
      const q = date ? `?date=${encodeURIComponent(date)}` : '';
      return request(`/api/nutrition/day${q}`);
    },
    foods: {
      list: (params = {}) => {
        const query = new URLSearchParams();
        if (params.q) query.set('q', params.q);
        if (params.favorites) query.set('favorites', '1');
        if (params.status) query.set('status', params.status);
        if (params.limit) query.set('limit', String(params.limit));
        const qs = query.toString();
        return request(`/api/nutrition/foods${qs ? `?${qs}` : ''}`);
      },
      get: (id) => request(`/api/nutrition/foods/${id}`),
      recent: (params = {}) => {
        const query = new URLSearchParams();
        if (params.limit) query.set('limit', String(params.limit));
        const qs = query.toString();
        return request(`/api/nutrition/foods/recent${qs ? `?${qs}` : ''}`);
      },
      create: (data) =>
        request('/api/nutrition/foods', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) =>
        request(`/api/nutrition/foods/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id, { hard = false } = {}) =>
        request(`/api/nutrition/foods/${id}${hard ? '?hard=1' : ''}`, { method: 'DELETE' }),
    },
    meals: {
      list: (params = {}) => {
        const query = new URLSearchParams();
        if (params.status) query.set('status', params.status);
        if (params.favorites) query.set('favorites', '1');
        if (params.limit) query.set('limit', String(params.limit));
        const qs = query.toString();
        return request(`/api/nutrition/meals${qs ? `?${qs}` : ''}`);
      },
      get: (id) => request(`/api/nutrition/meals/${id}`),
      create: (data) =>
        request('/api/nutrition/meals', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) =>
        request(`/api/nutrition/meals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id, { hard = false } = {}) =>
        request(`/api/nutrition/meals/${id}${hard ? '?hard=1' : ''}`, { method: 'DELETE' }),
    },
    logs: {
      create: (data) =>
        request('/api/nutrition/logs', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) =>
        request(`/api/nutrition/logs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id) => request(`/api/nutrition/logs/${id}`, { method: 'DELETE' }),
      fromMeal: (data) =>
        request('/api/nutrition/logs/from-meal', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      fromText: (data) =>
        request('/api/nutrition/logs/from-text', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },
    parseText: (data) =>
      request('/api/nutrition/parse-text', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    barcode: {
      lookup: (code, params = {}) => {
        const q = new URLSearchParams();
        if (params.refresh) q.set('refresh', '1');
        if (params.cacheOnly) q.set('cache_only', '1');
        const qs = q.toString();
        return request(
          `/api/nutrition/barcode/${encodeURIComponent(String(code).replace(/\D/g, ''))}${qs ? `?${qs}` : ''}`,
        );
      },
      lookupPost: (data) =>
        request('/api/nutrition/barcode/lookup', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },
    summary: (params = {}) => {
      const query = new URLSearchParams();
      if (params.from) query.set('from', params.from);
      if (params.to) query.set('to', params.to);
      const qs = query.toString();
      return request(`/api/nutrition/summary${qs ? `?${qs}` : ''}`);
    },
    copyDay: (data = {}) =>
      request('/api/nutrition/day/copy', { method: 'POST', body: JSON.stringify(data) }),
    seed: () => request('/api/nutrition/seed', { method: 'POST', body: '{}' }),
    weight: {
      list: (params = {}) => {
        const q = new URLSearchParams();
        if (params.from) q.set('from', params.from);
        if (params.to) q.set('to', params.to);
        if (params.limit) q.set('limit', String(params.limit));
        const qs = q.toString();
        return request(`/api/nutrition/weight${qs ? `?${qs}` : ''}`);
      },
      log: (data) =>
        request('/api/nutrition/weight', { method: 'POST', body: JSON.stringify(data) }),
      upsert: (data) =>
        request('/api/nutrition/weight', { method: 'POST', body: JSON.stringify(data) }),
      trend: (params = {}) => {
        const q = new URLSearchParams();
        if (params.days) q.set('days', String(params.days));
        const qs = q.toString();
        return request(`/api/nutrition/weight/trend${qs ? `?${qs}` : ''}`);
      },
      delete: (id) => request(`/api/nutrition/weight/${id}`, { method: 'DELETE' }),
    },
    regimen: {
      day: (date) => {
        const q = date ? `?date=${encodeURIComponent(date)}` : '';
        return request(`/api/nutrition/regimen${q}`);
      },
      items: (params = {}) => {
        const q = new URLSearchParams();
        if (params.status) q.set('status', params.status);
        const qs = q.toString();
        return request(`/api/nutrition/regimen/items${qs ? `?${qs}` : ''}`);
      },
      create: (data) =>
        request('/api/nutrition/regimen/items', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) =>
        request(`/api/nutrition/regimen/items/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      delete: (id, { hard = false } = {}) =>
        request(`/api/nutrition/regimen/items/${id}${hard ? '?hard=1' : ''}`, {
          method: 'DELETE',
        }),
      toggle: (id, data = {}) =>
        request(`/api/nutrition/regimen/items/${id}/toggle`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },
  },
});
