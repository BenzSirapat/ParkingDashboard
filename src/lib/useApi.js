import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from './api.js'

/**
 * Run an API call and track its lifecycle.
 *
 * `fetcher` receives an AbortSignal, so switching range / filters cancels the
 * request that is no longer wanted instead of letting a slow response
 * overwrite a newer one.
 *
 * @param {(signal: AbortSignal) => Promise<any>} fetcher
 * @param {any[]} deps      re-runs when these change
 * @param {{ enabled?: boolean, initial?: any }} options
 * @returns {{ data, error, loading, reload }}
 */
export function useApi(fetcher, deps = [], { enabled = true, initial = null } = {}) {
  const [state, setState] = useState({ data: initial, error: null, loading: enabled })
  const [nonce, setNonce] = useState(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    if (!enabled) {
      setState({ data: initial, error: null, loading: false })
      return undefined
    }

    const controller = new AbortController()
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))

    fetcherRef.current(controller.signal)
      .then((data) => { if (alive) setState({ data, error: null, loading: false }) })
      .catch((err) => {
        if (!alive || err?.name === 'AbortError') return
        setState({ data: initial, error: err instanceof ApiError ? err : new ApiError(err?.message || 'Request failed'), loading: false })
      })

    return () => { alive = false; controller.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return useMemo(
    () => ({ ...state, reload }),
    [state, reload]
  )
}
