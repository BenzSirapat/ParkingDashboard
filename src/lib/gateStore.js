/* =========================================================================
   Barriers / gates and the emergency-open audit trail.

   All of this is now server side:
     GET  /api/door                      dbo.DoorList — the controllable lanes
     GET  /api/door/causes               dbo.Pkopengateemergency_cause — reasons
     POST /api/door/{id}/trigger         sends the relay command over TCP and
                                         writes dbo.Pkopengateemergency
     GET  /api/reports/emergency-barrier  reads that table back

   The log used to live in localStorage because the database had no table for
   it. It does (Pkopengateemergency), so the trail is now shared by every
   operator and survives a cleared browser.
   ========================================================================= */

import { doorsApi, reportsApi, rangeParams } from './api.js'

/**
 * Fallback reasons, used only when the site has not filled in
 * Pkopengateemergency_cause. Free text is always allowed on top.
 */
export const EMERGENCY_REASONS = [
  { value: 'Fire alarm / evacuation', label: 'Fire alarm / evacuation' },
  { value: 'Medical emergency', label: 'Medical emergency' },
  { value: 'Power or equipment failure', label: 'Power or equipment failure' },
  { value: 'Severe congestion', label: 'Severe congestion' },
  { value: 'VIP / authorised convoy', label: 'VIP / authorised convoy' },
]

/** Appended to whatever the site defines, so a reason never has to be forced to fit. */
export const OTHER_REASON = { value: 'other', label: 'Other (describe below)' }

/** Barriers this deployment can control. */
export async function fetchGates(signal) {
  const doors = await doorsApi.list(signal)
  return (doors ?? []).map((d) => ({
    id: d.doorId,
    code: d.doorCode ?? null,
    name: d.doorName || `Door ${d.doorId}`,
    device: d.ipAddress || '—',
    serverId: d.serverId,
    subDoor: d.subDoor,
    active: d.active !== false,
    // DoorList carries no direction column; infer it from the name so the
    // cards still read as entry / exit lanes where the naming allows.
    direction: /out|exit|ออก/i.test(d.doorName || '') ? 'exit' : 'entry',
  }))
}

/**
 * The reasons offered in the confirm dialog: the site's own list when it has
 * one, the built-in list otherwise, always with "Other" last.
 */
export async function fetchCauses(signal) {
  let site = []
  try {
    const rows = await doorsApi.causes(signal)
    site = (rows ?? [])
      .map((c) => (c.description ?? '').trim())
      .filter(Boolean)
      .map((d) => ({ value: d, label: d }))
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    // An older API without /door/causes should not break the control page.
  }
  return [...(site.length ? site : EMERGENCY_REASONS), OTHER_REASON]
}

/**
 * Send the emergency-open command to a barrier.
 *
 * The server writes the audit row either way — a command that never reached
 * the controller is exactly what the log has to show — so a failure here is
 * reported to the operator rather than swallowed.
 *
 * @param {object} gate  the gate being opened
 * @param {object} opts  { cause, note, carId }
 * @returns {{ ok, gate, cause, error, at, logId }}
 */
export async function openBarrier(gate, { cause, note, carId } = {}) {
  const at = new Date().toISOString()
  try {
    const res = await doorsApi.trigger(gate.id, {
      action: 'open',
      cause: cause === 'other' ? (note || 'Other') : cause,
      memo: note || null,
      carId: carId || null,
    })
    return { ok: true, gate, cause, error: null, at: res?.triggeredAt || at, logId: res?.logId ?? null }
  } catch (err) {
    return {
      ok: false,
      gate,
      cause,
      error: err?.message || 'The controller did not answer.',
      at,
      logId: null,
    }
  }
}

/**
 * The emergency-open trail from dbo.Pkopengateemergency, read through the
 * report endpoint so this page, the report table and the CSV export agree.
 *
 * @param {{ from: string|Date, to: string|Date }} bounds
 */
export async function fetchEmergencyLog(bounds, signal) {
  const report = await reportsApi.run('emergency-barrier', rangeParams(bounds), signal)
  return (report?.rows ?? []).map((r) => ({
    id: r.no,
    at: r.openedAt,
    gateId: r.gateId,
    gateName: r.gate,
    by: r.user,
    plate: r.plate,
    cause: r.cause,
    memo: r.memo,
    // The server records the outcome in Memo1; a row that says FAILED is an
    // attempt that never reached the barrier.
    result: /\bFAILED\b/i.test(r.memo || '') ? 'failed' : 'opened',
  }))
}
