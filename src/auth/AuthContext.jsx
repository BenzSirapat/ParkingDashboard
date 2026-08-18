import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

const STORAGE_KEY = 'singha-parking-auth'

// Demo credentials — replace with a real call to the C# backend later.
const DEMO_USER = { username: 'admin', password: 'parking123' }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  }, [user])

  async function login(username, password) {
    // Simulate a network round-trip to the backend.
    await new Promise((r) => setTimeout(r, 550))
    if (username === DEMO_USER.username && password === DEMO_USER.password) {
      setUser({ username, name: 'Admin', role: 'Operator' })
      return { ok: true }
    }
    return { ok: false, error: 'Invalid username or password.' }
  }

  function logout() {
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
