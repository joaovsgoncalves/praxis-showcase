function qs(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }
  const s = query.toString();
  return s ? `?${s}` : '';
}

export const financeApiModule = (request) => ({
  finance: {
    overview: () => request('/api/finance/overview'),
    settings: () => request('/api/finance/settings'),
    updateSettings: (data) =>
      request('/api/finance/settings', { method: 'PATCH', body: JSON.stringify(data) }),
    accounts: {
      list: (params = {}) => request(`/api/finance/accounts${qs(params)}`),
      create: (data) => request('/api/finance/accounts', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) =>
        request(`/api/finance/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    },
    balances: {
      list: (params = {}) => request(`/api/finance/balances${qs(params)}`),
      create: (data) => request('/api/finance/balances', { method: 'POST', body: JSON.stringify(data) }),
    },
    debts: {
      list: (params = {}) => request(`/api/finance/debts${qs(params)}`),
      create: (data) => request('/api/finance/debts', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) =>
        request(`/api/finance/debts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      pay: (id, data) =>
        request(`/api/finance/debts/${id}/pay`, { method: 'POST', body: JSON.stringify(data) }),
    },
    subscriptions: {
      list: (params = {}) => request(`/api/finance/subscriptions${qs(params)}`),
      create: (data) =>
        request('/api/finance/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) =>
        request(`/api/finance/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      remove: (id) =>
        request(`/api/finance/subscriptions/${id}`, { method: 'DELETE' }),
    },
    installments: {
      list: (params = {}) => request(`/api/finance/installments${qs(params)}`),
      create: (data) =>
        request('/api/finance/installments', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) =>
        request(`/api/finance/installments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      remove: (id) =>
        request(`/api/finance/installments/${id}`, { method: 'DELETE' }),
    },
    transactions: {
      list: (params = {}) => request(`/api/finance/transactions${qs(params)}`),
      create: (data) =>
        request('/api/finance/transactions', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) =>
        request(`/api/finance/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    },
    insights: (params = {}) => request(`/api/finance/insights${qs(params)}`),
    goals: {
      list: () => request('/api/finance/goals'),
      create: (data) => request('/api/finance/goals', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) =>
        request(`/api/finance/goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    },
    sync: () => request('/api/finance/sync', { method: 'POST', body: '{}' }),
    lastSync: () => request('/api/finance/sync/last'),
  },
});
