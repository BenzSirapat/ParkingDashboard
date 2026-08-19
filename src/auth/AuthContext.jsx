import { createContext, useContext, useEffect, useState } from 'react'
import { authenticate, findUser, canOperate, canAdmin } from '../lib/usersStore.js'

const AuthContext = createContext(null)

const STORAGE_KEY = 'singha-parking-auth'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const saved = raw ? JSON.parse(raw) : null
      // Sessions from before accounts existed carry no id — make them sign in
      // again so the session is backed by a real user record.
      return saved?.id ? saved : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  }, [user])

  // If an administrator edits or deletes the signed-in account, the session
  // has to follow — a deleted or disabled user is signed straight out.
  const refresh = () => {
    setUser((current) => {
      if (!current) return current
      const fresh = findUser(current.id)
      if (!fresh || !fresh.active) return null
      const { password: _pw, ...safe } = fresh
      return safe
    })
  }

  async function login(username, password) {
    // Simulate a network round-trip to the backend.
    await new Promise((r) => setTimeout(r, 550))
    const res = authenticate(username, password)
    if (res.ok) setUser(res.user)
    return res
  }

  function logout() {
    setUser(null)
  }

  const value = {
    user,
    login,
    logout,
    refresh,
    role: user?.role ?? null,
    /** May open barriers and issue / send tax invoices. */
    canOperate: canOperate(user?.role),
    /** May manage dashboard user accounts. */
    canAdmin: canAdmin(user?.role),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
