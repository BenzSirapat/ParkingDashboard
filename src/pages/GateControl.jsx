import { useMemo, useState } from 'react'
import { Panel, DataTable } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import StatCard from '../components/StatCard.jsx'
import RangePicker from '../components/RangePicker.jsx'
import { AsyncState } from '../components/AsyncState.jsx'
import { IconWarning, IconArrowIn, IconArrowOut, IconClock } from '../components/icons.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useSite } from '../lib/siteContext.jsx'
import { useApi } from '../lib/useApi.js'
import { fetchGates, fetchCauses, fetchEmergencyLog, openBarrier } from '../lib/gateStore.js'
import { resolveRange, DEFAULT_RANGE } from '../lib/dateRange.js'
import { fmtDateTime } from '../lib/format.js'
import { useServerClock, clockTime, SERVER_TZ } from '../lib/serverTime.js'
import './dashboard.css'

/**
 * Emergency barrier control (เปิดไม้กั้นฉุกเฉิน).
 *
 * Opening a lane is deliberately two-step: pick the gate, then confirm with a
 * reason. Both the command and the log are server side — the command writes
 * dbo.Pkopengateemergency and the table below reads it back through the
 * emergency-barrier report, so every operator sees the same trail.
 */
export default function GateControl() {
  const { t } = useLang()
  const { user, canOperate } = useAuth()
  const { label: siteLabel } = useSite()
  const { server } = useServerClock()

  const [range, setRange] = useState(DEFAULT_RANGE)
  const bounds = useMemo(() => resolveRange(range), [range])

  const gatesQuery = useApi((signal) => fetchGates(signal), [])
  const gates = gatesQuery.data ?? []

  const causesQuery = useApi((signal) => fetchCauses(signal), [])
  const causes = causesQuery.data ?? []

  const logQuery = useApi(
    (signal) => fetchEmergencyLog(bounds, signal),
    [bounds.from.getTime(), bounds.to.getTime()]
  )
  const log = logQuery.data ?? []

  const [target, setTarget] = useState(null)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [plate, setPlate] = useState('')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(null)
  const [failure, setFailure] = useState(null)

  const todayKey = new Date().toISOString().slice(0, 10)
  const openedToday = useMemo(
    () => log.filter((e) => (e.at || '').slice(0, 10) === todayKey).length,
    [log, todayKey]
  )
  const failedCount = useMemo(() => log.filter((e) => e.result === 'failed').length, [log])

  const start = (gate) => {
    setTarget(gate)
    setReason(causes[0]?.value ?? 'other')
    setNote('')
    setPlate('')
    setFailure(null)
  }

  const needsNote = reason === 'other' && !note.trim()

  const confirm = async () => {
    if (needsNote) return
    setBusy(true)
    try {
      const result = await openBarrier(target, { cause: reason, note: note.trim(), carId: plate.trim() })
      setTarget(null)
      if (result.ok) {
        setFlash(result)
        setFailure(null)
        setTimeout(() => setFlash(null), 5000)
      } else {
        setFlash(null)
        setFailure(result)
      }
      // The attempt is logged server side whether or not it reached the gate.
      logQuery.reload()
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
        <RangePicker value={range} onChange={setRange} />
      </div>

      {flash && (
        <div className="banner ok">
          {t('Barrier opened')} — <strong>{flash.gate.name}</strong> ({flash.gate.device})
          {flash.logId ? ` · ${t('Log no.')} ${flash.logId}` : ''}
        </div>
      )}

      {failure && (
        <div className="banner danger">
          {t('Could not open the barrier')} — <strong>{failure.gate.name}</strong> ({failure.gate.device}): {failure.error}
        </div>
      )}

      {!canOperate && (
        <div className="banner danger">{t('Your role can view the log but cannot open barriers.')}</div>
      )}

      <div className="stat-grid cols-3">
        <StatCard icon={IconWarning} tone="red" label="Emergency Opens Today" value={openedToday} sub="From the parking database" />
        <StatCard icon={IconClock} tone="amber" label="Logged Commands" value={log.length} sub="In the selected range" />
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
        sub="Who opened which barrier, when and why"
        right={failedCount ? <span className="pill inside">{failedCount} {t('Failed')}</span> : null}
      >
        <AsyncState query={logQuery} height={240} empty="No emergency opens recorded yet.">
          {() => (
            <DataTable
              maxHeight={420}
              empty="No emergency opens recorded yet."
              rows={log.map((e) => ({ ...e, _key: e.id }))}
              columns={[
                { key: 'at', label: 'Time', render: (r) => fmtDateTime(r.at) },
                { key: 'gateName', label: 'Barrier', render: (r) => <><strong>{r.gateName}</strong> <small className="muted">#{r.gateId}</small></> },
                { key: 'cause', label: 'Reason', render: (r) => r.cause || '—' },
                { key: 'plate', label: 'License plate', render: (r) => r.plate || '—' },
                { key: 'by', label: 'Opened by', render: (r) => r.by || '—' },
                { key: 'result', label: 'Result', render: (r) => <span className={`pill ${r.result === 'opened' ? 'ok' : 'inside'}`}>{t(r.result === 'opened' ? 'Opened' : 'Failed')}</span> },
              ]}
            />
          )}
        </AsyncState>
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
            <button className="btn danger" onClick={confirm} disabled={busy || needsNote}>
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
                {causes.map((r) => <option key={r.value} value={r.value}>{t(r.label)}</option>)}
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
              <label>{t('License plate')}</label>
              <input
                className="input"
                placeholder={t('Optional — the vehicle being let through')}
                maxLength={10}
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
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
