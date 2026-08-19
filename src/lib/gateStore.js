/* =========================================================================
   Barriers / gates and the emergency-open audit trail.

   `openBarrier()` is the seam for the real controller — point it at the C#
   gate service (POST /api/gates/{id}/emergency-open) and the page above it
   keeps working. Every attempt is written to an audit log, because an
   emergency open has to be traceable to the person who ordered it.
   ========================================================================= */

import { SITES } from '../data/mockData.js'

const LOG_KEY = 'singha-parking-gate-log'
const MAX_LOG = 200

/** Gates per site, derived so a new site automatically gets its lanes. */
export const GATES = SITES.flatMap((site, i) => [
  { id: `${site.id}-in1`, siteId: site.id, name: 'Entry Lane 1', direction: 'entry', device: `GATE-${i + 1}01` },
  { id: `${site.id}-in2`, siteId: site.id, name: 'Entry Lane 2', direction: 'entry', device: `GATE-${i + 1}02` },
  { id: `${site.id}-out1`, siteId: site.id, name: 'Exit Lane 1', direction: 'exit', device: `GATE-${i + 1}03` },
  { id: `${site.id}-out2`, siteId: site.id, name: 'Exit Lane 2', direction: 'exit', device: `GATE-${i + 1}04` },
])

export const gatesForSite = (siteId) =>
  (siteId === 'all' ? GATES : GATES.filter((g) => g.siteId === siteId))

/** Reasons an operator can give — free text is always allowed on top. */
export const EMERGENCY_REASONS = [
  { value: 'fire', label: 'Fire alarm / evacuation' },
  { value: 'medical', label: 'Medical emergency' },
  { value: 'power', label: 'Power or equipment failure' },
  { value: 'congestion', label: 'Severe congestion' },
  { value: 'vip', label: 'VIP / authorised convoy' },
  { value: 'other', label: 'Other (describe below)' },
]

export const reasonLabel = (v) => EMERGENCY_REASONS.find((r) => r.value === v)?.label ?? v

export function readLog() {
  try {
    const raw = localStorage.getItem(LOG_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLog(entries) {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(0, MAX_LOG))) } catch { /* ignore */ }
}

/**
 * Send the emergency-open command to a barrier.
 *
 * @param {object} gate      the gate being opened
 * @param {object} opts      { reason, note, holdSeconds, user }
 * @returns audit entry (also appended to the local log)
 */
export async function openBarrier(gate, { reason, note, holdSeconds = 30, user }) {
  const startedAt = new Date().toISOString()
  // --- replace with: await fetch(`/api/gates/${gate.id}/emergency-open`, …) ---
  await new Promise((r) => setTimeout(r, 700))
  const ok = true
  // -------------------------------------------------------------------------

  const entry = {
    id: `g${Date.now().toString(36)}`,
    gateId: gate.id,
    gateName: gate.name,
    device: gate.device,
    siteId: gate.siteId,
    direction: gate.direction,
    reason,
    reasonLabel: reasonLabel(reason),
    note: note || '',
    holdSeconds,
    by: user?.name || user?.username || 'unknown',
    byRole: user?.role || '',
    at: startedAt,
    result: ok ? 'opened' : 'failed',
  }
  writeLog([entry, ...readLog()])
  return entry
}

export function clearLog() {
  writeLog([])
}
