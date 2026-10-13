import { useEffect, useState } from 'react'
import Modal, { ConfirmDialog } from './Modal.jsx'
import { DataTable } from './ui.jsx'
import { Loading, ErrorState } from './AsyncState.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useApi } from '../lib/useApi.js'
import { fmtBaht, fmtDate, fmtDateTime } from '../lib/format.js'
import {
  memberApprovalApi, fullName, stepRecord,
  STATUS, STATUS_META, STEP, STEP_LABEL,
} from '../lib/memberApproval.js'

const STEPS = [STEP.SUBMIT, STEP.BUILDING, STEP.AUTHORITY]
const fmtDay = (v) => (v ? fmtDate(v, { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

/** done / current / error / todo for each of the three steps. */
function stepState(req, step) {
  const rec = stepRecord(req, step)
  if (rec?.action === 'REJECT') return 'error'
  if (rec) return 'done'
  if (req.status === STATUS.PENDING_BUILDING && step === STEP.BUILDING) return 'current'
  if (req.status === STATUS.PENDING_AUTHORITY && step === STEP.AUTHORITY) return 'current'
  return 'todo'
}

function Info({ items }) {
  const { t } = useLang()
  return (
    <dl className="ma-info">
      {items.filter(Boolean).map(([label, value, wide]) => (
        <div key={label} className={wide ? 'wide' : undefined}>
          <dt>{t(label)}</dt>
          <dd>{value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

function RightInfo({ title, right }) {
  const { t } = useLang()
  if (!right) return null
  return (
    <section className="ma-section">
      <h4>{t(title)}</h4>
      <Info
        items={[
          ['Member type', <>{right.memberType}{right.isCompanyCar && <span className="pill member" style={{ marginLeft: 8 }}>{t('Company car')}</span>}</>],
          ['Location', right.location],
          ['Contract type', [right.contractType, right.contractSubType].filter(Boolean).join(' / ')],
          ['Monthly fee', `${fmtBaht(right.monthlyFee)} (${right.billingType || '—'})`],
          ['Card group', right.cardGroup],
          ['Parking place / lane', [right.parkingPlace, right.parkingLane].filter(Boolean).join(' / ')],
          ['Start date', fmtDay(right.startDate)],
          ['Expiry date', fmtDay(right.expireDate)],
          ['Status', right.status],
          ['Paid', t(right.paid ? 'Yes' : 'No')],
        ]}
      />
    </section>
  )
}

/**
 * One member request, with approve / reject when it is waiting on `stage` and
 * the signed-in user may act on that step.
 */
export default function MemberRequestDetail({ requestId, stage, canAct, user, onClose, onActed }) {
  const { t } = useLang()
  const query = useApi(
    (signal) => memberApprovalApi.get(requestId, signal),
    [requestId],
    { enabled: requestId != null }
  )
  const req = query.data

  const [remark, setRemark] = useState('')
  const [confirm, setConfirm] = useState(null) // 'APPROVE' | 'REJECT'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { setRemark(''); setConfirm(null); setError(null) }, [requestId])

  const actionable = canAct && req?.status === stage.status
  const isFinal = stage.step === STEP.AUTHORITY
  const needsReason = !remark.trim()

  const ask = (action) => {
    if (action === 'REJECT' && needsReason) { setError(t('A reason is required to reject.')); return }
    setError(null)
    setConfirm(action)
  }

  const submit = async () => {
    setBusy(true)
    try {
      const call = confirm === 'APPROVE' ? memberApprovalApi.approve : memberApprovalApi.reject
      const updated = await call(req.requestId, { remark: remark.trim(), step: stage.step, user })
      setConfirm(null)
      onActed(confirm, updated ?? req)
    } catch (err) {
      setConfirm(null)
      setError(t(err?.message || 'The request failed.'))
    } finally {
      setBusy(false)
    }
  }

  const member = req?.member || {}
  const vehicles = [
    ...(member.cars || []).map((v) => ({ ...v, type: 'Car' })),
    ...(member.motorcycles || []).map((v) => ({ ...v, type: 'Motorcycle' })),
  ]

  return (
    <>
      <Modal
        open={requestId != null}
        title={req ? `${t('Member request')} ${req.requestNo}` : 'Member request'}
        sub={req ? req.companyName : undefined}
        width={880}
        onClose={() => (busy || confirm ? null : onClose())}
        footer={
          <>
            <button className="btn" onClick={onClose} disabled={busy}>{t('Close')}</button>
            {actionable && (
              <>
                <button className="btn danger" onClick={() => ask('REJECT')} disabled={busy}>{t('Reject')}</button>
                <button className="btn primary" onClick={() => ask('APPROVE')} disabled={busy}>
                  {t(isFinal ? 'Final approve' : 'Approve')}
                </button>
              </>
            )}
          </>
        }
      >
        {query.loading && !req && <Loading height={260} />}
        {query.error && <ErrorState error={query.error} onRetry={query.reload} height={260} />}

        {req && (
          <>
            <ol className="ma-steps">
              {STEPS.map((step) => {
                const rec = stepRecord(req, step)
                return (
                  <li key={step} className={stepState(req, step)}>
                    <strong>{t(STEP_LABEL[step])}</strong>
                    {rec && <small>{rec.byName || rec.byUsername}<br />{fmtDateTime(rec.at)}</small>}
                  </li>
                )
              })}
            </ol>

            {error && <div className="banner danger">{error}</div>}

            {!actionable && (
              <div className={`banner ${req.status === STATUS.APPROVED ? 'ok' : req.status === STATUS.REJECTED ? 'danger' : 'warn'}`}>
                {req.status === STATUS.APPROVED
                  ? `${t('Approved — customer code')} ${req.customerCode || '—'}`
                  : req.status === STATUS.REJECTED
                    ? t('This request was rejected.')
                    : req.status !== stage.status
                      ? `${t(STATUS_META[req.status]?.label)} — ${t('not at this step.')}`
                      : t('Your role can view this request but cannot approve this step.')}
              </div>
            )}

            <section className="ma-section">
              <h4>{t('Customer details')}</h4>
              <Info
                items={[
                  ['Company', req.companyName],
                  ['Department', req.departmentName],
                  ['Full name', fullName(member)],
                  ['Name (EN)', [member.firstNameEN, member.lastNameEN].filter(Boolean).join(' ')],
                  ['Mobile', member.mobile],
                  ['ID card / reference', member.idCard],
                  ['Gate group', member.gateGroup],
                  ['Submitted by', `${req.submittedBy?.byName || req.submittedBy?.byUsername || '—'} · ${fmtDateTime(req.submittedAt)}`],
                  member.remark && ['Note', member.remark, true],
                ]}
              />
            </section>

            <RightInfo title="Car membership" right={member.carRight} />
            <RightInfo title="Motorcycle membership" right={member.motorcycleRight} />

            <section className="ma-section">
              <h4>{t('Vehicles')} ({vehicles.length})</h4>
              <DataTable
                rows={vehicles.map((v, i) => ({ ...v, _key: `${v.type}-${v.licensePlate}-${i}` }))}
                columns={[
                  { key: 'type', label: 'Type', render: (r) => t(r.type) },
                  { key: 'licensePlate', label: 'License Plate', render: (r) => <strong>{r.licensePlate}</strong> },
                  { key: 'province', label: 'Province', render: (r) => r.province || '—' },
                  { key: 'brand', label: 'Brand', render: (r) => r.brand || '—' },
                  { key: 'color', label: 'Colour', render: (r) => r.color || '—' },
                  { key: 'remark', label: 'Note', render: (r) => r.remark || '—' },
                ]}
              />
            </section>

            <section className="ma-section">
              <h4>{t('History')}</h4>
              <ul className="ma-history">
                {(req.approvals || []).map((a, i) => (
                  <li key={i} className={a.action.toLowerCase()}>
                    <strong>
                      {t(STEP_LABEL[a.step])}
                      {a.step !== STEP.SUBMIT && ` — ${t(a.action === 'REJECT' ? 'Rejected' : 'Approved')}`}
                    </strong>
                    <small className="muted">{a.byName || a.byUsername} · {fmtDateTime(a.at)}</small>
                    {a.remark && <span>{t('Note')}: {a.remark}</span>}
                  </li>
                ))}
              </ul>
            </section>

            {actionable && (
              <div className="field">
                <label>{t('Review note')} <small className="muted">— {t('required when rejecting')}</small></label>
                <textarea
                  className="input ma-remark"
                  rows={3}
                  maxLength={500}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                />
              </div>
            )}
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm === 'APPROVE' ? 'Confirm approval' : 'Confirm rejection'}
        message={req && (confirm === 'APPROVE'
          ? `${req.requestNo} — ${t(isFinal ? 'Final approval creates the member immediately.' : 'Approve and pass to the top authority.')}`
          : `${req.requestNo} — ${t('The request is closed and returned to the tenant.')}`)}
        confirmLabel={confirm === 'APPROVE' ? (isFinal ? 'Final approve' : 'Approve') : 'Reject'}
        danger={confirm === 'REJECT'}
        busy={busy}
        onConfirm={submit}
        onClose={() => (busy ? null : setConfirm(null))}
      />
    </>
  )
}
