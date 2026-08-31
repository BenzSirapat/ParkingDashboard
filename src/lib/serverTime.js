import { useEffect, useState } from 'react'
import { systemApi } from './api.js'

/* =========================================================================
   Server clock.

   The dashboard shows two clocks side by side: the parking SERVER's time (the
   clock that stamps every entry / exit record) and the current time of the
   machine the browser runs on. When an operator's PC drifts, the gap is
   visible instead of silently corrupting shift hand-overs.
   ========================================================================= */

/** Timezone the parking server runs in. */
export const SERVER_TZ = 'Asia/Bangkok'

/**
 * Ask the API for its clock. Returns the offset (server − browser) in ms and
 * the round-trip latency, both measured the NTP way so network delay does not
 * get counted as drift.
 */
export async function fetchServerTime(signal) {
  const t0 = Date.now()
  const res = await systemApi.serverTime(signal)
  const t1 = Date.now()

  const latency = t1 - t0
  const serverNow = new Date(res.utc ?? res.now).getTime()

  return { offset: serverNow - (t0 + latency / 2), latency, syncedAt: t1, timeZone: res.timeZone }
}

/**
 * Live clock hook. Ticks every second and re-syncs with the server every
 * 5 minutes.
 *
 * @returns { server, local, offset, latency, syncedAt, synced }
 */
export function useServerClock({ resyncMs = 300000 } = {}) {
  const [sync, setSync] = useState({ offset: 0, latency: 0, syncedAt: null, synced: false })
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let alive = true
    const controller = new AbortController()

    const run = async () => {
      try {
        const s = await fetchServerTime(controller.signal)
        if (alive) setSync({ ...s, synced: true })
      } catch (err) {
        if (alive && err?.name !== 'AbortError') setSync((s) => ({ ...s, synced: false }))
      }
    }

    run()
    const id = setInterval(run, resyncMs)
    return () => { alive = false; clearInterval(id); controller.abort() }
  }, [resyncMs])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  return {
    local: new Date(now),
    server: new Date(now + sync.offset),
    offset: sync.offset,
    latency: sync.latency,
    syncedAt: sync.syncedAt,
    synced: sync.synced,
  }
}

/** hh:mm:ss in a given timezone. */
export function clockTime(date, tz) {
  return date.toLocaleTimeString('en-GB', { hour12: false, timeZone: tz })
}

/** Short date line under the clock. */
export function clockDate(date, tz) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: tz })
}

/** Human drift label, e.g. "+2.4s" / "in sync". */
export function driftLabel(offsetMs) {
  const abs = Math.abs(offsetMs)
  if (abs < 1000) return 'in sync'
  const sign = offsetMs > 0 ? '+' : '−'
  if (abs < 60000) return `${sign}${(abs / 1000).toFixed(1)}s`
  return `${sign}${Math.round(abs / 60000)}m`
}
