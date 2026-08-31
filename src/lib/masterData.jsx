import { createContext, useContext, useMemo } from 'react'
import { masterApi } from './api.js'
import { useApi } from './useApi.js'

/* =========================================================================
   Lookup lists behind the dashboard filters — tenants (with their
   departments) and stamp codes, loaded once per session from
   /api/master/*.

   The API scopes these to the signed-in account: a tenant account only ever
   sees its own tenant and its own stamps, so the option lists here are
   already the ones that account is allowed to filter by.
   ========================================================================= */

const MasterDataContext = createContext(null)

const ALL_OPTION = { value: 'all', label: 'All' }

export function MasterDataProvider({ children }) {
  const tenants = useApi((signal) => masterApi.tenants(signal), [])
  const stampCodes = useApi((signal) => masterApi.stampCodes(undefined, signal), [])

  const value = useMemo(() => {
    const tenantList = tenants.data ?? []
    const stampList = stampCodes.data ?? []

    const tenantNames = new Map(tenantList.map((c) => [c.id, c.name]))
    const stampByCode = new Map(stampList.map((s) => [s.code, s]))

    return {
      tenants: tenantList,
      stampCodes: stampList,
      loading: tenants.loading || stampCodes.loading,
      error: tenants.error || stampCodes.error,

      tenantName: (id) => (id ? tenantNames.get(id) ?? id : '—'),
      stampInfo: (code) => stampByCode.get(code) ?? null,

      tenantOptions: [
        ALL_OPTION,
        ...tenantList.map((c) => ({ value: c.id, label: c.name })),
      ],
      stampOptions: [
        ALL_OPTION,
        ...stampList.map((s) => ({ value: s.code, label: s.label ? `${s.code} · ${s.label}` : s.code })),
      ],
    }
  }, [tenants.data, tenants.loading, tenants.error, stampCodes.data, stampCodes.loading, stampCodes.error])

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>
}

export function useMasterData() {
  const ctx = useContext(MasterDataContext)
  if (!ctx) throw new Error('useMasterData must be used within MasterDataProvider')
  return ctx
}
