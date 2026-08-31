/* =========================================================================
   Barriers / gates and the emergency-open audit trail.

   The barrier list and the open command are real: `GET /api/door` reads
   dbo.DoorList and `POST /api/door/{id}/trigger` sends the relay command to
   the controller over TCP.

   The audit trail is NOT — the parking database has no table for it, so the
   log below is kept per browser in localStorage. An emergency open has to be
   traceable to the person who ordered it, so this is the piece to move server
   side once there is a table to write to.
   ========================================================================= */

import { doorsApi } from './api.js'

const LOG_KEY = 'singha-parking-gate-log'
const MAX_LOG = 200

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

/** Barriers this deployment can control. */
export async function fetchGates(signal) {
  const doors = await doorsApi.list(signal)
  return (doors ?? []).map((d) => ({
    id: d.doorId,
    name: d.doorName || `Door ${d.doorId}`,
    device: d.ip_address ?? d.ipAddress ?? '—',
    serverId: d.serverID ?? d.serverId,
    // DoorList carries no direction column; infer it from the name so the
    // cards still read as entry / exit lanes where the naming allows.
    direction: /out|exit|ออก/i.test(d.doorName || '') ? 'exit' : 'entry',
  }))
}

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
 * Send the emergency-open command to a barrier and record the attempt.
 *
 * @param {object} gate  the gate being opened
 * @param {object} opts  { reason, note, user }
 * @returns audit entry (also appended to the local log)
 */
export async function openBarrier(gate, { reason, note, user }) {
  const startedAt = new Date().toISOString()

  let ok = true
  let error = null
  try {
    await doorsApi.trigger(gate.id)
  } catch (err) {
    ok = false
    error = err?.message || 'The controller did not answer.'
  }

  const entry = {
    id: `g${Date.now().toString(36)}`,
    gateId: gate.id,
    gateName: gate.name,
    device: gate.device,
    direction: gate.direction,
    reason,
    reasonLabel: reasonLabel(reason),
    note: note || '',
    by: user?.name || user?.username || 'unknown',
    byRole: user?.role || '',
    at: startedAt,
    result: ok ? 'opened' : 'failed',
    error,
  }
  writeLog([entry, ...readLog()])
  return entry
}

export function clearLog() {
  writeLog([])
}
