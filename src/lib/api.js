/* =========================================================================
   ParkingDashboardAPI client.

   One deployment of the API serves ONE site and ONE database, so there is no
   site parameter anywhere here — point `VITE_API_BASE` at the site's API and
   every page follows.

   Responses are wrapped by the server as { success, message, data }; this
   module unwraps them and throws an `ApiError` when `success` is false or the
   HTTP status is not 2xx, so callers only ever deal with the payload.
   ========================================================================= */

const BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:5075/api').replace(/\/+$/, '')

const TOKEN_KEY = 'singha-parking-token'

export class ApiError extends Error {
  constructor(message, { status = 0, body = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/* ------------------------------------------------------------------- token */

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* private mode — the session just won't survive a reload */ }
}

/**
 * Called when the server rejects our token. `AuthProvider` registers a handler
 * so an expired session drops straight back to the login screen instead of
 * leaving every panel stuck on an error.
 */
let onUnauthorized = null
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

/* ------------------------------------------------------------------ params */

/** Local ISO without a timezone — the API binds these as local DateTime. */
export function toApiDate(value) {
  if (!value) return undefined
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Drop empty values so "all" filters don't reach the server as blanks. */
export function toQuery(params = {}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === 'all') continue
    search.append(key, value instanceof Date ? toApiDate(value) : String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

/** The shared dashboard / report filter set, as the API expects it. */
export function rangeParams(bounds, filters = {}) {
  return {
    from: bounds ? toApiDate(bounds.from) : undefined,
    to: bounds ? toApiDate(bounds.to) : undefined,
    ...filters,
  }
}

/* ------------------------------------------------------------------ request */

async function request(path, { method = 'GET', body, signal, raw = false } = {}) {
  const token = getToken()
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new ApiError('Cannot reach the parking API. Check that the service is running.')
  }

  if (res.status === 401) {
    setToken(null)
    onUnauthorized?.()
    throw new ApiError('Your session has expired. Please sign in again.', { status: 401 })
  }

  if (raw) {
    if (!res.ok) throw new ApiError(`Request failed (${res.status})`, { status: res.status })
    return res
  }

  let payload = null
  try { payload = await res.json() } catch { /* empty or non-JSON body */ }

  if (!res.ok || payload?.success === false) {
    throw new ApiError(
      payload?.message || payload?.error || `Request failed (${res.status})`,
      { status: res.status, body: payload }
    )
  }

  // Envelope-wrapped endpoints return { success, message, data }; the door
  // endpoints answer with the bare payload.
  return payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
}

export const api = {
  get: (path, opts) => request(path, opts),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
}

/* ---------------------------------------------------------------- endpoints */

export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  me: (signal) => api.get('/auth/me', { signal }),
  changePassword: (oldPassword, newPassword) =>
    api.post('/auth/change-password', { oldPassword, newPassword }),
}

export const masterApi = {
  site: (signal) => api.get('/master/site', { signal }),
  tenants: (signal) => api.get('/master/tenants', { signal }),
  stampCodes: (tenantId, signal) => api.get(`/master/stamp-codes${toQuery({ tenantId })}`, { signal }),
  cardTypes: (signal) => api.get('/master/card-types', { signal }),
}

export const dashboardApi = {
  overview: (params, signal) => api.get(`/dashboard/overview${toQuery(params)}`, { signal }),
  sales: (params, signal) => api.get(`/dashboard/sales${toQuery(params)}`, { signal }),
  transactions: (params, signal) => api.get(`/dashboard/transactions${toQuery(params)}`, { signal }),
  stamps: (params, signal) => api.get(`/dashboard/stamps${toQuery(params)}`, { signal }),
  vehicles: (params, signal) => api.get(`/dashboard/vehicles${toQuery(params)}`, { signal }),
  opportunity: (params, signal) => api.get(`/dashboard/opportunity${toQuery(params)}`, { signal }),
}

export const transactionsApi = {
  list: (params, signal) => api.get(`/transactions${toQuery(params)}`, { signal }),
}

export const reportsApi = {
  list: (signal) => api.get('/reports', { signal }),
  run: (key, params, signal) => api.get(`/reports/${key}${toQuery(params)}`, { signal }),

  /** Streams the server-rendered CSV / Excel file straight to a download. */
  async download(key, params, format = 'csv') {
    const res = await api.get(`/reports/${key}/export${toQuery({ ...params, format })}`, { raw: true })
    const blob = await res.blob()
    const disposition = res.headers.get('Content-Disposition') || ''
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
    const name = match ? decodeURIComponent(match[1]) : `${key}.${format === 'xlsx' ? 'xlsx' : 'csv'}`

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}

export const usersApi = {
  list: (signal) => api.get('/users', { signal }),
  create: (payload) => api.post('/users', payload),
  update: (id, payload) => api.put(`/users/${id}`, payload),
  remove: (id) => api.del(`/users/${id}`),
}

export const doorsApi = {
  list: (signal) => api.get('/door', { signal }),

  /** Reasons the site allows for a manual open (dbo.Pkopengateemergency_cause). */
  causes: (signal) => api.get('/door/causes', { signal }),

  /**
   * Open (or close) a barrier. The body is written to the emergency log server
   * side, so `cause` / `memo` / `carId` are what the report shows later.
   */
  trigger: (doorId, payload = {}) => api.post(`/door/${doorId}/trigger`, {
    action: payload.action ?? 'open',
    cause: payload.cause ?? null,
    memo: payload.memo ?? null,
    carId: payload.carId ?? null,
  }),
}

export const systemApi = {
  serverTime: (signal) => api.get('/server-time', { signal }),
  health: (signal) => api.get('/health', { signal }),
}
