import { createContext, useContext, useMemo } from 'react'
import { masterApi } from './api.js'
import { useApi } from './useApi.js'

/* =========================================================================
   The site this dashboard is pointed at.

   One API deployment serves one site and one database, so there is nothing to
   switch between and no site filter to apply — the name is a label read from
   GET /api/master/site. To look at another site, point VITE_API_BASE at that
   site's API.
   ========================================================================= */

const FALLBACK = { name: 'Singha Parking', short: 'Singha Parking', area: null, environment: null }

const SiteContext = createContext(null)

export function SiteProvider({ children }) {
  // Public endpoint, so the login screen can show the site name too.
  const query = useApi((signal) => masterApi.site(signal), [])

  const value = useMemo(() => {
    const site = query.data ?? FALLBACK
    return {
      site,
      label: site.name,
      short: site.short || site.name,
      area: site.area,
      environment: site.environment,
      loading: query.loading,
    }
  }, [query.data, query.loading])

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export function useSite() {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error('useSite must be used within SiteProvider')
  return ctx
}
