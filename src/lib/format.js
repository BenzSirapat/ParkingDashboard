const baht = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'THB',
  maximumFractionDigits: 0,
})

const bahtPrecise = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'THB',
  maximumFractionDigits: 2,
})

const num = new Intl.NumberFormat('en-US')

export const fmtBaht = (v) => baht.format(v || 0)
export const fmtBaht2 = (v) => bahtPrecise.format(v || 0)
export const fmtNum = (v) => num.format(v || 0)

export function fmtDate(iso, opts = { day: '2-digit', month: 'short' }) {
  return new Date(iso).toLocaleDateString('en-GB', opts)
}

export function fmtDateTime(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const fmtHour = (h) => `${String(h).padStart(2, '0')}:00`

export function fmtDuration(min) {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h ? `${h}h ${m}m` : `${m}m`
}

export const fmtPct = (v, d = 1) => `${(v || 0).toFixed(d)}%`
