/* =========================================================================
   Dashboard user accounts.

   Kept in localStorage so the demo survives a reload. Every function here is
   the seam for the real backend: swap the bodies for calls to the C# user
   service and the User Management page keeps working unchanged.
   ========================================================================= */

const KEY = 'singha-parking-users'

export const ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'operator', label: 'Operator' },
  { value: 'viewer', label: 'Viewer' },
]

export const roleLabel = (v) => ROLES.find((r) => r.value === v)?.label ?? v

/** Only these roles may open a barrier or issue / send tax invoices. */
export const canOperate = (role) => role === 'admin' || role === 'manager' || role === 'operator'
export const canAdmin = (role) => role === 'admin'

const SEED = [
  { id: 'u1', username: 'admin', password: 'parking123', name: 'Admin', role: 'admin', email: 'admin@singhaparking.co.th', phone: '02-000-0001', siteId: 'all', active: true },
  { id: 'u2', username: 'manager', password: 'parking123', name: 'Somchai P.', role: 'manager', email: 'somchai@singhaparking.co.th', phone: '02-000-0002', siteId: 's1', active: true },
  { id: 'u3', username: 'operator', password: 'parking123', name: 'Nattaya S.', role: 'operator', email: 'nattaya@singhaparking.co.th', phone: '02-000-0003', siteId: 's2', active: true },
  { id: 'u4', username: 'viewer', password: 'parking123', name: 'Auditor', role: 'viewer', email: 'audit@singhaparking.co.th', phone: '02-000-0004', siteId: 'all', active: false },
]

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch { /* fall through to seed */ }
  write(SEED)
  return [...SEED]
}

function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* ignore */ }
  return list
}

export function listUsers() {
  return read().map((u) => ({ ...u }))
}

export function findUser(id) {
  return read().find((u) => u.id === id) ?? null
}

/** Usernames are the login key, so they have to stay unique. */
function usernameTaken(list, username, exceptId) {
  const key = username.trim().toLowerCase()
  return list.some((u) => u.id !== exceptId && u.username.toLowerCase() === key)
}

export function createUser(data) {
  const list = read()
  if (!data.username?.trim()) return { ok: false, error: 'Username is required.' }
  if (!data.name?.trim()) return { ok: false, error: 'Full name is required.' }
  if (!data.password) return { ok: false, error: 'Password is required.' }
  if (usernameTaken(list, data.username)) return { ok: false, error: 'That username already exists.' }

  const user = {
    id: `u${Date.now().toString(36)}`,
    username: data.username.trim(),
    password: data.password,
    name: data.name.trim(),
    role: data.role || 'viewer',
    email: data.email?.trim() || '',
    phone: data.phone?.trim() || '',
    siteId: data.siteId || 'all',
    active: data.active !== false,
    createdAt: new Date().toISOString(),
  }
  write([...list, user])
  return { ok: true, user }
}

/** Patch a user. An empty `password` leaves the current one alone. */
export function updateUser(id, patch) {
  const list = read()
  const idx = list.findIndex((u) => u.id === id)
  if (idx < 0) return { ok: false, error: 'User not found.' }
  if (patch.username !== undefined) {
    if (!patch.username.trim()) return { ok: false, error: 'Username is required.' }
    if (usernameTaken(list, patch.username, id)) return { ok: false, error: 'That username already exists.' }
  }
  if (patch.name !== undefined && !patch.name.trim()) return { ok: false, error: 'Full name is required.' }

  const next = { ...list[idx], ...patch, updatedAt: new Date().toISOString() }
  if (!patch.password) next.password = list[idx].password
  list[idx] = next
  write(list)
  return { ok: true, user: next }
}

/**
 * Delete a user. The last active administrator can never be removed —
 * otherwise nobody could get back into the dashboard.
 */
export function deleteUser(id) {
  const list = read()
  const target = list.find((u) => u.id === id)
  if (!target) return { ok: false, error: 'User not found.' }
  const otherAdmins = list.filter((u) => u.id !== id && u.role === 'admin' && u.active)
  if (target.role === 'admin' && !otherAdmins.length) {
    return { ok: false, error: 'Cannot delete the last administrator.' }
  }
  write(list.filter((u) => u.id !== id))
  return { ok: true }
}

/** Credential check used by the login screen. */
export function authenticate(username, password) {
  const user = read().find(
    (u) => u.username.toLowerCase() === String(username).trim().toLowerCase() && u.password === password
  )
  if (!user) return { ok: false, error: 'Invalid username or password.' }
  if (!user.active) return { ok: false, error: 'This account is disabled.' }
  const { password: _pw, ...safe } = user
  return { ok: true, user: safe }
}
