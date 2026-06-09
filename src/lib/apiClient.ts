const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

// ── JWT en sessionStorage ─────────────────────────────────────────────────────
export const token = {
  get:   ()          => sessionStorage.getItem('jwt') ?? '',
  set:   (t: string) => sessionStorage.setItem('jwt', t),
  clear: ()          => sessionStorage.removeItem('jwt'),
};

// ── Fetch base ────────────────────────────────────────────────────────────────
async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token.get()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(e.error ?? `Error ${res.status}`);
  }
  return res.json();
}

// ── Health check público (sin token) ─────────────────────────────────────────
export const healthCheck = () =>
  fetch('http://localhost:4000/health', { signal: AbortSignal.timeout(5000) })
    .then(r => { if (!r.ok) throw new Error('API no responde'); return r.json(); });

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    req<{ token: string; user: any }>('POST', '/auth/login', { email, password }),
};

// ── Roles ─────────────────────────────────────────────────────────────────────
export const rolesApi = {
  list:   ()                      => req<any[]>('GET',    '/roles'),
  create: (data: any)             => req<any>('POST',   '/roles', data),
  update: (id: string, data: any) => req<any>('PUT',    `/roles/${id}`, data),
  delete: (id: string)            => req<any>('DELETE', `/roles/${id}`),
};

// ── Usuarios ──────────────────────────────────────────────────────────────────
export const usersApi = {
  list:   ()                       => req<any[]>('GET',    '/users'),
  create: (data: any)              => req<any>('POST',   '/users', data),
  update: (id: number, data: any)  => req<any>('PUT',    `/users/${id}`, data),
  delete: (id: number)             => req<any>('DELETE', `/users/${id}`),
};

// ── Productos ─────────────────────────────────────────────────────────────────
export const productsApi = {
  list:   ()                       => req<any[]>('GET',    '/products'),
  create: (data: any)              => req<any>('POST',   '/products', data),
  update: (id: number, data: any)  => req<any>('PUT',    `/products/${id}`, data),
  delete: (id: number)             => req<any>('DELETE', `/products/${id}`),
};

// ── Inventario ────────────────────────────────────────────────────────────────
export const inventoryApi = {
  list:   ()                       => req<any[]>('GET',    '/inventory'),
  create: (data: any)              => req<any>('POST',   '/inventory', data),
  update: (id: number, data: any)  => req<any>('PUT',    `/inventory/${id}`, data),
  delete: (id: number)             => req<any>('DELETE', `/inventory/${id}`),
};

// ── Ventas ────────────────────────────────────────────────────────────────────
export const salesApi = {
  list:   ()           => req<any[]>('GET',  '/sales'),
  create: (data: any)  => req<any>('POST', '/sales', data),
};

// ── Cortes de caja ────────────────────────────────────────────────────────────
export const cashCutsApi = {
  list:   ()           => req<any[]>('GET',  '/cash-cuts'),
  create: (data: any)  => req<any>('POST', '/cash-cuts', data),
};

// ── Categorías ────────────────────────────────────────────────────────────────
export const categoriesApi = {
  list:   ()                      => req<any[]>('GET',    '/categories'),
  create: (data: any)             => req<any>('POST',   '/categories', data),
  update: (id: string, data: any) => req<any>('PUT',    `/categories/${id}`, data),
  delete: (id: string)            => req<any>('DELETE', `/categories/${id}`),
};

// ── Grupos de Modificadores ───────────────────────────────────────────────────
export const modifierGroupsApi = {
  list:   ()                      => req<any[]>('GET',    '/modifier-groups'),
  create: (data: any)             => req<any>('POST',   '/modifier-groups', data),
  update: (id: number, data: any) => req<any>('PUT',    `/modifier-groups/${id}`, data),
  delete: (id: number)            => req<any>('DELETE', `/modifier-groups/${id}`),
  assign: (productId: number, groupIds: number[]) =>
    req<any>('PUT', `/modifier-groups/assign/${productId}`, { groupIds }),
};

// ── Alias de compatibilidad (el código antiguo usa modifiersApi.list) ─────────
export const modifiersApi = {
  list: () => modifierGroupsApi.list(),
};
