import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Normalize a base path: '' | 'dashboard' | '/dashboard' -> '/dashboard/'
function normalizeBase(value) {
  const raw = (value || '').trim()
  if (!raw || raw === '/') return '/'
  if (raw === './') return './' // relative build (no fixed homepage)
  return `/${raw.replace(/^\/+|\/+$/g, '')}/`
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // VITE_BASE = homepage path the app is served from (e.g. /dashboard/)
  const env = loadEnv(mode, process.cwd(), '')
  const base = normalizeBase(env.VITE_BASE)

  return {
    base,
    plugins: [react()],
    server: {
      port: 5173,
      open: true,
    },
  }
})
