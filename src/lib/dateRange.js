// Time-range presets shared by both dashboard pages.

export const RANGE_PRESETS = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
]

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
