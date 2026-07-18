// In dev: set VITE_API_URL=http://localhost:3001 in frontend/.env
// In prod: leave unset — Vercel rewrites /api/* to Railway (see root vercel.json)
const BASE = import.meta.env.VITE_API_URL ?? '';

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('agrodesk-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login: (phone: string, password: string) =>
    req<{ token: string; dealer: any }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
  register: (data: { name: string; phone: string; password: string; city?: string; district?: string }) =>
    req<{ token: string; dealer: any }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  googleLogin: (credential: string) =>
    req<{ token: string; dealer: any }>('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  me: () => req<{ dealer: any }>('/api/auth/me'),
  updateProfile: (data: Record<string, unknown>) => req<{ dealer: any; success: boolean }>('/api/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Contacts ────────────────────────────────────────────────
export const api = {
  contacts: {
    list: (dealer_id: string, params?: { status?: string; search?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams({ dealer_id, ...Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])) });
      return req<{ contacts: any[]; total: number }>(`/api/contacts?${q}`);
    },
    create: (data: Record<string, unknown>) => req<{ contact: any; success: boolean }>('/api/contacts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => req<{ contact: any; success: boolean }>(`/api/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => req<{ success: boolean }>(`/api/contacts/${id}`, { method: 'DELETE' }),
  },

  campaigns: {
    list: (dealer_id: string) => req<{ campaigns: any[]; total: number }>(`/api/campaigns?dealer_id=${dealer_id}`),
    create: (data: Record<string, unknown>) => req<{ campaign: any; success: boolean }>('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => req<{ campaign: any; success: boolean }>(`/api/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    setStatus: (id: string, status: string) => req<{ campaign: any; success: boolean }>(`/api/campaigns/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    delete: (id: string) => req<{ success: boolean }>(`/api/campaigns/${id}`, { method: 'DELETE' }),
    contacts: {
      list: (id: string) => req<{ contacts: any[]; total: number }>(`/api/campaigns/${id}/contacts`),
      add: (id: string, contact_ids: string[]) => req<{ campaign: any; added: number; success: boolean }>(`/api/campaigns/${id}/contacts`, { method: 'POST', body: JSON.stringify({ contact_ids }) }),
      remove: (id: string, contact_id: string) => req<{ campaign: any; success: boolean }>(`/api/campaigns/${id}/contacts/${contact_id}`, { method: 'DELETE' }),
    },
  },

  recovery: {
    list: (dealer_id: string, params?: { stage?: string; status?: string }) => {
      const q = new URLSearchParams({ dealer_id, ...Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])) });
      return req<{ cases: any[]; total: number; total_due: number }>(`/api/recovery?${q}`);
    },
    create: (data: Record<string, unknown>) => req<{ case: any; success: boolean }>('/api/recovery', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => req<{ case: any; success: boolean }>(`/api/recovery/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    logContact: (id: string, data: { channel: string; outcome?: string }) => req<{ success: boolean; case: any }>(`/api/recovery/${id}/contact`, { method: 'POST', body: JSON.stringify(data) }),
    bulk: (dealer_id: string, channels?: string[]) => req<{ success: boolean; queued: number }>('/api/recovery/bulk', { method: 'POST', body: JSON.stringify({ dealer_id, channels }) }),
  },

  tractors: {
    list: (dealer_id: string, status?: string) => {
      const q = new URLSearchParams({ dealer_id, ...(status ? { status } : {}) });
      return req<{ tractors: any[]; total: number }>(`/api/tractors?${q}`);
    },
    create: (data: Record<string, unknown>) => req<{ tractor: any; success: boolean }>('/api/tractors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => req<{ tractor: any; success: boolean }>(`/api/tractors/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    setStatus: (id: string, status: string) => req<{ tractor: any; success: boolean }>(`/api/tractors/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    urgencyRefresh: () => req<{ success: boolean; updated: number }>('/api/tractors/urgency-refresh', { method: 'POST' }),
  },

  dashboard: {
    metrics: (dealer_id: string) => req<any>(`/api/dashboard/metrics?dealer_id=${dealer_id}`),
    activity: (dealer_id: string, limit?: number) => req<{ activity: any[] }>(`/api/dashboard/activity?dealer_id=${dealer_id}${limit ? `&limit=${limit}` : ''}`),
    charts: (dealer_id: string) => req<{ salesTrend: { month: string; sales: number; enquiries: number }[]; channels: { key: string; value: number }[]; weekly: { week: string; calls: number; whatsapp: number; sms: number; leads: number }[]; trends: { leads: number; sales: number } }>(`/api/dashboard/charts?dealer_id=${dealer_id}`),
    clearActivity: (dealer_id: string) => req<{ success: boolean; cleared: number }>(`/api/dashboard/activity?dealer_id=${dealer_id}`, { method: 'DELETE' }),
  },

  documents: {
    list: (dealer_id: string, period_month?: string) => {
      const q = new URLSearchParams({ dealer_id, ...(period_month ? { period_month } : {}) });
      return req<{ documents: any[]; total: number }>(`/api/documents?${q}`);
    },
    confirm: (id: string) => req<{ document: any; success: boolean }>(`/api/documents/${id}/confirm`, { method: 'PATCH' }),
    delete: (id: string) => req<{ success: boolean }>(`/api/documents/${id}`, { method: 'DELETE' }),
    upload: (data: { category: string; period_month: string; filename?: string; file_base64?: string; mime_type?: string }) =>
      req<{ document: any; success: boolean }>('/api/documents/upload', { method: 'POST', body: JSON.stringify(data) }),
    sendToAccountant: (data: { dealer_id: string; accountant_id: string; period_month: string }) => req<{ success: boolean; sent: number; to: string }>('/api/documents/send-to-accountant', { method: 'POST', body: JSON.stringify(data) }),
    accountants: (dealer_id: string) => req<{ accountants: any[] }>(`/api/documents/accountants?dealer_id=${dealer_id}`),
    tallyExportUrl: (period_month: string) => `${BASE}/api/documents/tally-export?period_month=${period_month}`,
  },

  ai: {
    script: (type: string, language: string, context?: Record<string, unknown>) =>
      req<{ script: string }>('/api/ai/script', { method: 'POST', body: JSON.stringify({ type, language, context }) }),
    listing: (tractor: Record<string, unknown>) =>
      req<{ description: string }>('/api/ai/listing', { method: 'POST', body: JSON.stringify({ tractor }) }),
    respond: (message: string, history: { role: string; content: string }[], language?: string, contact_id?: string, dealer_id?: string) =>
      req<{ reply: string }>('/api/ai/respond', { method: 'POST', body: JSON.stringify({ message, history, language, contact_id, dealer_id }) }),
  },

  conversations: {
    list: (dealer_id: string, params?: { contact_id?: string; campaign_id?: string; channel?: string; limit?: number }) => {
      const q = new URLSearchParams({ dealer_id, ...Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])) });
      return req<{ conversations: any[]; total: number }>(`/api/conversations?${q}`);
    },
    context: (contact_id: string, dealer_id: string) =>
      req<{ conversations: any[]; summary: string }>(`/api/conversations/context/${contact_id}?dealer_id=${dealer_id}`),
    create: (data: { dealer_id: string; contact_id: string; campaign_id?: string; channel: string; direction?: string; content: string; status?: string; twilio_sid?: string }) =>
      req<{ conversation: any; success: boolean }>('/api/conversations', { method: 'POST', body: JSON.stringify(data) }),
    stats: (dealer_id: string) =>
      req<{ total: number; sent: number; responses: number; interested: number; byChannel: Record<string, number>; byIntent: Record<string, number> }>(`/api/conversations/stats?dealer_id=${dealer_id}`),
  },

  jobs: {
    create: (data: { agent_type: string; payload: Record<string, unknown>; dealer_id: string }) =>
      req<{ job: any; success: boolean }>('/api/jobs', { method: 'POST', body: JSON.stringify(data) }),
    list: (dealer_id: string) =>
      req<{ jobs: any[]; total: number }>(`/api/jobs?dealer_id=${dealer_id}`),
  },

  support: {
    summary: () => req<{ newCount: number; untransferredCount: number; oldestNewAt: string | null }>('/api/support/summary'),
    list: (params?: { status?: string; type?: string; page?: number }) => {
      const q = new URLSearchParams(
        Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])),
      );
      const qs = q.toString();
      return req<{ requests: any[]; total: number; page: number; pageSize: number }>(`/api/support/requests${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => req<{ request: any }>(`/api/support/requests/${id}`),
    update: (id: string, data: { status?: string; type?: string; machineId?: string | null }) =>
      req<{ request: any; success: boolean }>(`/api/support/requests/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    create: (data: { phone: string; note: string; type?: string; caller_name?: string; contact_id?: string | null; machine_id?: string | null }) =>
      req<{ request: any; success: boolean }>('/api/support/requests', { method: 'POST', body: JSON.stringify(data) }),
    routing: () => req<{ routing: any }>('/api/support/routing'),
    saveRouting: (data: Record<string, unknown>) => req<{ routing: any; success: boolean }>('/api/support/routing', { method: 'PUT', body: JSON.stringify(data) }),
  },

  onboarding: {
    brands: () => req<{ brands: { id: string; name: string; category: string }[] }>('/api/onboarding/brands'),
    status: () => req<{ dealer: any; checklist: { profile: boolean; brands: boolean; plan: boolean }; complete: boolean }>('/api/onboarding/status'),
    saveProfile: (data: Record<string, unknown>) => req<{ dealer: any; success: boolean }>('/api/onboarding/profile', { method: 'PATCH', body: JSON.stringify(data) }),
    saveBrands: (brand_ids: string[]) => req<{ dealer: any; success: boolean }>('/api/onboarding/brands', { method: 'PATCH', body: JSON.stringify({ brand_ids }) }),
    savePlan: (plan: string) => req<{ dealer: any; success: boolean }>('/api/onboarding/plan', { method: 'PATCH', body: JSON.stringify({ plan }) }),
    complete: () => req<{ dealer: any; success: boolean }>('/api/onboarding/complete', { method: 'POST' }),
  },
};
