// Time-range presets shared by every dashboard page.
// The mock engine keeps a rolling 12 months, so ranges go all the way up to
// "This year" / "Last 12 months" for year-to-date accumulated views.

export const RANGE_PRESETS = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
  { key: 'mtd', label: 'This month', kind: 'mtd' },
  { key: 'ytd', label: 'This year', kind: 'ytd' },
  { key: '12m', label: 'Last 12 months', days: 365 },
]

/** Presets shown as segments; the rest live in the "more" dropdown. */
export const QUICK_PRESETS = RANGE_PRESETS.filter((p) => ['today', '7d', '30d'].includes(p.key))
export const LONG_PRESETS = RANGE_PRESETS.filter((p) => !['today', '7d', '30d'].includes(p.key))

export const DEFAULT_RANGE = '30d'

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

/**
 * Resolve a range descriptor into { from, to } Date bounds (inclusive).
 * Accepts a preset key, or a custom { from, to } object of yyyy-mm-dd strings.
 */
export function resolveRange(range) {
  if (range && typeof range === 'object' && range.custom) {
    return {
      from: startOfDay(new Date(range.from)),
      to: endOfDay(new Date(range.to)),
    }
  }
  const preset = RANGE_PRESETS.find((p) => p.key === range) || RANGE_PRESETS[2]
  const to = endOfDay(new Date())

  if (preset.kind === 'ytd') {
    const from = startOfDay(new Date())
    from.setMonth(0, 1)
    return { from, to }
  }
  if (preset.kind === 'mtd') {
    const from = startOfDay(new Date())
    from.setDate(1)
    return { from, to }
  }
  const from = startOfDay(new Date())
  from.setDate(from.getDate() - (preset.days - 1))
  return { from, to }
}

/** Build inclusive bounds from two yyyy-mm-dd strings. */
export function customBounds(from, to) {
  return { from: startOfDay(new Date(from)), to: endOfDay(new Date(to)) }
}

export function inRange(iso, bounds) {
  const t = new Date(iso).getTime()
  return t >= bounds.from.getTime() && t <= bounds.to.getTime()
}

export function rangeLabel(range) {
  if (range && typeof range === 'object' && range.custom) {
    return `${range.from} → ${range.to}`
  }
  return RANGE_PRESETS.find((p) => p.key === range)?.label ?? 'Last 30 days'
}

/** How many whole days a resolved range spans — drives hour vs day bucketing. */
export function rangeDays(bounds) {
  return Math.max(1, Math.round((bounds.to.getTime() - bounds.from.getTime()) / 86400000))
}
