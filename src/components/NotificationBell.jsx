import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconBell } from './icons.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { canApproveAuthority, canApproveBuilding } from '../lib/roles.js'
import { fmtDateTime, fmtNum } from '../lib/format.js'
import { memberApprovalApi, MEMBER_REQUESTS_CHANGED, STATUS } from '../lib/memberApproval.js'

const POLL_MS = 60_000

const GROUPS = [
  { status: STATUS.PENDING_BUILDING, label: 'Awaiting building admin', path: '/member-approval/building', count: 'pendingOperator', may: canApproveBuilding },
  { status: STATUS.PENDING_AUTHORITY, label: 'Awaiting top authority', path: '/member-approval/authority', count: 'pendingAuthority', may: canApproveAuthority },
]

/**
 * Top-bar bell: member requests waiting for approval, split by whose approval
 * they need. The badge counts only the steps the signed-in role can approve
 * (everything pending for a view-only role).
 */
export default function NotificationBell() {
  const { t } = useLang()
  const { role } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState(null)
  const ref = useRef(null)

  const load = useCallback(async (signal) => {
    try {
      setSummary(await memberApprovalApi.summary(signal))
    } catch {
      // Keep the last good summary; the next poll tries again.
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    const timer = setInterval(() => load(), POLL_MS)
    const refresh = () => load()
    window.addEventListener(MEMBER_REQUESTS_CHANGED, refresh)
    window.addEventListener('focus', refresh)
    return () => {
      controller.abort()
      clearInterval(timer)
      window.removeEventListener(MEMBER_REQUESTS_CHANGED, refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [load])

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return undefined
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const mine = GROUPS.filter((g) => g.may(role))
  const badge = (mine.length ? mine : GROUPS).reduce((n, g) => n + (summary?.[g.count] ?? 0), 0)
  const total = GROUPS.reduce((n, g) => n + (summary?.[g.count] ?? 0), 0)

  const go = (path, id) => {
    setOpen(false)
    navigate(id ? `${path}?open=${id}` : path)
  }

  return (
    <div className="notify" ref={ref}>
      <button
        className={`icon-btn notify-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title={t('Member requests')}
        aria-label={t('Member requests')}
        aria-expanded={open}
      >
        <IconBell />
        {badge > 0 && <span className="notify-badge">{badge > 99 ? '99+' : badge}</span>}
      </button>

      {open && (
        <div className="notify-panel" role="dialog" aria-label={t('Member requests')}>
          <div className="notify-head">
            <strong>{t('Member requests')}</strong>
            <span className="muted">{fmtNum(total)} {t('waiting')}</span>
          </div>

          {GROUPS.map((g) => {
            const items = (summary?.latest ?? []).filter((r) => r.status === g.status)
            const count = summary?.[g.count] ?? 0
            return (
              <section key={g.status} className="notify-group">
                <button className="notify-group-head" onClick={() => go(g.path)}>
                  <span>{t(g.label)}</span>
                  <span className={`notify-count ${count && g.may(role) ? 'hot' : ''}`}>{fmtNum(count)}</span>
                </button>
                {items.length === 0 && <div className="notify-empty muted">{t('Nothing waiting.')}</div>}
                {items.map((r) => (
                  <button key={r.requestId} className="notify-item" onClick={() => go(g.path, r.requestId)}>
                    <span className="notify-item-main">
                      <strong>{r.fullName}</strong>
                      <small className="muted">{r.companyName} · {r.vehicleCount} {t('vehicle(s)')}</small>
                    </span>
                    <small className="muted notify-item-meta">{r.requestNo}<br />{fmtDateTime(r.submittedAt)}</small>
                  </button>
                ))}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
