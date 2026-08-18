import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { companyName } from '../data/mockData.js'
import { resolveRange, DEFAULT_RANGE, rangeLabel } from '../lib/dateRange.js'
import {
  filterByRange, stampStats, hourlyStampUsage, topCompanies, stampCodeUsage,
} from '../lib/selectors.js'
import { fmtBaht, fmtNum, fmtHour, fmtTime, fmtPct } from '../lib/format.js'
import RangePicker from '../components/RangePicker.jsx'
import StatCard from '../components/StatCard.jsx'
import ChartTooltip from '../components/ChartTooltip.jsx'
import { Panel, DataTable, ProgressRow } from '../components/ui.jsx'
import { IconTag, IconBuilding, IconCoins, IconClock } from '../components/icons.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useSite, useSiteTransactions } from '../lib/siteContext.jsx'
import SiteBreakdown from '../components/SiteBreakdown.jsx'
import './dashboard.css'

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)', 'var(--series-7)']

export default function StampDashboard() {
  const { t } = useLang()
  const { label: siteLabel } = useSite()
  const siteTxns = useSiteTransactions()
  const [range, setRange] = useState(DEFAULT_RANGE)
  const bounds = useMemo(() => resolveRange(range), [range])
  const txns = useMemo(() => filterByRange(siteTxns, bounds), [siteTxns, bounds])

  const s = useMemo(() => stampStats(txns), [txns])
  const hourly = useMemo(() => hourlyStampUsage(txns), [txns])
  const companies = useMemo(() => topCompanies(txns), [txns])
  const codes = useMemo(() => stampCodeUsage(txns), [txns])
  const recent = useMemo(
    () => txns.filter((t) => t.stampCode).sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime)).slice(0, 8),
    [txns]
  )

  return (
    <>
      <div className="page-toolbar">
        <div>
          <div className="hint-label">{t('Discount Stamp Usage Overview')}</div>
          <div className="chips"><span className="chip">{t(siteLabel)}</span><span className="chip">{t(rangeLabel(range))}</span></div>
        </div>
        <RangePicker value={range} onChange={setRange} />
      </div>

      <div className="stat-grid">
        <StatCard icon={IconTag} tone="blue" label="Total Stamps" value={fmtNum(s.totalStamps)} sub="Validations issued" />
        <StatCard icon={IconBuilding} tone="violet" label="Total Companies" value={fmtNum(s.totalCompanies)} sub="Active tenants" />
        <StatCard icon={IconCoins} tone="green" valueClass="money-green" label="Total Fees" value={fmtBaht(s.totalFees)} sub="Tenant + visitor" />
        <StatCard icon={IconClock} tone="amber" label="Average Duration" value={`${s.avgDuration.toFixed(1)} hrs`} sub="Per stamped visit" />
      </div>

      <div className="stat-grid cols-3">
        <StatCard icon={IconCoins} tone="green" valueClass="money-green" label="Tenant Paid" value={fmtBaht(s.tenantPaid)} sub="Absorbed by tenants" />
        <StatCard icon={IconCoins} tone="amber" label="Visitor Paid" value={fmtBaht(s.visitorPaid)} sub="Paid by visitors" />
      </div>

      <SiteBreakdown
        txns={txns}
        metrics={['stamps', 'tenantPaid', 'visitorPaid']}
        shareBy="entries"
        chartMetric="stamps"
        sub="Stamp validations of every site in the total"
      />

      <div className="grid-2">
        <Panel title="Hourly Usage" sub="Stamp validations by hour">
          <ResponsiveContainer width="100%" height={330}>
            <BarChart data={hourly} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="hour" tickFormatter={fmtHour} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} interval={1} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip cursor={{ fill: 'var(--surface-inset)' }} content={<ChartTooltip labelFormatter={fmtHour} valueFormatter={(v) => `${fmtNum(v)} stamps`} />} />
              <Bar dataKey="stamps" name="Stamps" fill="var(--series-1)" radius={[5, 5, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Top Companies" sub="Share of stamp usage">
          <div className="prog-list" style={{ maxHeight: 330, overflowY: 'auto' }}>
            {companies.slice(0, 8).map((c, i) => (
              <ProgressRow
                key={c.companyId}
                label={c.name}
                value={`${fmtNum(c.stamps)}`}
                pct={c.pct}
                color={SERIES[i % SERIES.length]}
                sub={<><span>Usage: {fmtPct(c.pct)}</span><span>Fees: {fmtBaht(c.fees)}</span></>}
              />
            ))}
            {!companies.length && <div className="empty">No stamp usage in range.</div>}
          </div>
        </Panel>
      </div>

      <div className="two-col">
        <Panel title="Stamp Codes" sub="Usage by validation code">
          <DataTable
            maxHeight={300}
            columns={[
              { key: 'code', label: 'Code', render: (r, i) => <span className="rank-cell"><span className="rank-dot" style={{ background: SERIES[i % SERIES.length] }} /><strong>{r.code}</strong></span> },
              { key: 'label', label: 'Description', render: (r) => r.label || '—' },
              { key: 'count', label: 'Count', align: 'right', render: (r) => fmtNum(r.count) },
              { key: 'pct', label: 'Share', align: 'right', render: (r) => fmtPct(r.pct) },
            ]}
            rows={codes}
          />
        </Panel>

        <Panel title="Recent Stamps" sub="Latest validations">
          <div className="recent-list">
            {recent.map((t) => (
              <div className="recent-item" key={t.id}>
                <div className="recent-main">
                  <strong>{companyName(t.companyId)}</strong>
                  <small>{t.stampCode} · {t.plate}</small>
                </div>
                <div className="recent-amt">{fmtTime(t.entryTime)}<br /><small className="muted">{fmtBaht(t.stampDiscount)}</small></div>
              </div>
            ))}
            {!recent.length && <div className="empty">No stamps in range.</div>}
          </div>
        </Panel>
      </div>
    </>
  )
}
