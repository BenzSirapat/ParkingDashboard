import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Panel, DataTable } from '../components/ui.jsx'
import StatCard from '../components/StatCard.jsx'
import { AsyncState } from '../components/AsyncState.jsx'
import MemberRequestDetail from '../components/MemberRequestDetail.jsx'
import { IconClock, IconUsers, IconWarning, IconSearch, IconDoc } from '../components/icons.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useApi } from '../lib/useApi.js'
import { canApproveAuthority, canApproveBuilding } from '../lib/roles.js'
import { fmtDateTime, fmtNum } from '../lib/format.js'
import {
  memberApprovalApi, fullName, plates, grantedRight, notifyMemberRequestsChanged,
  STAGES, STATUS, STATUS_META, TYPE, TYPE_META,
} from '../lib/memberApproval.js'
import './dashboard.css'
import './memberApproval.css'

const TAB_MINE = 'mine'
const TAB_ALL = 'all'

/**
 * Member request approval — one page per step.
 *   /member-approval/building   CRM (approvelevel 2) — CIR within the contract ends here
 *   /member-approval/authority  High authority (approvelevel 3) — TEMP / Excel / outside the contract
 * Accounts with neither level (e.g. Parking) only view.
 *
 * The list is fetched once for every status and split into tabs client side,
 * so the counts on the tabs always match the table.
 */
export default function MemberApproval({ stage: stageKey }) {
  const { t } = useLang()
  const { approveLevel } = useAuth()
  const stage = STAGES[stageKey]
  const canAct = stageKey === 'authority' ? canApproveAuthority(approveLevel) : canApproveBuilding(approveLevel)

  const [tab, setTab] = useState(TAB_MINE)
  const [query, setQuery] = useState('')
  const [term, setTerm] = useState('')
  const [openId, setOpenId] = useState(null)
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    const id = setTimeout(() => setTerm(query.trim()), 350)
    return () => clearTimeout(id)
  }, [query])

  // Switching between the two pages keeps this component mounted.
  useEffect(() => { setTab(TAB_MINE); setOpenId(null); setFlash(null) }, [stageKey])

  // The top-bar bell links straight to a request: ?open=<requestId>.
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    const open = Number(params.get('open'))
    if (!open) return
    setOpenId(open)
    setParams((p) => { p.delete('open'); return p }, { replace: true })
  }, [params, setParams])

  const list = useApi((signal) => memberApprovalApi.list({ keyword: term }, signal), [term])
  const counts = list.data?.counts ?? {}
  const otherStatus = stage.status === STATUS.PENDING_BUILDING ? STATUS.PENDING_AUTHORITY : STATUS.PENDING_BUILDING

  const rows = useMemo(() => {
    const items = list.data?.items ?? []
    const status = tab === TAB_MINE ? stage.status : tab
    return (tab === TAB_ALL ? items : items.filter((r) => r.status === status))
      .map((r) => ({ ...r, _key: r.requestId }))
  }, [list.data, tab, stage.status])

  const tabs = [
    { key: TAB_MINE, label: 'Waiting for this step', count: counts[stage.status] },
    { key: otherStatus, label: STATUS_META[otherStatus].label, count: counts[otherStatus] },
    { key: STATUS.APPROVED, label: 'Approved', count: counts[STATUS.APPROVED] },
    { key: STATUS.REJECTED, label: 'Rejected', count: counts[STATUS.REJECTED] },
    { key: TAB_ALL, label: 'All', count: list.data?.total },
  ]

  const acted = (action, req) => {
    setOpenId(null)
    setFlash({ action, req })
    setTimeout(() => setFlash(null), 6000)
    list.reload()
    notifyMemberRequestsChanged()
  }

  return (
    <>
      <div className="page-toolbar">
        <div>
          <div className="hint-label">{t(stage.sub)}</div>
          <div className="chips">
            <span className="chip">{t('Tenant submits → CRM → High authority (TEMP / Excel / outside the contract)')}</span>
          </div>
        </div>
      </div>

      {flash && (
        <div className={`banner ${flash.action === 'APPROVE' ? 'ok' : 'danger'}`}>
          {flash.req.requestNo} — {t(flash.action === 'REJECT'
            ? 'Rejected'
            : flash.req.status !== STATUS.APPROVED ? 'Approved — sent to the high authority'
              : flash.req.requestType === TYPE.DELETE ? 'Approved — member retired' : 'Approved — member created')}
          {flash.req.customerCode ? ` · ${t('Customer code')} ${flash.req.customerCode}` : ''}
        </div>
      )}

      {!canAct && (
        <div className="banner warn">
          {t(stageKey === 'authority'
            ? 'Only the high authority (approve level 3) can approve this step — you can view only.'
            : 'Only CRM (approve level 2) can approve this step — you can view only.')}
        </div>
      )}

      <div className="stat-grid">
        <StatCard icon={IconClock} tone="amber" label="Waiting for this step" value={fmtNum(counts[stage.status])} sub={stage.title} />
        <StatCard icon={IconDoc} tone="blue" label={STATUS_META[otherStatus].label} value={fmtNum(counts[otherStatus])} sub="Other step" />
        <StatCard icon={IconUsers} tone="green" label="Approved" value={fmtNum(counts[STATUS.APPROVED])} sub="Applied to the member list" />
        <StatCard icon={IconWarning} tone="red" label="Rejected" value={fmtNum(counts[STATUS.REJECTED])} sub="Returned to the tenant" />
      </div>

      <Panel
        title="Member requests"
        sub="Click a request to review it"
        right={
          <div className="panel-filters">
            <label className="search-box">
              <IconSearch width={15} height={15} />
              <input
                className="input"
                placeholder={t('Request no., name, company or plate')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
        }
      >
        <div className="segmented ma-tabs" role="tablist">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              role="tab"
              aria-selected={tab === tb.key}
              className={tab === tb.key ? 'active' : ''}
              onClick={() => setTab(tb.key)}
            >
              {t(tb.label)}
              <span className={`ma-count ${tb.key === TAB_MINE && tb.count ? 'hot' : ''}`}>{fmtNum(tb.count)}</span>
            </button>
          ))}
        </div>

        <AsyncState query={list} height={260} empty="No member requests.">
          {() => (
            <DataTable
              maxHeight={520}
              empty={tab === TAB_MINE ? 'Nothing is waiting for this step.' : 'No member requests.'}
              rows={rows}
              onRowClick={(r) => setOpenId(r.requestId)}
              columns={[
                { key: 'requestNo', label: 'Request no.', render: (r) => <strong>{r.requestNo}</strong> },
                { key: 'submittedAt', label: 'Submitted', render: (r) => fmtDateTime(r.submittedAt) },
                {
                  key: 'type',
                  label: 'Type',
                  render: (r) => (
                    <>
                      <span className={`pill ${TYPE_META[r.requestType]?.pill ?? ''}`}>{t(TYPE_META[r.requestType]?.label ?? r.requestType)}</span>
                      {r.source === 'EXCEL' && <small className="muted ma-granted">{t('Excel import')}</small>}
                    </>
                  ),
                },
                { key: 'name', label: 'Full name', render: (r) => fullName(r.member) },
                { key: 'companyName', label: 'Company' },
                { key: 'plates', label: 'License Plate', render: (r) => plates(r).join(', ') || '—' },
                {
                  key: 'right',
                  label: 'Parking right',
                  render: (r) => (
                    <>
                      {r.requestedRight && <span className="pill">{r.requestedRight}</span>}
                      {grantedRight(r) && <small className="muted ma-granted">{grantedRight(r)}</small>}
                    </>
                  ),
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (r) => <span className={`pill ${STATUS_META[r.status]?.pill ?? ''}`}>{t(STATUS_META[r.status]?.label ?? r.status)}</span>,
                },
                {
                  key: 'action',
                  label: '',
                  render: (r) => (
                    <button className={`btn tiny ${r.status === stage.status && canAct ? 'primary' : ''}`}>
                      {t(r.status === stage.status && canAct ? 'Review' : 'Detail')}
                    </button>
                  ),
                },
              ]}
            />
          )}
        </AsyncState>
      </Panel>

      <MemberRequestDetail
        requestId={openId}
        stage={stage}
        canAct={canAct}
        onClose={() => setOpenId(null)}
        onActed={acted}
      />
    </>
  )
}
