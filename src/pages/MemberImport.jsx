import { useMemo, useRef, useState } from 'react'
import { Panel, DataTable } from '../components/ui.jsx'
import StatCard from '../components/StatCard.jsx'
import { ConfirmDialog } from '../components/Modal.jsx'
import { AsyncState } from '../components/AsyncState.jsx'
import { IconDoc, IconUsers, IconWarning, IconClock, IconDownload, IconUpload } from '../components/icons.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useApi } from '../lib/useApi.js'
import { memberImportApi } from '../lib/api.js'
import { readWorkbook, sheetRows } from '../lib/memberImportParser.js'
import { contactTypeLabel, notifyMemberRequestsChanged } from '../lib/memberApproval.js'
import { canApproveBuilding } from '../lib/roles.js'
import { fmtBaht, fmtDateTime, fmtNum } from '../lib/format.js'
import './dashboard.css'
import './memberApproval.css'

const TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/member-import-template.xlsx`

const ACTION = {
  ADD: { label: 'Add', pill: 'ok' },
  UPDATE: { label: 'Change', pill: 'warn' },
  DELETE: { label: 'Cancel', pill: 'danger' },
}

const ROUTE = {
  APPLY: { label: 'Within the right — applied on import', short: 'Within the right', pill: 'ok' },
  AUTHORITY: { label: 'Added right — to the high authority', short: 'Added right', pill: 'visitor' },
  ERROR: { label: 'Cannot import', short: 'Cannot import', pill: 'danger' },
}

const OUTCOME = {
  APPLIED: { label: 'Applied', pill: 'ok' },
  ESCALATED: { label: 'Sent to the high authority', pill: 'visitor' },
  FAILED: { label: 'Failed', pill: 'danger' },
  SKIPPED: { label: 'Skipped', pill: '' },
}

const FILTERS = ['all', 'APPLY', 'AUTHORITY', 'ERROR']

/* The server's row messages carry values, so the fixed i18n map cannot hold them. */
const VEHICLE_TH = { car: 'รถยนต์', motorcycle: 'จยย.' }
const ROW_TH = [
  [/^Member (.+) was not found\.$/, (m) => `ไม่พบสมาชิก ${m[1]}`],
  [/^Member (.+) is no longer active\.$/, (m) => `สมาชิก ${m[1]} ไม่ได้ใช้งานแล้ว`],
  [/^Company "(.*)" was not found — choose the company\.$/, (m) => `ไม่พบบริษัท "${m[1]}" — กรุณาเลือกบริษัท`],
  [/^Member (.+) belongs to another company \((.*)\)\.$/, (m) => `สมาชิก ${m[1]} เป็นของบริษัทอื่น (${m[2]})`],
  [/^Member found by licence plate: (.+)\.$/, (m) => `พบสมาชิกจากทะเบียนรถ: ${m[1]}`],
  [/^Member found by name: (.+)\.$/, (m) => `พบสมาชิกจากชื่อ: ${m[1]}`],
  [/^E-mail "(.*)" is not valid and will be left out\.$/, (m) => `อีเมล "${m[1]}" ไม่ถูกต้อง — ไม่นำไปใช้`],
  [/^Licence plate "(.*)" is longer than 10 characters\.$/, (m) => `ทะเบียน "${m[1]}" ยาวเกิน 10 ตัวอักษร`],
  [/^Unknown (car|motorcycle) member type "(.*)"\.$/, (m) => `ไม่รู้จักประเภทสมาชิก${VEHICLE_TH[m[1]]} "${m[2]}"`],
  [/^No (car|motorcycle) expiry date — set to (.+)\.$/, (m) => `ไม่ระบุวันหมดอายุสัญญา${VEHICLE_TH[m[1]]} — ใช้ ${m[2]}`],
  [/^No (car|motorcycle) contract matches "(.*)" — choose the contract\.$/, (m) => `ไม่พบสัญญา${VEHICLE_TH[m[1]]}ที่ตรงกับ "${m[2]}" — กรุณาเลือกสัญญา`],
  [/^Licence plate (.+) is also on row (.+)\.$/, (m) => `ทะเบียน ${m[1]} ซ้ำกับแถว ${m[2]}`],
  [/^Licence plate (.+) is in pending request (.+)\.$/, (m) => `ทะเบียน ${m[1]} อยู่ในคำขอ ${m[2]} ที่รออนุมัติ`],
  [/^Licence plate (.+) already belongs to member (.+)\.$/, (m) => `ทะเบียน ${m[1]} เป็นของสมาชิก ${m[2]} อยู่แล้ว`],
  [/^License plate (.+) is already registered to a member\.$/, (m) => `ทะเบียน ${m[1]} เป็นของสมาชิกอื่นอยู่แล้ว`],
  [/^Removed from the member: (.+)\.$/, (m) => `ทะเบียนที่จะถูกนำออกจากสมาชิก: ${m[1]}`],
  [/^Member (.+) already has request (.+) waiting for approval\.$/, (m) => `สมาชิก ${m[1]} มีคำขอ ${m[2]} รออนุมัติอยู่`],
  [/^Saving this row failed: (.+)$/, (m) => `บันทึกแถวนี้ไม่สำเร็จ: ${m[1]}`],
]
const rowText = (msg, lang, t) => {
  if (lang !== 'th') return msg
  for (const [re, fn] of ROW_TH) {
    const m = msg.match(re)
    if (m) return fn(m)
  }
  return t(msg)
}

const fmtDay = (v) => {
  if (!v) return '—'
  const [y, m, d] = String(v).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/**
 * CRM Excel import (flow member.jpg).
 *
 *   tenant fills the template (by the 25th) → CRM checks it → uploads it here
 *     ตามสิทธิ์  (free right within the contract), change and cancel → applied at once
 *     เพิ่มสิทธิ์ (rent / Temp / Cir up Fix / over the contract)  → the high authority approves
 *   the tenant gets an e-mail either way.
 *
 * The page reads the sheet, the API interprets every cell (preview writes
 * nothing), CRM fixes what it can here — the company and the contract per row —
 * and imports. Only CRM (approve level 2) can import; others may preview.
 */
export default function MemberImport() {
  const { t, lang } = useLang()
  const { approveLevel } = useAuth()
  const fileRef = useRef(null)

  const [file, setFile] = useState(null)          // { name, sheets }
  const [sheetName, setSheetName] = useState(null)
  const [rows, setRows] = useState([])            // ImportRowDto[] incl. CRM overrides
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)

  const batches = useApi((signal) => memberImportApi.batches(signal), [result?.batchNo])

  const check = async (nextRows, name = sheetName, fileName = file?.name) => {
    setBusy(true)
    setError('')
    try {
      setPreview(await memberImportApi.preview({ fileName, sheetName: name, rows: nextRows }))
    } catch (err) {
      setPreview(null)
      setError(err?.message || 'The request failed.')
    } finally {
      setBusy(false)
    }
  }

  const pickSheet = (sheets, name, fileName) => {
    const sheet = sheets.find((s) => s.name === name)
    try {
      const parsed = sheetRows(sheet)
      setSheetName(name)
      setRows(parsed)
      setPreview(null)
      if (!parsed.length) {
        setError('No member rows on this sheet — rows need a name, member code or licence plate.')
        return
      }
      check(parsed, name, fileName)
    } catch (err) {
      setError(err?.message || 'Could not read the file.')
    }
  }

  const onFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setResult(null)
    setError('')
    try {
      const sheets = readWorkbook(await f.arrayBuffer())
      if (!sheets.length) {
        setFile(null)
        setRows([])
        setPreview(null)
        setError('This file does not look like the member template — no sheet has the เพิ่ม / เปลี่ยนแปลง / ยกเลิก header.')
        return
      }
      setFile({ name: f.name, sheets })
      pickSheet(sheets, sheets[0].name, f.name)
    } catch (err) {
      setError(err?.message || 'Could not read the file.')
    }
  }

  /** CRM's corrections: the company of every row with the same file company, or one row's contract. */
  const override = (match, patch) => {
    const next = rows.map((r) => (match(r) ? { ...r, ...patch } : r))
    setRows(next)
    check(next)
  }

  const byRow = useMemo(() => {
    const map = new Map()
    for (const r of (result?.rows ?? preview?.rows ?? [])) map.set(r.rowNumber, r)
    return map
  }, [preview, result])

  const tableRows = useMemo(() => {
    const list = rows.map((src) => ({ src, res: byRow.get(src.rowNumber) })).filter((x) => x.res)
    return (filter === 'all' ? list : list.filter((x) => x.res.route === filter))
      .map((x) => ({ ...x, _key: x.src.rowNumber }))
  }, [rows, byRow, filter])

  // Companies in the file the server could not match — one choice fixes all their rows.
  const unmatched = useMemo(() => {
    const seen = new Map()
    for (const r of preview?.rows ?? []) {
      if (!r.ternCode && r.fileCompany && !seen.has(r.fileCompany)) seen.set(r.fileCompany, r)
    }
    return [...seen.keys()]
  }, [preview])

  const counts = preview ? { APPLY: preview.apply, AUTHORITY: preview.authority, ERROR: preview.errors } : {}
  const importable = (preview?.apply ?? 0) + (preview?.authority ?? 0)
  const canCommit = !!preview?.canCommit && canApproveBuilding(approveLevel)

  const commit = async () => {
    setConfirm(false)
    setBusy(true)
    setError('')
    try {
      const res = await memberImportApi.commit({ fileName: file?.name, sheetName, rows })
      setResult(res)
      setFilter('all')
      notifyMemberRequestsChanged()
    } catch (err) {
      setError(err?.message || 'The request failed.')
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    setFile(null)
    setRows([])
    setPreview(null)
    setResult(null)
    setError('')
    setFilter('all')
  }

  const contractsOf = (tern, typeCar) => (preview?.contracts?.[tern] ?? []).filter((c) => c.typeCar === typeCar)

  const rightCell = ({ src, res }, kind) => {
    const right = kind === 'C' ? res.car : res.motor
    const plates = kind === 'C' ? res.carPlates : res.motorPlates
    if (!right) {
      return plates?.length && res.action === 'UPDATE'
        ? <small className="muted">{t('Right unchanged')}</small>
        : <span className="muted">—</span>
    }
    const options = contractsOf(res.ternCode, kind)
    const key = kind === 'C' ? 'carContactId' : 'motorContactId'
    return (
      <div className="mi-right">
        <span className={`pill ${right.paid ? 'visitor' : 'ok'}`}>{right.label}</span>
        <small className="muted">
          {contactTypeLabel(right.contactType)} · {right.paid ? fmtBaht(right.fee) : t('Free')} · {fmtDay(right.start)} – {fmtDay(right.expire)}
        </small>
        {!result && res.ternCode && options.length > 0 ? (
          <select
            className="select mi-select"
            value={src[key] || right.contractId || ''}
            disabled={busy}
            onChange={(e) => override((r) => r.rowNumber === src.rowNumber, { [key]: e.target.value || null })}
          >
            {!right.contractId && <option value="">{t('Choose the contract')}</option>}
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.id} · {c.right} · {c.used}/{c.amount ?? '∞'}
              </option>
            ))}
          </select>
        ) : right.contractName ? (
          <small>{right.contractName}{right.amount != null ? ` · ${right.used}/${right.amount}` : ''}</small>
        ) : null}
      </div>
    )
  }

  const shown = result?.rows ?? preview?.rows ?? []
  const hasCar = shown.some((r) => r.car || r.carPlates?.length)
  const hasMotor = shown.some((r) => r.motor || r.motorPlates?.length)

  const columns = [
    { key: 'row', label: 'Row', render: ({ res }) => <strong>{res.rowNumber}</strong> },
    {
      key: 'action',
      label: 'Action',
      render: ({ res }) => res.action
        ? <span className={`pill ${ACTION[res.action].pill}`}>{t(ACTION[res.action].label)}</span>
        : <span className="muted">—</span>,
    },
    {
      key: 'route',
      label: result ? 'Result' : 'Goes to',
      render: ({ res }) => {
        const meta = result && res.outcome ? OUTCOME[res.outcome] : ROUTE[res.route]
        return (
          <div className="mi-route">
            <span className={`pill ${meta?.pill ?? ''}`}>{t(meta?.short ?? meta?.label ?? res.route)}</span>
            {res.requestNo && <small><strong>{res.requestNo}</strong></small>}
            {res.reasons.map((m) => <small key={m} className="muted">{m}</small>)}
            {res.errors.map((m) => <small key={m} className="mi-error">{rowText(m, lang, t)}</small>)}
            {res.warnings.map((m) => <small key={m} className="mi-warn">{rowText(m, lang, t)}</small>)}
          </div>
        )
      },
    },
    {
      key: 'member',
      label: 'Member',
      render: ({ res }) => (
        <>
          <strong>{res.fullName || '—'}</strong>
          {res.customerCode && <small className="muted ma-granted">{t('Customer code')} {res.customerCode}</small>}
          {res.mobile && <small className="muted ma-granted">{res.mobile}</small>}
          <small className="ma-granted">
            {res.companyName || <span className="mi-error">{t('Company not found')}</span>}
            {res.fileCompany && res.fileCompany !== res.companyName && <span className="muted"> · {t('File')}: {res.fileCompany}</span>}
          </small>
        </>
      ),
    },
    {
      key: 'plates',
      label: 'License Plate',
      render: ({ res }) => (
        <>
          {res.carPlates.map((p) => <div key={`c${p}`}>{p}</div>)}
          {res.motorPlates.map((p) => <div key={`m${p}`}>{p} <small className="muted">{t('Motorcycle')}</small></div>)}
          {!res.carPlates.length && !res.motorPlates.length && <span className="muted">—</span>}
        </>
      ),
    },
    // Only the vehicle types the file uses.
    hasCar && { key: 'car', label: 'Car member type', render: (r) => rightCell(r, 'C') },
    hasMotor && { key: 'motor', label: 'Motorcycle member type', render: (r) => rightCell(r, 'M') },
  ]

  return (
    <>
      <div className="page-toolbar">
        <div>
          <div className="hint-label">{t('The tenant fills the CRM template (add / change / cancel) and sends it back by the 25th; CRM checks it and uploads it here.')}</div>
          <div className="chips">
            <span className="chip">{t('Within the right → applied at once')}</span>
            <span className="chip">{t('Added right (rent / Temp / over the contract) → high authority')}</span>
            <span className="chip">{t('The tenant is e-mailed the result')}</span>
          </div>
        </div>
        <div className="row-actions">
          <a className="btn" href={TEMPLATE_URL} download="Template import member.xlsx">
            <IconDownload width={16} height={16} /> {t('Template')}
          </a>
          <button className="btn primary" onClick={() => fileRef.current?.click()} disabled={busy}>
            <IconUpload width={16} height={16} /> {t(file ? 'Choose another file' : 'Choose Excel file')}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={onFile} />
        </div>
      </div>

      {error && <div className="banner danger">{t(error)}</div>}

      {!canApproveBuilding(approveLevel) && (
        <div className="banner warn">{t('Only CRM (approve level 2) can import — you can check a file but not import it.')}</div>
      )}

      {preview?.locked && !result && (
        <div className="banner warn">
          {t('Approvals are locked for the accounting cut-off — import after')} {fmtDateTime(preview.unlockAt)}
        </div>
      )}

      {result && (
        <div className={`banner ${result.failed ? 'warn' : 'ok'}`}>
          {t('Batch')} {result.batchNo} — {t('applied')} {fmtNum(result.applied)} · {t('sent to the high authority')} {fmtNum(result.escalated)} · {t('not imported')} {fmtNum(result.failed)}
          <button className="btn tiny" style={{ marginLeft: 12 }} onClick={reset}>{t('Import another file')}</button>
        </div>
      )}

      {file && (
        <>
          <div className="stat-grid">
            <StatCard icon={IconDoc} tone="blue" label="Rows in the file" value={fmtNum(rows.length)} sub={file.name} />
            <StatCard icon={IconUsers} tone="green" label="Within the right" value={fmtNum(counts.APPLY)} sub="Applied on import" />
            <StatCard icon={IconClock} tone="amber" label="Added right" value={fmtNum(counts.AUTHORITY)} sub="To the high authority" />
            <StatCard icon={IconWarning} tone="red" label="Cannot import" value={fmtNum(counts.ERROR)} sub="Fix in the file or below" />
          </div>

          {unmatched.length > 0 && !result && (
            <Panel title="Companies not found" sub="Choose the company for each code in the file — all its rows follow">
              <div className="form-grid">
                {unmatched.map((fc) => (
                  <div className="field" key={fc}>
                    <label>{fc}</label>
                    <select
                      className="select"
                      value=""
                      disabled={busy}
                      onChange={(e) => override(
                        (r) => [r.companyCode, r.companyName].map((x) => (x || '').trim()).filter(Boolean).join(' ') === fc,
                        { ternCode: e.target.value || null }
                      )}
                    >
                      <option value="">{t('Choose the company')}</option>
                      {(preview?.tenants ?? []).map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel
            title={result ? 'Import result' : 'Check before importing'}
            sub={file.name}
            right={
              <div className="panel-filters">
                {file.sheets.length > 1 && !result && (
                  <select className="select" value={sheetName ?? ''} disabled={busy} onChange={(e) => pickSheet(file.sheets, e.target.value, file.name)}>
                    {file.sheets.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                )}
                {!result && (
                  <button className="btn primary" disabled={busy || !canCommit || !importable || preview?.locked} onClick={() => setConfirm(true)}>
                    {busy ? t('Checking…') : `${t('Import')} ${fmtNum(importable)} ${t('rows')}`}
                  </button>
                )}
              </div>
            }
          >
            {!result && (
              <div className="segmented ma-tabs" role="tablist">
                {FILTERS.map((f) => (
                  <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                    {t(f === 'all' ? 'All' : ROUTE[f].label)}
                    <span className={`ma-count ${f === 'ERROR' && counts.ERROR ? 'hot' : ''}`}>{fmtNum(f === 'all' ? rows.length : counts[f])}</span>
                  </button>
                ))}
              </div>
            )}
            {busy && !preview ? (
              <div className="empty">{t('Checking…')}</div>
            ) : (
              <DataTable maxHeight={620} rows={tableRows} columns={columns.filter(Boolean)} empty="No rows." />
            )}
          </Panel>
        </>
      )}

      {!file && (
        <Panel title="How it works" sub="flow member">
          <ol className="mi-steps">
            <li>{t('CRM enters the tenant\'s parking rights (contract) and sends the Excel template to the tenant.')}</li>
            <li>{t('The tenant ticks เพิ่ม / เปลี่ยนแปลง / ยกเลิก per person and picks the member type, by the 25th of the month.')}</li>
            <li>{t('CRM checks the file (2 working days) and uploads it here. Every row is checked before anything is written.')}</li>
            <li>{t('Free rights within the contract, changes and cancels are applied at once; rentals, Temp and anything over the contract go to the high authority.')}</li>
            <li>{t('The tenant is e-mailed what was applied and, later, the high authority\'s decision.')}</li>
          </ol>
        </Panel>
      )}

      <Panel title="Recent imports" sub="The latest Excel uploads">
        <AsyncState query={batches} height={160} empty="No imports yet.">
          {() => (
            <DataTable
              rows={(batches.data ?? []).map((b) => ({ ...b, _key: b.batchNo }))}
              empty="No imports yet."
              columns={[
                { key: 'uploadedAt', label: 'Uploaded', render: (b) => fmtDateTime(b.uploadedAt) },
                { key: 'batchNo', label: 'Batch', render: (b) => <strong>{b.batchNo}</strong> },
                { key: 'fileName', label: 'File', render: (b) => b.fileName || '—' },
                { key: 'uploadedBy', label: 'By' },
                { key: 'totalRows', label: 'Rows', align: 'right' },
                { key: 'appliedRows', label: 'Applied', align: 'right' },
                {
                  key: 'escalatedRows',
                  label: 'High authority',
                  align: 'right',
                  render: (b) => `${fmtNum(b.escalatedRows)}${b.pendingAuthority ? ` (${t('waiting')} ${fmtNum(b.pendingAuthority)})` : ''}`,
                },
                { key: 'failedRows', label: 'Not imported', align: 'right' },
              ]}
            />
          )}
        </AsyncState>
      </Panel>

      <ConfirmDialog
        open={confirm}
        title="Import members"
        confirmLabel="Import"
        busy={busy}
        message={`${t('Apply')} ${fmtNum(counts.APPLY)} ${t('rows now and send')} ${fmtNum(counts.AUTHORITY)} ${t('rows to the high authority?')}${counts.ERROR ? ` ${fmtNum(counts.ERROR)} ${t('rows with problems are skipped.')}` : ''} ${t('The tenant is e-mailed the result.')}`}
        onConfirm={commit}
        onClose={() => setConfirm(false)}
      />
    </>
  )
}
