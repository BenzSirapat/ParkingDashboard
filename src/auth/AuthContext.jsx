import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ApiError, authApi, getToken, setToken, setUnauthorizedHandler } from '../lib/api.js'
import { canAdmin, canOperate } from '../lib/roles.js'

const AuthContext = createContext(null)

/**
 * Session backed by the API's JWT.
 *
 * The token is the session: on a reload we ask `/api/auth/me` whether it is
 * still good rather than trusting a cached user object, so a revoked or
 * expired account cannot keep a stale dashboard open.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [restoring, setRestoring] = useState(() => !!getToken())

  const signOut = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  // A 401 from anywhere in the app ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  // Restore the session on first load / hard refresh.
  useEffect(() => {
    if (!getToken()) { setRestoring(false); return undefined }

    const controller = new AbortController()
    let alive = true

    authApi.me(controller.signal)
      .then((profile) => { if (alive) setUser(profile) })
      .catch(() => { if (alive) signOut() })
      .finally(() => { if (alive) setRestoring(false) })

    return () => { alive = false; controller.abort() }
  }, [signOut])

  const login = useCallback(async (username, password) => {
    try {
      const res = await authApi.login(username, password)
      setToken(res.token)
      setUser(res.user)
      return { ok: true, user: res.user }
    } catch (err) {
      setToken(null)
      return { ok: false, error: err instanceof ApiError ? err.message : 'Sign-in failed. Please try again.' }
    }
  }, [])

  /** Re-read the profile — e.g. after an administrator edits the account. */
  const refresh = useCallback(async () => {
    if (!getToken()) return
    try { setUser(await authApi.me()) } catch { signOut() }
  }, [signOut])

  const changePassword = useCallback(async (oldPassword, newPassword) => {
    try {
      await authApi.changePassword(oldPassword, newPassword)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof ApiError ? err.message : 'Could not change the password.' }
    }
  }, [])

  const value = useMemo(() => ({
    user,
    restoring,
    login,
    logout: signOut,
    refresh,
    changePassword,
    role: user?.role ?? null,
    /** May open barriers and issue / send tax invoices. */
    canOperate: canOperate(user?.role),
    /** May manage dashboard user accounts. */
    canAdmin: canAdmin(user?.role),
    /** Tenant accounts only ever see their own transactions — the API enforces it. */
    isTenantScoped: !!user?.isTenantScoped,
  }), [user, restoring, login, signOut, refresh, changePassword])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
