import { inRange } from './dateRange.js'
import { STAMP_CODES, COMPANIES, SITES, companyName, stampInfo } from '../data/mockData.js'

export const hourOf = (iso) => new Date(iso).getHours()
const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0)

/** Filter transactions whose ENTRY time falls within the bounds. */
export function filterByRange(txns, bounds) {
  return txns.filter((t) => inRange(t.entryTime, bounds))
}

/* -------------------------------------------------------------------- Sites */

/** Group transactions by site, in SITES order. Sites with no rows are kept. */
export function groupBySite(txns) {
  const map = new Map(SITES.map((s) => [s.id, []]))
  for (const t of txns) map.get(t.siteId)?.push(t)
  return SITES.map((site) => ({ site, txns: map.get(site.id) }))
}

/**
 * One comparison row per site — the numbers behind the consolidated roll-up.
 * `share*` fields are the site's percentage of the whole selection.
 */
export function siteSummary(txns) {
  const groups = groupBySite(txns).filter((g) => g.txns.length)
  const rows = groups.map(({ site, txns: list }) => {
    const sales = salesStats(list)
    const flow = transactionStats(list)
    const stamps = stampStats(list)
    const opp = opportunityStats(list)
    return {
      _key: site.id,
      siteId: site.id,
      name: site.name,
      short: site.short,
      area: site.area,
      revenue: sales.revenue,
      vat: sales.vat,
      avgTicket: sales.avgTicket,
      transactions: sales.transactions,
      entries: flow.entries,
      exits: flow.exits,
      inside: flow.inside,
      peakHour: flow.peakHour,
      peakAccumulated: occupancy(list).peak,
      stamps: stamps.totalStamps,
      tenantPaid: stamps.tenantPaid,
      visitorPaid: stamps.visitorPaid,
      loss: opp.totalLoss,
      members: list.filter((t) => t.type === 'member').length,
      visitors: list.filter((t) => t.type === 'visitor').length,
    }
  })
  const totalRevenue = sum(rows, (r) => r.revenue) || 1
  const totalEntries = sum(rows, (r) => r.entries) || 1
  return rows
    .map((r) => ({ ...r, shareRevenue: (r.revenue / totalRevenue) * 100, shareEntries: (r.entries / totalEntries) * 100 }))
    .sort((a, b) => b.revenue - a.revenue)
}

/** Grand total across the site rows — the "all sites" line of the comparison. */
export function siteTotals(rows) {
  const total = {
    revenue: sum(rows, (r) => r.revenue),
    vat: sum(rows, (r) => r.vat),
    transactions: sum(rows, (r) => r.transactions),
    entries: sum(rows, (r) => r.entries),
    exits: sum(rows, (r) => r.exits),
    inside: sum(rows, (r) => r.inside),
    peakAccumulated: sum(rows, (r) => r.peakAccumulated),
    stamps: sum(rows, (r) => r.stamps),
    tenantPaid: sum(rows, (r) => r.tenantPaid),
    visitorPaid: sum(rows, (r) => r.visitorPaid),
    loss: sum(rows, (r) => r.loss),
    members: sum(rows, (r) => r.members),
    visitors: sum(rows, (r) => r.visitors),
  }
  total.avgTicket = total.transactions ? total.revenue / total.transactions : 0
  return total
}

/** Daily series per site, for the multi-site comparison chart. */
export function dailyBySite(txns, field = 'revenue') {
  const byDay = new Map()
  for (const t of txns) {
    const day = t.entryTime.slice(0, 10)
    if (!byDay.has(day)) byDay.set(day, { day })
    const row = byDay.get(day)
    const value =
      field === 'revenue' ? (t.status === 'exited' ? t.total : 0)
        : field === 'stamps' ? (t.stampCode ? 1 : 0)
          : 1
    row[t.siteId] = (row[t.siteId] || 0) + value
  }
  return [...byDay.values()].sort((a, b) => (a.day < b.day ? -1 : 1))
}

export function recentTransactions(txns, n = 8) {
  return [...txns].sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime)).slice(0, n)
}

/* ------------------------------------------------------------------ Sales */
export function salesStats(txns) {
  const paid = txns.filter((t) => t.status === 'exited')
  const revenue = sum(paid, (t) => t.total)
  const vat = sum(paid, (t) => t.vat)
  return {
    revenue,
    transactions: paid.length,
    vat,
    avgTicket: paid.length ? revenue / paid.length : 0,
    parkingFees: sum(paid, (t) => t.parkingFee),
    lostCardFees: sum(paid, (t) => t.lostCardFee),
    overnightFees: sum(paid, (t) => t.overnightFee),
  }
}

export function hourlyRevenue(txns) {
  const rows = Array.from({ length: 24 }, (_, h) => ({ hour: h, revenue: 0 }))
  for (const t of txns) if (t.status === 'exited' && t.exitTime) rows[hourOf(t.exitTime)].revenue += t.total
  return rows
}

export function paymentBreakdown(txns) {
  const map = new Map()
  for (const t of txns) {
    if (!t.payment) continue
    if (!map.has(t.payment)) map.set(t.payment, { key: t.payment, count: 0, amount: 0 })
    const row = map.get(t.payment)
    row.count++
    row.amount += t.total
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

/* ------------------------------------------------------ Transaction / flow */
export function transactionStats(txns) {
  const exits = txns.filter((t) => t.status === 'exited')
  const inside = txns.filter((t) => t.status === 'inside')
  // Peak entry hour
  const byHour = Array(24).fill(0)
  for (const t of txns) byHour[hourOf(t.entryTime)]++
  const peak = byHour.indexOf(Math.max(...byHour))
  return {
    entries: txns.length,
    exits: exits.length,
    inside: inside.length,
    peakHour: `${String(peak).padStart(2, '0')}:00`,
    exitedPct: txns.length ? Math.round((exits.length / txns.length) * 100) : 0,
  }
}

export function hourlyTraffic(txns) {
  const rows = Array.from({ length: 24 }, (_, h) => ({ hour: h, entries: 0, exits: 0 }))
  for (const t of txns) {
    rows[hourOf(t.entryTime)].entries++
    if (t.exitTime) rows[hourOf(t.exitTime)].exits++
  }
  return rows
}

export function cardTypes(txns) {
  const member = txns.filter((t) => t.type === 'member').length
  return { member, visitor: txns.length - member }
}

/* ------------------------------------------------------------------ Stamps */
export function stampStats(txns) {
  const stamped = txns.filter((t) => t.stampCode)
  const companies = new Set(stamped.map((t) => t.companyId))
  const tenantPaid = sum(stamped, (t) => t.stampDiscount)
  const visitorPaid = sum(stamped.filter((t) => t.type === 'visitor'), (t) => t.parkingFee)
  const avgDur = stamped.length ? sum(stamped, (t) => t.durationMin) / stamped.length / 60 : 0
  return {
    totalStamps: stamped.length,
    totalCompanies: companies.size,
    totalFees: tenantPaid + visitorPaid,
    avgDuration: avgDur,
    tenantPaid,
    visitorPaid,
  }
}

export function hourlyStampUsage(txns) {
  const rows = Array.from({ length: 24 }, (_, h) => ({ hour: h, stamps: 0 }))
  for (const t of txns) if (t.stampCode) rows[hourOf(t.entryTime)].stamps++
  return rows
}

export function topCompanies(txns) {
  const stamped = txns.filter((t) => t.stampCode)
  const total = stamped.length || 1
  const map = new Map()
  for (const t of stamped) {
    if (!map.has(t.companyId)) map.set(t.companyId, { companyId: t.companyId, name: companyName(t.companyId), stamps: 0, fees: 0 })
    const row = map.get(t.companyId)
    row.stamps++
    row.fees += t.stampDiscount
  }
  return [...map.values()]
    .map((r) => ({ ...r, pct: (r.stamps / total) * 100 }))
    .sort((a, b) => b.stamps - a.stamps)
}

export function stampCodeUsage(txns) {
  const stamped = txns.filter((t) => t.stampCode)
  const total = stamped.length || 1
  const map = new Map()
  for (const t of stamped) {
    if (!map.has(t.stampCode)) map.set(t.stampCode, { code: t.stampCode, count: 0, fees: 0 })
    const row = map.get(t.stampCode)
    row.count++
    row.fees += t.stampDiscount
  }
  return [...map.values()]
    .map((r) => ({ ...r, pct: (r.count / total) * 100, label: stampInfo(r.code)?.label }))
    .sort((a, b) => b.count - a.count)
}

/* ----------------------------------------------------------------- Vehicle */
export function vehicleStats(txns) {
  const out = txns.filter((t) => t.status === 'exited')
  const regularIn = txns.filter((t) => t.vehicleClass === 'regular').length
  const regularOut = out.filter((t) => t.vehicleClass === 'regular').length
  const tempIn = txns.filter((t) => t.vehicleClass === 'temporary').length
  const tempOut = out.filter((t) => t.vehicleClass === 'temporary').length
  const { peak } = occupancy(txns)
  return {
    vehiclesIn: txns.length,
    vehiclesOut: out.length,
    peakAccumulated: peak,
    netFlow: txns.length - out.length,
    regular: { in: regularIn, out: regularOut },
    temporary: { in: tempIn, out: tempOut },
  }
}

export function vehicleTypeSplit(txns) {
  const regular = txns.filter((t) => t.vehicleClass === 'regular').length
  return { regular, temporary: txns.length - regular }
}

/** Occupancy time-series (accumulated vehicles inside) sampled hourly. */
export function occupancy(txns, bounds) {
  const events = []
  for (const t of txns) {
    events.push({ time: new Date(t.entryTime).getTime(), delta: +1 })
    if (t.exitTime) events.push({ time: new Date(t.exitTime).getTime(), delta: -1 })
  }
  events.sort((a, b) => a.time - b.time)

  let acc = 0
  let peak = 0
  const rows = []
  const from = bounds ? bounds.from.getTime() : (events[0]?.time ?? 0)
  const to = bounds ? bounds.to.getTime() : (events[events.length - 1]?.time ?? 0)
  const step = 3600000 // 1 hour
  let ei = 0
  for (let t = from; t <= to; t += step) {
    while (ei < events.length && events[ei].time <= t) {
      acc += events[ei].delta
      if (acc > peak) peak = acc
      ei++
    }
    rows.push({ t, acc: Math.max(0, acc) })
  }
  // account for any peak between samples
  while (ei < events.length) { acc += events[ei].delta; if (acc > peak) peak = acc; ei++ }
  return { rows, peak }
}

/** Per-hour In vs Out with regular/temporary split, for the vehicle page. */
export function inOutByPeriod(txns) {
  const rows = Array.from({ length: 24 }, (_, h) => ({
    hour: h, in: 0, out: 0,
  }))
  for (const t of txns) {
    rows[hourOf(t.entryTime)].in++
    if (t.exitTime) rows[hourOf(t.exitTime)].out++
  }
  return rows
}

export function periodStats(txns) {
  const rows = inOutByPeriod(txns)
  const occ = occupancy(txns)
  return rows.map((r) => ({
    ...r,
    net: r.in - r.out,
    exitRate: r.in ? Math.round((r.out / r.in) * 100) : 0,
  }))
}

/* -------------------------------------------------------- Opportunity loss */
const COMMERCIAL_RATE = 50 // notional full commercial hourly rate (THB)

export function opportunityStats(txns) {
  const stamped = txns.filter((t) => t.stampCode)
  let loss = 0
  let tenantRevenue = 0
  let visitorRevenue = 0
  for (const t of stamped) {
    const full = Math.ceil(t.durationMin / 60) * COMMERCIAL_RATE
    const collected = t.stampDiscount + t.parkingFee
    loss += Math.max(0, full - collected)
    tenantRevenue += t.stampDiscount
    visitorRevenue += t.parkingFee
  }
  return {
    totalLoss: loss,
    totalVehicles: stamped.length,
    avgLoss: stamped.length ? loss / stamped.length : 0,
    tenantRevenue,
    visitorRevenue,
    totalRevenue: tenantRevenue + visitorRevenue + loss,
  }
}

export function opportunityByCompany(txns) {
  const stamped = txns.filter((t) => t.stampCode)
  const totalLoss = opportunityStats(txns).totalLoss || 1
  const map = new Map()
  for (const t of stamped) {
    if (!map.has(t.companyId)) map.set(t.companyId, { companyId: t.companyId, name: companyName(t.companyId), vehicles: 0, tenantPaid: 0, visitorPaid: 0, loss: 0 })
    const row = map.get(t.companyId)
    const full = Math.ceil(t.durationMin / 60) * COMMERCIAL_RATE
    row.vehicles++
    row.tenantPaid += t.stampDiscount
    row.visitorPaid += t.parkingFee
    row.loss += Math.max(0, full - t.stampDiscount - t.parkingFee)
  }
  return [...map.values()]
    .map((r) => ({ ...r, pctOfLoss: (r.loss / totalLoss) * 100 }))
    .sort((a, b) => b.loss - a.loss)
}

export function opportunityByStamp(txns) {
  const stamped = txns.filter((t) => t.stampCode)
  const map = new Map()
  for (const t of stamped) {
    if (!map.has(t.stampCode)) map.set(t.stampCode, { code: t.stampCode, vehicles: 0, loss: 0 })
    const row = map.get(t.stampCode)
    const full = Math.ceil(t.durationMin / 60) * COMMERCIAL_RATE
    row.vehicles++
    row.loss += Math.max(0, full - t.stampDiscount - t.parkingFee)
  }
  return [...map.values()].sort((a, b) => b.loss - a.loss)
}
