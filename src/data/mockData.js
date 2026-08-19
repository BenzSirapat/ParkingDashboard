/* =========================================================================
   Singha Parking — mock data engine.
   One seeded dataset of vehicle transactions powers every dashboard & report.
   Swap this module for real API calls to the C# backend later; the page
   components only consume the exported arrays / helper selectors.
   ========================================================================= */

// --- Seeded PRNG (mulberry32) so charts stay stable across reloads ---
function makeRng(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Brand / group name shown in the chrome.
export const SITE = 'Singha Parking'

/**
 * Parking sites operated by the group. Executives filter one site at a time or
 * consolidate every site into a single roll-up (see `src/lib/siteContext.jsx`).
 * `scale` sizes the daily traffic relative to the flagship site, `memberBias`
 * shifts the member / visitor mix (office towers skew to members).
 */
export const SITES = [
  { id: 's1', name: 'Singha Complex — Asoke', short: 'Singha Complex', area: 'Asoke', scale: 1, memberBias: 0.42, seed: 20260701 },
  { id: 's2', name: 'S Oasis Tower — Vibhavadi', short: 'S Oasis', area: 'Vibhavadi', scale: 0.72, memberBias: 0.55, seed: 20260702 },
  { id: 's3', name: 'Sun Towers — Chatuchak', short: 'Sun Towers', area: 'Chatuchak', scale: 0.55, memberBias: 0.36, seed: 20260703 },
  { id: 's4', name: 'S-Metro — Sukhumvit', short: 'S-Metro', area: 'Sukhumvit', scale: 0.38, memberBias: 0.24, seed: 20260704 },
]

export const siteName = (id) => SITES.find((s) => s.id === id)?.name ?? '—'
export const siteShort = (id) => SITES.find((s) => s.id === id)?.short ?? '—'

// Tenant companies (Thai names, matching a real mixed-use complex).
export const COMPANIES = [
  { id: 'c1', name: 'บริษัท เดอะ คิวบิค ฟิตเนส จำกัด', short: 'Cubic Fitness' },
  { id: 'c2', name: 'Mochit Land Company Limited', short: 'Mochit Land' },
  { id: 'c3', name: 'บริษัท วีจีไอ จำกัด (มหาชน)', short: 'VGI' },
  { id: 'c4', name: 'บริษัท บางกอก สมาร์ทการ์ด ซิสเทม จำกัด', short: 'BSS' },
  { id: 'c5', name: 'Rabbit Rewards', short: 'Rabbit Rewards' },
  { id: 'c6', name: 'บริษัท ยูนิลีเวอร์ ไทย เทรดดิ้ง จำกัด', short: 'Unilever' },
  { id: 'c7', name: 'บริษัท เค เอ็กซ์ จำกัด', short: 'KX' },
  { id: 'c8', name: 'บริษัท ริโซ่เทค โกลบอล จำกัด (มหาชน)', short: 'RisoTech' },
]

// Stamp / validation codes issued by tenants.
export const STAMP_CODES = [
  { code: '000020_0003', companyId: 'c1', label: 'Fitness 3 Hours', rate: 60 },
  { code: '000012_0004_R', companyId: 'c2', label: 'Retail 2 Hours', rate: 40 },
  { code: '000012_0012F', companyId: 'c2', label: 'Retail Flat', rate: 40 },
  { code: '99999_0099', companyId: 'c3', label: 'VVIP', rate: 80 },
  { code: '000012_0004F', companyId: 'c4', label: 'Office 4 Hours', rate: 80 },
  { code: '000012_0002_R', companyId: 'c5', label: 'Rewards 1 Hour', rate: 20 },
  { code: '000001_0002', companyId: 'c6', label: 'Standard 2 Hours', rate: 40 },
  { code: '000030_0005', companyId: 'c7', label: 'Coworking 5 Hours', rate: 100 },
  { code: '000045_0001', companyId: 'c8', label: 'Guest 1 Hour', rate: 20 },
]

export const PAYMENT_METHODS = [
  { key: 'QR Pay', channel: 'online', weight: 0.82 },
  { key: 'Cash', channel: 'cash', weight: 0.11 },
  { key: 'บัตร Rabbit', channel: 'online', weight: 0.04 },
  { key: 'Rabbit Line Pay', channel: 'online', weight: 0.03 },
]

const RATE_PER_HOUR = 25
const DAILY_CAP = 300
const VAT_RATE = 0.07

// Vehicle-entry weighting by hour-of-day (mall traffic curve).
const ENTRY_WEIGHTS = [
  2, 1, 1, 1, 1, 2, 5, 9, 15, 16, 14, 13, 12, 11, 11, 12, 14, 16, 15, 12, 8, 6, 4, 2,
]

const PLATE_LETTERS = 'กขคงจฉชญฐฑฒณดตถทธนบปผฝพภมยรลวศสหอฮ'
const PROVINCES = ['กรุงเทพมหานคร', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'ชลบุรี']

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

function weightedIndex(rng, weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return i
  }
  return weights.length - 1
}

function pickPayment(rng) {
  const r = rng()
  let acc = 0
  for (const p of PAYMENT_METHODS) {
    acc += p.weight
    if (r <= acc) return p
  }
  return PAYMENT_METHODS[0]
}

function makePlate(rng) {
  const l1 = pick(rng, PLATE_LETTERS.split(''))
  const l2 = pick(rng, PLATE_LETTERS.split(''))
  const num = Math.floor(1000 + rng() * 8999)
  return `${Math.floor(1 + rng() * 8)}${l1}${l2} ${num}`
}

function computeParkingFee(durationMin) {
  const hours = Math.ceil(durationMin / 60)
  return Math.min(hours * RATE_PER_HOUR, DAILY_CAP)
}

/** Days of history the mock engine produces — a full rolling year so every
 *  dashboard can be viewed "accumulated for the whole year". */
export const HISTORY_DAYS = 365

const DAY_MS = 86400000

/** Calendar-day key (yyyymmdd) used both for seeding and for ABB numbering. */
function dayKey(d) {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

/** Days since epoch — gives every calendar day a stable ordinal for ids. */
const dayOrdinal = (d) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / DAY_MS)

/**
 * Generate ONE calendar day of transactions for ONE site.
 * The RNG is seeded from (site, calendar day) so a day always produces the
 * exact same rows no matter how wide the requested window is — switching
 * between "Last 7 days" and "This year" never reshuffles the numbers.
 */
function generateDay(site, day, siteIndex) {
  const key = dayKey(day)
  const rng = makeRng(site.seed + key * 7919 + siteIndex * 104729)
  const now = Date.now()
  const dow = day.getDay()
  const base = (dow === 0 || dow === 6 ? 200 : 150) * site.scale // weekends busier
  const count = Math.round(base * (0.85 + rng() * 0.3))
  const idBase = dayOrdinal(day) * 100000 + siteIndex * 20000
  const rows = []

  for (let i = 0; i < count; i++) {
    const isMember = rng() < site.memberBias
    const vehicleClass = isMember
      ? rng() < 0.8 ? 'regular' : 'temporary'
      : rng() < 0.25 ? 'regular' : 'temporary'

    const hour = weightedIndex(rng, ENTRY_WEIGHTS)
    const minute = Math.floor(rng() * 60)
    const entry = new Date(day)
    entry.setHours(hour, minute, Math.floor(rng() * 60), 0)

    // ~4% of vehicles are left in the building overnight (10–20 h stays).
    const staysOvernight = rng() < 0.04
    const durationMin = staysOvernight
      ? Math.round(600 + rng() * 600)
      : Math.round(isMember ? 70 + rng() * 260 : 40 + rng() * 200)
    const exitMs = entry.getTime() + durationMin * 60000

    // A slice of recent vehicles are still inside (no exit yet). Anything that
    // should have left more than a day ago is always closed off, so history
    // never accumulates cars that "never came out".
    const stale = exitMs < now - DAY_MS
    const exited = exitMs < now && (stale || rng() > 0.04)
    const exit = exited ? new Date(exitMs) : null

    // "Overnight" = the stay crosses a calendar-day boundary. Vehicles still
    // inside count once the current day has moved past their entry day.
    const refMs = exited ? exitMs : now
    const overnight = refMs >= startOfDay(entry).getTime() + DAY_MS

    const grossParking = computeParkingFee(durationMin)

    // Stamp validation.
    let companyId = null
    let stampCode = null
    let stampDiscount = 0
    const hasStamp = rng() < (isMember ? 0.3 : 0.66)
    if (hasStamp) {
      const stamp = pick(rng, STAMP_CODES)
      stampCode = stamp.code
      companyId = stamp.companyId
      stampDiscount = Math.min(stamp.rate, grossParking)
    }
    const memberWaiver = isMember && !hasStamp ? grossParking : 0

    const lostCardFee = rng() < 0.015 ? 100 : 0
    const overnightFee = overnight ? 200 : 0

    const parkingFee = Math.max(0, grossParking - stampDiscount - memberWaiver)
    const subtotal = parkingFee + lostCardFee + overnightFee
    const vat = +(subtotal * VAT_RATE).toFixed(2)
    const total = +(subtotal).toFixed(2) // fees shown are VAT-inclusive
    const payment = exited ? pickPayment(rng) : null

    rows.push({
      id: idBase + i,
      siteId: site.id,
      cardNo: String(100000 + Math.floor(rng() * 899999)),
      plate: makePlate(rng),
      province: pick(rng, PROVINCES),
      type: isMember ? 'member' : 'visitor',
      vehicleClass,
      entryTime: entry.toISOString(),
      exitTime: exit ? exit.toISOString() : null,
      status: exited ? 'exited' : 'inside',
      durationMin: exited ? durationMin : Math.round((now - entry.getTime()) / 60000),
      overnight,
      parkingFee,
      lostCardFee,
      overnightFee,
      grossParking,
      stampDiscount,
      vat,
      total,
      payment: payment ? payment.key : null,
      channel: payment ? payment.channel : null,
      companyId,
      stampCode,
      // Abbreviated tax invoice (ใบกำกับภาษีอย่างย่อ) — issued automatically by
      // the pay station on every completed exit.
      abbNo: exited ? `ABB-${key}-${String(i + 1).padStart(4, '0')}` : null,
    })
  }
  return rows
}

/**
 * Generate `days` of transactions across every site, tagged with `siteId`.
 * Consumers filter by site (or keep them all for the consolidated view).
 */
export function generateTransactions(days = HISTORY_DAYS, sites = SITES) {
  const today = startOfDay(new Date())
  const all = []
  for (let s = 0; s < sites.length; s++) {
    for (let d = days - 1; d >= 0; d--) {
      const day = new Date(today)
      day.setDate(day.getDate() - d)
      all.push(...generateDay(sites[s], day, s))
    }
  }
  all.sort((a, b) => (a.entryTime < b.entryTime ? -1 : a.entryTime > b.entryTime ? 1 : 0))
  return all
}

// Generated once per session — a rolling 12 months of history.
export const TRANSACTIONS = generateTransactions()

export const companyName = (id) => COMPANIES.find((c) => c.id === id)?.name ?? '—'
export const companyShort = (id) => COMPANIES.find((c) => c.id === id)?.short ?? '—'
export const stampInfo = (code) => STAMP_CODES.find((s) => s.code === code)
