import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { SITES, TRANSACTIONS } from '../data/mockData.js'

const KEY = 'singha-parking-site'

/** Sentinel meaning "consolidate every site into one roll-up". */
export const ALL_SITES = 'all'

const SiteContext = createContext(null)

export function SiteProvider({ children }) {
  const [siteId, setSiteId] = useState(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved === ALL_SITES || SITES.some((s) => s.id === saved)) return saved
    } catch { /* ignore */ }
    return ALL_SITES
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, siteId) } catch { /* ignore */ }
  }, [siteId])

  const value = useMemo(() => {
    const isAll = siteId === ALL_SITES
    const site = isAll ? null : SITES.find((s) => s.id === siteId) ?? null
    return {
      siteId,
      setSiteId,
      sites: SITES,
      isAll,
      site,
      /** Chip label for the current selection (translatable key when consolidated). */
      label: isAll ? 'All Sites' : site?.name ?? '',
      /** Narrow any transaction list to the current selection. */
      filterSite: (txns) => (isAll ? txns : txns.filter((t) => t.siteId === siteId)),
    }
  }, [siteId])

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export function useSite() {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error('useSite must be used within SiteProvider')
  return ctx
}

/** Transactions for the currently selected site (all sites when consolidated). */
export function useSiteTransactions() {
  const { siteId, isAll } = useSite()
  return useMemo(
    () => (isAll ? TRANSACTIONS : TRANSACTIONS.filter((t) => t.siteId === siteId)),
    [siteId, isAll]
  )
}
