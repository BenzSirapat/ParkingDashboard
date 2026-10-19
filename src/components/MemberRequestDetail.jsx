import { useEffect, useMemo, useState } from 'react'
import Modal, { ConfirmDialog } from './Modal.jsx'
import { DataTable } from './ui.jsx'
import { Loading, ErrorState } from './AsyncState.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useApi } from '../lib/useApi.js'
import { fmtBaht, fmtDate, fmtDateTime } from '../lib/format.js'
import {
  memberApprovalApi, fullName, stepRecord, vehiclesOf, contactTypeLabel,
  BILLING, CONTACT_TYPES, RIGHT_LABEL, STATUS, STATUS_META, STEP, STEP_LABEL,
} from '../lib/memberApproval.js'

const STEPS = [STEP.SUBMIT, STEP.BUILDING, STEP.AUTHORITY]
const fmtDay = (v) => (v ? fmtDate(v, { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
const ymd = (v) => (v ? String(v).slice(0, 10) : '')

/** done / current / error / todo for each of the three steps. */
function stepState(req, step) {
  if (step === STEP.SUBMIT) return req.status === STATUS.CANCELLED ? 'error' : 'done'
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

/** What the building admin granted, read-only. */
function GrantInfo({ req }) {
  const { t } = useLang()
  const g = req.grant
  if (!g) return null
  const billing = BILLING.find((b) => b.value === g.billingType)?.label
  return (
    <section className="ma-section">
      <h4>{t('Granted parking right')}</h4>
      <Info
        items={[
          g.carContactId && ['Car contract', `${g.carContactName} · ${contactTypeLabel(g.carContactType)}`],
          g.carContactId && ['Car monthly fee', fmtBaht(g.carMemberFee)],
          g.motorContactId && ['Motorcycle contract', `${g.motorContactName} · ${contactTypeLabel(g.motorContactType)}`],
          g.motorContactId && ['Motorcycle monthly fee', fmtBaht(g.motorMemberFee)],
          ['Billing', billing ? t(billing) : '—'],
          ['Usage period', `${fmtDay(g.startDate)} – ${fmtDay(g.expireDate)}`],
        ]}
      />
    </section>
  )
}

const contractLabel = (c) =>
  `${c.name || c.id} · ${c.right} · ${c.used}/${c.amount ?? '∞'}${c.pricePerCar ? ` · ${fmtBaht(c.pricePerCar)}` : ''}`

/** The defaults the grant form starts from: the request's own values, else the first matching contract. */
function initialGrant(req, contracts) {
  const pick = (typeCar, id) => {
    const own = contracts.filter((c) => c.typeCar === typeCar)
    return own.find((c) => c.id === id) ?? own.find((c) => c.right === req.requestedRight) ?? own[0] ?? null
  }
  const car = pick('C', req.grant?.carContactId)
  const motor = pick('M', req.grant?.motorContactId)
  return {
    carContactId: car?.id ?? '',
    carContactType: req.grant?.carContactType ?? car?.defaultContactType ?? 0,
    carMemberFee: req.grant?.carMemberFee ?? car?.pricePerCar ?? 0,
    motorContactId: motor?.id ?? '',
    motorContactType: req.grant?.motorContactType ?? motor?.defaultContactType ?? 0,
    motorMemberFee: req.grant?.motorMemberFee ?? motor?.pricePerCar ?? 0,
    billingType: req.grant?.billingType ?? 1,
    startDate: ymd(req.startDate),
    expireDate: ymd(req.expireDate),
  }
}

/**
 * Building admin step: which of the tenant's contracts each vehicle type gets,
 * the contract type, fee, billing and the usage dates.
 */
function GrantForm({ req, grant, onChange }) {
  const { t } = useLang()
  const contracts = useApi((signal) => memberApprovalApi.contracts(req.requestId, signal), [req.requestId])
  const list = contracts.data ?? []

  useEffect(() => {
    if (contracts.data) onChange(initialGrant(req, contracts.data))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contracts.data])

  if (contracts.loading && !contracts.data) return <Loading height={120} />
  if (contracts.error) return <ErrorState error={contracts.error} onRetry={contracts.reload} height={120} />
  if (!grant) return null

  const set = (patch) => onChange({ ...grant, ...patch })
  const pickContract = (key, typeKey, feeKey) => (e) => {
    const c = list.find((x) => x.id === e.target.value)
    set({ [key]: e.target.value, [typeKey]: c?.defaultContactType ?? 0, [feeKey]: c?.pricePerCar ?? 0 })
  }

  const block = (typeCar, label, count, key, typeKey, feeKey) => {
    const options = list.filter((c) => c.typeCar === typeCar)
    const chosen = options.find((c) => c.id === grant[key])
    const over = chosen?.amount != null && chosen.used + count > chosen.amount
    return (
      <>
        <div className="field span-2">
          <label>{t(label)} ({count} {t('vehicle(s)')})</label>
          <select className="select" value={grant[key]} onChange={pickContract(key, typeKey, feeKey)}>
            <option value="">{t(options.length ? '— choose a contract —' : 'This tenant has no contract for this vehicle type')}</option>
            {options.map((c) => <option key={c.id} value={c.id}>{contractLabel(c)}</option>)}
          </select>
          {over && <small className="ma-warn">{t('This contract is already at its vehicle limit.')}</small>}
        </div>
        <div className="field">
          <label>{t('Contract type')}</label>
          <select className="select" value={grant[typeKey]} onChange={(e) => set({ [typeKey]: Number(e.target.value) })}>
            {CONTACT_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{t('Monthly fee')} ({t('THB')})</label>
          <input
            className="input"
            type="number"
            min="0"
            step="1"
            value={grant[feeKey]}
            onChange={(e) => set({ [feeKey]: e.target.value === '' ? '' : Number(e.target.value) })}
          />
        </div>
      </>
    )
  }

  const cars = req.member?.cars?.length || 0
  const motorcycles = req.member?.motorcycles?.length || 0

  return (
    <section className="ma-section">
      <h4>{t('Grant parking right')}</h4>
      <p className="muted ma-hint">
        {t('The tenant asked for')} <strong>{t(RIGHT_LABEL[req.requestedRight] ?? req.requestedRight ?? '—')}</strong>.
        {' '}{t('Choose the contract, type and fee the building charges — the tenant does not see prices.')}
      </p>
      <div className="form-grid">
        {cars > 0 && block('C', 'Car contract', cars, 'carContactId', 'carContactType', 'carMemberFee')}
        {motorcycles > 0 && block('M', 'Motorcycle contract', motorcycles, 'motorContactId', 'motorContactType', 'motorMemberFee')}
        <div className="field span-2">
          <label>{t('Billing')}</label>
          <select className="select" value={grant.billingType} onChange={(e) => set({ billingType: Number(e.target.value) })}>
            {BILLING.map((b) => <option key={b.value} value={b.value}>{t(b.label)}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{t('Start date')}</label>
          <input className="input" type="date" value={grant.startDate} onChange={(e) => set({ startDate: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('Expiry date')}</label>
          <input
            className="input"
            type="date"
            min={grant.startDate}
            value={grant.expireDate}
            onChange={(e) => set({ expireDate: e.target.value })}
          />
        </div>
      </div>
    </section>
  )
}

function grantError(req, grant) {
  if (!grant) return 'Choose the parking right to grant.'
  if (req.member?.cars?.length && !grant.carContactId) return 'Choose the car contract.'
  if (req.member?.motorcycles?.length && !grant.motorContactId) return 'Choose the motorcycle contract.'
  if (!grant.startDate || !grant.expireDate) return 'Choose the usage dates.'
  if (grant.expireDate < grant.startDate) return 'The expiry date cannot be before the start date.'
  return null
}

/** The registration copy the tenant attached, fetched one vehicle at a time. */
function VehicleImage({ requestId, vehicle, onClose }) {
  const { t } = useLang()
  const image = useApi(
    (signal) => memberApprovalApi.vehicleImage(requestId, vehicle.id, signal),
    [requestId, vehicle?.id],
    { enabled: !!vehicle }
  )
  return (
    <Modal open={!!vehicle} title="Registration copy" sub={vehicle?.licensePlate} width={760} onClose={onClose}>
      {image.loading && <Loading height={240} />}
      {image.error && <ErrorState error={image.error} onRetry={image.reload} height={240} />}
      {image.data?.dataUrl && (
        <img className="ma-doc-image" src={image.data.dataUrl} alt={image.data.imageName || t('Registration copy')} />
      )}
    </Modal>
  )
}

/**
 * One member request, with approve / reject when it is waiting on `stage` and
 * the signed-in user may act on that step.
 */
export default function MemberRequestDetail({ requestId, stage, canAct, onClose, onActed }) {
  const { t } = useLang()
  const query = useApi(
    (signal) => memberApprovalApi.get(requestId, signal),
    [requestId],
    { enabled: requestId != null }
  )
  const req = query.data

  const [remark, setRemark] = useState('')
  const [grant, setGrant] = useState(null)
  const [confirm, setConfirm] = useState(null) // 'APPROVE' | 'REJECT'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [imageOf, setImageOf] = useState(null)

  useEffect(() => { setRemark(''); setGrant(null); setConfirm(null); setError(null); setImageOf(null) }, [requestId])

  const actionable = canAct && req?.status === stage.status
  const isFinal = stage.step === STEP.AUTHORITY
  const granting = actionable && !isFinal
  const needsReason = !remark.trim()

  const ask = (action) => {
    if (action === 'REJECT' && needsReason) { setError(t('A reason is required to reject.')); return }
    if (action === 'APPROVE' && granting) {
      const problem = grantError(req, grant)
      if (problem) { setError(t(problem)); return }
    }
    setError(null)
    setConfirm(action)
  }

  const submit = async () => {
    setBusy(true)
    try {
      const updated = confirm === 'APPROVE'
        ? await memberApprovalApi.approve(req.requestId, {
          remark: remark.trim(),
          grant: granting
            ? {
              ...grant,
              carMemberFee: grant.carMemberFee === '' ? null : grant.carMemberFee,
              motorMemberFee: grant.motorMemberFee === '' ? null : grant.motorMemberFee,
              carContactId: grant.carContactId || null,
              motorContactId: grant.motorContactId || null,
            }
            : null,
        })
        : await memberApprovalApi.reject(req.requestId, { remark: remark.trim() })
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
  const vehicles = useMemo(
    () => (req ? vehiclesOf(req).map((v) => ({ ...v, type: v.vehicleType === 'M' ? 'Motorcycle' : 'Car' })) : []),
    [req]
  )

  const statusBanner = () => {
    if (req.status === STATUS.APPROVED) return ['ok', `${t('Approved — customer code')} ${req.customerCode || '—'}`]
    if (req.status === STATUS.REJECTED) return ['danger', t('This request was rejected.')]
    if (req.status === STATUS.CANCELLED) return ['danger', t('The tenant cancelled this request.')]
    if (req.status !== stage.status) return ['warn', `${t(STATUS_META[req.status]?.label)} — ${t('not at this step.')}`]
    return ['warn', t('Your role can view this request but cannot approve this step.')]
  }

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
                const rec = step === STEP.SUBMIT
                  ? { byName: req.submittedBy?.byName || req.submittedBy?.byUsername, at: req.submittedAt }
                  : stepRecord(req, step)
                return (
                  <li key={step} className={stepState(req, step)}>
                    <strong>{t(STEP_LABEL[step])}</strong>
                    {rec && <small>{rec.byName || rec.byUsername}<br />{fmtDateTime(rec.at)}</small>}
                  </li>
                )
              })}
            </ol>

            {error && <div className="banner danger">{error}</div>}

            {!actionable && (() => {
              const [tone, text] = statusBanner()
              return <div className={`banner ${tone}`}>{text}</div>
            })()}

            <section className="ma-section">
              <h4>{t('Customer details')}</h4>
              <Info
                items={[
                  ['Company', req.companyName],
                  ['Department', req.departmentName],
                  ['Full name', fullName(member)],
                  ['Name (EN)', [member.firstNameEN, member.lastNameEN].filter(Boolean).join(' ')],
                  ['Mobile', member.mobile],
                  ['Email', member.email],
                  ['ID card / reference', member.idCard],
                  ['Submitted by', `${req.submittedBy?.byName || req.submittedBy?.byUsername || '—'} · ${fmtDateTime(req.submittedAt)}`],
                  ['Requested right', t(RIGHT_LABEL[req.requestedRight] ?? req.requestedRight)],
                  ['Requested period', `${fmtDay(req.startDate)} – ${fmtDay(req.expireDate)}`],
                  member.remark && ['Note', member.remark, true],
                ]}
              />
            </section>

            {granting
              ? <GrantForm req={req} grant={grant} onChange={setGrant} />
              : <GrantInfo req={req} />}

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
                  { key: 'scrNo', label: 'Card no.', render: (r) => r.scrNo || '—' },
                  {
                    key: 'doc',
                    label: 'Registration copy',
                    render: (r) => (r.hasImage
                      ? <button className="btn tiny" onClick={() => setImageOf(r)}>{t('View')}</button>
                      : '—'),
                  },
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
                      {a.action === 'CANCEL' && ` — ${t('Cancelled by tenant')}`}
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

      <VehicleImage requestId={req?.requestId} vehicle={imageOf} onClose={() => setImageOf(null)} />

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
