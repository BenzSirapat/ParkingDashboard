import { fmtBaht2, fmtDate, fmtDateTime, fmtNum, fmtPct } from './format.js'

/* Reports come back from the API as raw values plus a column type
   ("text" | "number" | "money" | "date" | "datetime" | "percent"), so both the
   on-screen table and the print view format them the same way here. */

const DASH = '—'

/** Rendered value for the table / print view. */
export function formatCell(value, type) {
  if (value === null || value === undefined || value === '') return DASH

  switch (type) {
    case 'money': return fmtBaht2(Number(value))
    case 'number': return fmtNum(Number(value))
    case 'percent': return fmtPct(Number(value))
    case 'date': return fmtDate(asIso(value), { day: '2-digit', month: 'short', year: 'numeric' })
    case 'datetime': return fmtDateTime(asIso(value))
    default: return String(value)
  }
}

/** Same value as a plain string, for the PDF print window. */
export const plainCell = (value, type) => {
  const out = formatCell(value, type)
  return out === DASH ? '' : out
}

/** The API sends DateOnly as "yyyy-MM-dd"; give it a time so parsing is local. */
function asIso(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value
}
