import { useMemo, useState } from 'react'
import { Panel, DataTable } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import StatCard from '../components/StatCard.jsx'
import { AsyncState } from '../components/AsyncState.jsx'
import { IconWarning, IconArrowIn, IconArrowOut, IconClock } from '../components/icons.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useSite } from '../lib/siteContext.jsx'
import { useApi } from '../lib/useApi.js'
import { fetchGates, openBarrier, readLog, EMERGENCY_REASONS } from '../lib/gateStore.js'
import { fmtDateTime } from '../lib/format.js'
import { useServerClock, clockTime, SERVER_TZ } from '../lib/serverTime.js'
import './dashboard.css'

/**
 * Emergency barrier control (เปิดไม้กั้นฉุกเฉิน).
 * Opening a lane is deliberately two-step: pick the gate, then confirm with a
 * reason. Every command lands in the audit log underneath.
 */
export default function GateControl() {
  const { t } = useLang()
  const { user, canOperate } = useAuth()
  const { label: siteLabel } = useSite()
  const { server } = useServerClock()

  const gatesQuery = useApi((signal) => fetchGates(signal), [])
  const gates = gatesQuery.data ?? []

  const [log, setLog] = useState(() => readLog())
  const [target, setTarget] = useState(null)
  const [reason, setReason] = useState(EMERGENCY_REASONS[0].value)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(null)
  const [failure, setFailure] = useState(null)

  const todayKey = new Date().toISOString().slice(0, 10)
  const openedToday = useMemo(() => log.filter((e) => e.at.slice(0, 10) === todayKey).length, [log, todayKey])

  const start = (gate) => {
    setTarget(gate)
    setReason(EMERGENCY_REASONS[0].value)
    setNote('')
    setFailure(null)
  }

  const confirm = async () => {
    if (reason === 'other' && !note.trim()) return
    setBusy(true)
    try {
      const entry = await openBarrier(target, { reason, note: note.trim(), user })
      setLog(readLog())
      setTarget(null)
      if (entry.result === 'opened') {
        setFlash(entry)
        setFailure(null)
        setTimeout(() => setFlash(null), 5000)
      } else {
        setFlash(null)
        setFailure(entry)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-toolbar">
        <div>
          <div className="hint-label">{t('Emergency Barrier Control')}</div>
          <div className="chips">
            <span className="chip">{siteLabel}</span>
            <span className="chip">{gates.length} {t('barriers')}</span>
            <span className="chip">{t('Server time')} {clockTime(server, SERVER_TZ)}</span>
          </div>
        </div>
      </div>

      {flash && (
        <div className="banner ok">
          {t('Barrier opened')} — <strong>{flash.gateName}</strong> ({flash.device}) · {t(flash.reasonLabel)}
        </div>
      )}

      {failure && (
        <div className="banner danger">
          {t('Could not open the barrier')} — <strong>{failure.gateName}</strong> ({failure.device}): {failure.error}
        </div>
      )}

      {!canOperate && (
        <div className="banner danger">{t('Your role can view the log but cannot open barriers.')}</div>
      )}

      <div className="stat-grid cols-3">
        <StatCard icon={IconWarning} tone="red" label="Emergency Opens Today" value={openedToday} sub="Recorded in this browser" />
        <StatCard icon={IconClock} tone="amber" label="Logged Commands" value={log.length} sub="Local audit trail" />
        <StatCard icon={IconArrowIn} tone="blue" label="Controllable Barriers" value={gates.length} sub="From the door controller list" />
      </div>

      <Panel title="Barriers" sub="Open a lane immediately — every command is logged">
        <AsyncState query={gatesQuery} height={200} empty="No barriers are configured for this site.">
          {() => (gates.length ? (
            <div className="gate-grid">
              {gates.map((g) => (
                <div className={`gate-card ${g.direction}`} key={g.id}>
                  <div className="gate-head">
                    <span className="gate-dir">
                      {g.direction === 'entry' ? <IconArrowIn width={16} height={16} /> : <IconArrowOut width={16} height={16} />}
                      {t(g.direction === 'entry' ? 'Entry' : 'Exit')}
                    </span>
                    <span className="gate-device">{g.device}</span>
                  </div>
                  <strong className="gate-name">{g.name}</strong>
                  <small className="gate-site">{siteLabel}</small>
                  <button className="btn danger gate-btn" disabled={!canOperate} onClick={() => start(g)}>
                    <IconWarning width={16} height={16} /> {t('Open barrier')}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">{t('No barriers are configured for this site.')}</div>
          ))}
        </AsyncState>
      </Panel>

      <Panel
        title="Emergency Open Log"
        sub="Who opened which barrier, when and why — recorded in this browser"
      >
        <DataTable
          maxHeight={420}
          empty="No emergency opens recorded yet."
          rows={log.map((e) => ({ ...e, _key: e.id }))}
          columns={[
            { key: 'at', label: 'Time', render: (r) => fmtDateTime(r.at) },
            { key: 'gateName', label: 'Barrier', render: (r) => <><strong>{r.gateName}</strong> <small className="muted">{r.device}</small></> },
            { key: 'reasonLabel', label: 'Reason', render: (r) => t(r.reasonLabel) },
            { key: 'note', label: 'Note', render: (r) => r.note || '—' },
            { key: 'by', label: 'Opened by' },
            { key: 'result', label: 'Result', render: (r) => <span className={`pill ${r.result === 'opened' ? 'ok' : 'inside'}`}>{t(r.result === 'opened' ? 'Opened' : 'Failed')}</span> },
          ]}
        />
      </Panel>

      <Modal
        open={!!target}
        title="Confirm emergency open"
        sub="This raises the barrier immediately"
        onClose={() => (busy ? null : setTarget(null))}
        width={520}
        footer={
          <>
            <button className="btn" onClick={() => setTarget(null)} disabled={busy}>{t('Cancel')}</button>
            <button className="btn danger" onClick={confirm} disabled={busy || (reason === 'other' && !note.trim())}>
              {busy ? t('Opening…') : t('Open barrier now')}
            </button>
          </>
        }
      >
        {target && (
          <div className="form-grid">
            <div className="gate-confirm span-2">
              <strong>{target.name}</strong>
              <span className="muted">{siteLabel} · {target.device} · {t(target.direction === 'entry' ? 'Entry' : 'Exit')}</span>
            </div>

            <div className="field span-2">
              <label>{t('Reason')}</label>
              <select className="select" value={reason} onChange={(e) => setReason(e.target.value)}>
                {EMERGENCY_REASONS.map((r) => <option key={r.value} value={r.value}>{t(r.label)}</option>)}
              </select>
            </div>

            <div className="field span-2">
              <label>{t('Note')}{reason === 'other' ? ' *' : ''}</label>
              <input
                className="input"
                placeholder={t('Anything the audit log should record')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="field span-2">
              <label>{t('Authorised by')}</label>
              <input className="input" value={user?.name || user?.username || ''} disabled />
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
