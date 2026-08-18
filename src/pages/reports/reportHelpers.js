import { COMPANIES, STAMP_CODES, SITES } from '../../data/mockData.js'
import { customBounds, inRange } from '../../lib/dateRange.js'

export const ALL = 'all'

export const OPT_ALL = { value: ALL, label: 'All' }

export const cardTypeOptions = [OPT_ALL, { value: 'member', label: 'Member' }, { value: 'visitor', label: 'Visitor' }]
export const vehicleClassOptions = [OPT_ALL, { value: 'regular', label: 'Regular' }, { value: 'temporary', label: 'Temporary' }]
export const paymentOptions = [OPT_ALL, { value: 'QR Pay', label: 'QR Pay' }, { value: 'Cash', label: 'Cash' }, { value: 'บัตร Rabbit', label: 'บัตร Rabbit' }, { value: 'Rabbit Line Pay', label: 'Rabbit Line Pay' }]
export const channelOptions = [OPT_ALL, { value: 'online', label: 'Online' }, { value: 'cash', label: 'Cash' }]
export const statusOptions = [OPT_ALL, { value: 'exited', label: 'Exited' }, { value: 'inside', label: 'Inside' }]

/** `all` here means "consolidate every site into one report". */
export const siteOptions = [{ value: ALL, label: 'All Sites' }, ...SITES.map((s) => ({ value: s.id, label: s.name }))]

export const companyOptions = [OPT_ALL, ...COMPANIES.map((c) => ({ value: c.id, label: c.name }))]
export const stampOptions = [OPT_ALL, ...STAMP_CODES.map((s) => ({ value: s.code, label: `${s.code} · ${s.label}` }))]

/** Apply the common report filters to a transaction list. */
export function applyFilters(txns, values, { dateField = 'entryTime' } = {}) {
  let bounds = null
  if (values.range) bounds = customBounds(values.range.from, values.range.to)

  return txns.filter((t) => {
    const iso = t[dateField] || t.entryTime
    if (bounds && !inRange(iso, bounds)) return false
    if (values.site && values.site !== ALL && t.siteId !== values.site) return false
    if (values.cardType && values.cardType !== ALL && t.type !== values.cardType) return false
    if (values.vehicleClass && values.vehicleClass !== ALL && t.vehicleClass !== values.vehicleClass) return false
    if (values.payment && values.payment !== ALL && t.payment !== values.payment) return false
    if (values.channel && values.channel !== ALL && t.channel !== values.channel) return false
    if (values.status && values.status !== ALL && t.status !== values.status) return false
    if (values.company && values.company !== ALL && t.companyId !== values.company) return false
    if (values.stamp && values.stamp !== ALL && t.stampCode !== values.stamp) return false
    if (values.plate && !t.plate.toLowerCase().includes(values.plate.toLowerCase())) return false
    if (values.cardNo && !t.cardNo.includes(values.cardNo)) return false
    return true
  })
}
