import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { resolveRange, DEFAULT_RANGE, rangeLabel } from '../lib/dateRange.js'
import { dashboardApi, rangeParams } from '../lib/api.js'
import { useApi } from '../lib/useApi.js'
import { fmtBaht, fmtNum, fmtHour, fmtTime, fmtPct } from '../lib/format.js'
import RangePicker from '../components/RangePicker.jsx'
import StatCard from '../components/StatCard.jsx'
import ChartTooltip from '../components/ChartTooltip.jsx'
import { Panel, DataTable, ProgressRow } from '../components/ui.jsx'
import { AsyncState, ErrorState, Loading } from '../components/AsyncState.jsx'
import { IconTag, IconBuilding, IconCoins, IconClock } from '../components/icons.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useSite } from '../lib/siteContext.jsx'
import { useMasterData } from '../lib/masterData.jsx'
import './dashboard.css'

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)', 'var(--series-7)']

const EMPTY_STATS = { totalStamps: 0, totalCompanies: 0, totalFees: 0, avgDuration: 0, tenantPaid: 0, visitorPaid: 0 }

export default function StampDashboard() {
  const { t } = useLang()
  const { label: siteLabel } = useSite()
  const { tenantOptions } = useMasterData()

  const [range, setRange] = useState(DEFAULT_RANGE)
  const [tenantId, setTenantId] = useState('all')
  const bounds = useMemo(() => resolveRange(range), [range])
  const params = useMemo(() => rangeParams(bounds, { tenantId }), [bounds, tenantId])

  const query = useApi((signal) => dashboardApi.stamps(params, signal), [JSON.stringify(params)])
  const data = query.data

  const s = data?.stats ?? EMPTY_STATS
  const companies = data?.topCompanies ?? []
  const codes = data?.stampCodes ?? []
  const recent = data?.recent ?? []

  return (
    <>
      <div className="page-toolbar">
        <div>
          <div className="hint-label">{t('Discount Stamp Usage Overview')}</div>
          <div className="chips"><span className="chip">{siteLabel}</span><span className="chip">{t(rangeLabel(range))}</span></div>
        </div>
        <div className="panel-filters">
          <select className="select" value={tenantId} onChange={(e) => setTenantId(e.target.value)} aria-label={t('Tenant')}>
            {tenantOptions.map((o) => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
          </select>
          <RangePicker value={range} onChange={setRange} />
        </div>
      </div>

      {query.error && <ErrorState error={query.error} onRetry={query.reload} />}
      {query.loading && !data && <Loading />}

      <div className="stat-grid">
        <StatCard icon={IconTag} tone="blue" label="Total Stamps" value={fmtNum(s.totalStamps)} sub="Validations issued" />
        <StatCard icon={IconBuilding} tone="violet" label="Total Companies" value={fmtNum(s.totalCompanies)} sub="Active tenants" />
        <StatCard icon={IconCoins} tone="green" valueClass="money-green" label="Total Fees" value={fmtBaht(s.totalFees)} sub="Tenant + visitor" />
        <StatCard icon={IconClock} tone="amber" label="Average Duration" value={`${(s.avgDuration ?? 0).toFixed(1)} hrs`} sub="Per stamped visit" />
      </div>

      <div className="stat-grid cols-3">
        <StatCard icon={IconCoins} tone="green" valueClass="money-green" label="Tenant Paid" value={fmtBaht(s.tenantPaid)} sub="Absorbed by tenants" />
        <StatCard icon={IconCoins} tone="amber" label="Visitor Paid" value={fmtBaht(s.visitorPaid)} sub="Paid by visitors" />
      </div>

      <div className="grid-2">
        <Panel title="Hourly Usage" sub="Stamp validations by hour">
          <AsyncState query={query} height={330}>
            {(d) => (
              <ResponsiveContainer width="100%" height={330}>
                <BarChart data={d.hourlyUsage} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="hour" tickFormatter={fmtHour} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} interval={1} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip cursor={{ fill: 'var(--surface-inset)' }} content={<ChartTooltip labelFormatter={fmtHour} valueFormatter={(v) => `${fmtNum(v)} stamps`} />} />
                  <Bar dataKey="stamps" name="Stamps" fill="var(--series-1)" radius={[5, 5, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </AsyncState>
        </Panel>

        <Panel title="Top Companies" sub="Share of stamp usage">
          <div className="prog-list" style={{ maxHeight: 330, overflowY: 'auto' }}>
            {companies.slice(0, 8).map((c, i) => (
              <ProgressRow
                key={c.companyId}
                label={c.name}
                value={fmtNum(c.stamps)}
                pct={c.pct}
                color={SERIES[i % SERIES.length]}
                sub={<><span>Usage: {fmtPct(c.pct)}</span><span>Fees: {fmtBaht(c.fees)}</span></>}
              />
            ))}
            {!companies.length && !query.loading && <div className="empty">{t('No stamp usage in range.')}</div>}
          </div>
        </Panel>
      </div>

      <div className="two-col">
        <Panel title="Stamp Codes" sub="Usage by validation code">
          <DataTable
            maxHeight={300}
            empty="No stamp usage in range."
            columns={[
              { key: 'code', label: 'Code', render: (r, i) => <span className="rank-cell"><span className="rank-dot" style={{ background: SERIES[i % SERIES.length] }} /><strong>{r.code}</strong></span> },
              { key: 'label', label: 'Description', render: (r) => r.label || '—' },
              { key: 'companyName', label: 'Company', render: (r) => r.companyName || '—' },
              { key: 'count', label: 'Count', align: 'right', render: (r) => fmtNum(r.count) },
              { key: 'pct', label: 'Share', align: 'right', render: (r) => fmtPct(r.pct) },
            ]}
            rows={codes.map((r) => ({ ...r, _key: r.code }))}
          />
        </Panel>

        <Panel title="Recent Stamps" sub="Latest validations">
          <div className="recent-list">
            {recent.map((r) => (
              <div className="recent-item" key={r.id}>
                <div className="recent-main">
                  <strong>{r.companyName || r.companyId || '—'}</strong>
                  <small>{r.stampCode} · {r.plate || '—'}</small>
                </div>
                <div className="recent-amt">{fmtTime(r.entryTime)}<br /><small className="muted">{fmtBaht(r.stampDiscount)}</small></div>
              </div>
            ))}
            {!recent.length && !query.loading && <div className="empty">{t('No stamps in range.')}</div>}
          </div>
        </Panel>
      </div>
    </>
  )
}
