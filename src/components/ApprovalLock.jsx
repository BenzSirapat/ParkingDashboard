import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { useLang } from '../lib/i18n.jsx'
import { fmtDateTime } from '../lib/format.js'
import { memberApprovalApi } from '../lib/memberApproval.js'

/**
 * Accounting cut-off lock (dbo.PkMemberApproveLock). During the window at the
 * start of each month nobody can approve member requests; tenants keep
 * submitting and their requests wait for the window to end.
 */
export function ApprovalLockBanner({ lock, canEdit, onEdit }) {
  const { t } = useLang()
  if (!lock) return null

  if (!lock.installed) {
    return canEdit
      ? <div className="banner warn">{t('The approval lock table is missing — run the script 2026-11-01_MemberApproveLock.sql. Approvals are not locked.')}</div>
      : null
  }

  const period = `${t('Day')} ${lock.fromDay} ${lock.fromTime} – ${t('day')} ${lock.toDay} ${lock.toTime}`
  const edit = canEdit && (
    <button className="btn tiny" onClick={onEdit} style={{ marginLeft: 8 }}>{t('Lock settings')}</button>
  )

  if (lock.locked) {
    return (
      <div className="banner danger">
        <strong>{t('Approvals are locked for the accounting cut-off')}</strong>
        {lock.note ? ` (${lock.note})` : ''} — {t('approving reopens on')} <strong>{fmtDateTime(lock.unlockAt)}</strong>.
        {' '}{t('Tenants can still submit; their requests wait here.')}
        {edit}
      </div>
    )
  }

  return (
    <div className="chips" style={{ alignItems: 'center' }}>
      <span className="chip">
        {lock.enabled
          ? `${t('Accounting cut-off lock')}: ${period} ${t('every month')} · ${t('next')} ${fmtDateTime(lock.lockStart)}`
          : `${t('Accounting cut-off lock')}: ${t('off')}`}
      </span>
      {edit}
    </div>
  )
}

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

/** Administrators: the lock window, counted from the 1st of each month. */
export function ApprovalLockSettings({ open, lock, onClose, onSaved }) {
  const { t } = useLang()
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !lock) return
    setError(null)
    setForm({
      enabled: lock.enabled,
      fromDay: lock.fromDay || 1,
      fromTime: lock.fromTime || '00:00',
      toDay: lock.toDay || 3,
      toTime: lock.toTime || '23:59',
      note: lock.note || '',
    })
  }, [open, lock])

  if (!form) return null
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const save = async () => {
    if (form.fromDay > form.toDay || (form.fromDay === form.toDay && form.fromTime > form.toTime)) {
      setError(t('The lock must end after it starts.'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const saved = await memberApprovalApi.saveApprovalLock({ ...form, note: form.note.trim() || null })
      onSaved(saved)
    } catch (err) {
      setError(t(err?.message || 'The request failed.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Approval lock settings"
      sub="Accounting cut-off at the start of each month"
      width={560}
      onClose={() => (busy ? null : onClose())}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>{t('Cancel')}</button>
          <button className="btn primary" onClick={save} disabled={busy}>{t('Save')}</button>
        </>
      }
    >
      {error && <div className="banner danger">{error}</div>}
      <p className="muted ma-hint">
        {t('During the lock nobody can approve member requests (CRM and high authority). Tenants can still submit. On approval, a start date that has already passed moves to the approval date.')}
      </p>
      <div className="form-grid">
        <div className="field span-2">
          <label>{t('Lock')}</label>
          <select className="select" value={form.enabled ? '1' : '0'} onChange={(e) => set({ enabled: e.target.value === '1' })}>
            <option value="1">{t('On — lock approvals every month')}</option>
            <option value="0">{t('Off — approve any day')}</option>
          </select>
        </div>
        <div className="field">
          <label>{t('From day')}</label>
          <select className="select" value={form.fromDay} disabled={!form.enabled} onChange={(e) => set({ fromDay: Number(e.target.value) })}>
            {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{t('From time')}</label>
          <input className="input" type="time" value={form.fromTime} disabled={!form.enabled} onChange={(e) => set({ fromTime: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('To day')}</label>
          <select className="select" value={form.toDay} disabled={!form.enabled} onChange={(e) => set({ toDay: Number(e.target.value) })}>
            {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{t('To time (last locked minute)')}</label>
          <input className="input" type="time" value={form.toTime} disabled={!form.enabled} onChange={(e) => set({ toTime: e.target.value })} />
        </div>
        <div className="field span-2">
          <label>{t('Note shown to approvers and tenants')}</label>
          <input className="input" maxLength={200} value={form.note} onChange={(e) => set({ note: e.target.value })} />
        </div>
      </div>
      {lock?.updatedAt && (
        <p className="muted ma-hint">{t('Last changed')}: {lock.updatedBy || '—'} · {fmtDateTime(lock.updatedAt)}</p>
      )}
    </Modal>
  )
}
