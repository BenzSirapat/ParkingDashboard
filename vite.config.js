import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Normalize a base path: '' | 'dashboard' | '/dashboard' -> '/dashboard/'
function normalizeBase(value) {
  const raw = (value || '').trim()
  if (!raw || raw === '/') return '/'
  if (raw === './') return './' // relative build (no fixed homepage)
  return `/${raw.replace(/^\/+|\/+$/g, '')}/`
}

// Serve "/dashboard" (no trailing slash, with or without ?query / #hash) as
// "/dashboard/" so the app opens either way — Vite answers 404 to the bare base
// otherwise. The URL in the address bar is left as typed; the router accepts both.
function baseWithoutSlash(base) {
  const bare = base.length > 1 && base.startsWith('/') ? base.slice(0, -1) : null
  const rewrite = (req, _res, next) => {
    if (bare && req.url) {
      const [path, query = ''] = req.url.split(/(?=\?)/)
      if (path === bare) req.url = base + query
    }
    next()
  }
  return {
    name: 'base-without-trailing-slash',
    configureServer(server) { server.middlewares.use(rewrite) },
    configurePreviewServer(server) { server.middlewares.use(rewrite) },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // VITE_BASE = homepage path the app is served from (e.g. /dashboard/)
  const env = loadEnv(mode, process.cwd(), '')
  const base = normalizeBase(env.VITE_BASE)

  return {
    base,
    plugins: [baseWithoutSlash(base), react()],
    server: {
      port: 5173,
      open: true,
    },
  }
})
