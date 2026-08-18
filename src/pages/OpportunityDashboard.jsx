import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { companyShort, companyName } from '../data/mockData.js'
import { resolveRange, DEFAULT_RANGE, rangeLabel } from '../lib/dateRange.js'
import {
  filterByRange, opportunityStats, opportunityByCompany, opportunityByStamp,
} from '../lib/selectors.js'
import { fmtBaht, fmtBaht2, fmtNum, fmtPct } from '../lib/format.js'
import RangePicker from '../components/RangePicker.jsx'
import StatCard from '../components/StatCard.jsx'
import ChartTooltip from '../components/ChartTooltip.jsx'
import { Panel, Donut, DonutLegend, ProgressRow } from '../components/ui.jsx'
import { IconTrendDown, IconChartBar, IconWarning, IconCoins } from '../components/icons.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useSite, useSiteTransactions } from '../lib/siteContext.jsx'
import SiteBreakdown from '../components/SiteBreakdown.jsx'
import './dashboard.css'

const SERIES = ['var(--series-4)', 'var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-5)', 'var(--series-6)', 'var(--series-7)']
const C_TENANT = 'var(--series-2)'
const C_VISITOR = 'var(--series-1)'
const C_LOSS = 'var(--danger)'

export default function OpportunityDashboard() {
  const { t } = useLang()
  const { label: siteLabel } = useSite()
  const siteTxns = useSiteTransactions()
  const [range, setRange] = useState(DEFAULT_RANGE)
  const bounds = useMemo(() => resolveRange(range), [range])
  const txns = useMemo(() => filterByRange(siteTxns, bounds), [siteTxns, bounds])

  const s = useMemo(() => opportunityStats(txns), [txns])
  const byCompany = useMemo(() => opportunityByCompany(txns), [txns])
  const byStamp = useMemo(() => opportunityByStamp(txns), [txns])

  const chartData = byCompany.slice(0, 8).map((c) => ({
    name: companyShort(c.companyId),
    tenant: Math.round(c.tenantPaid),
    visitor: Math.round(c.visitorPaid),
    loss: Math.round(c.loss),
  }))
  const stampSegments = byStamp.slice(0, 6).map((r, i) => ({ label: r.code, value: r.loss, color: SERIES[i % SERIES.length] }))

  return (
    <>
      <div className="page-toolbar">
        <div>
          <div className="hint-label">{t('Overview of Opportunity Loss from Stamp Usage')}</div>
          <div className="chips"><span className="chip">{t(siteLabel)}</span><span className="chip">{t(rangeLabel(range))}</span></div>
        </div>
        <RangePicker value={range} onChange={setRange} />
      </div>

      <div className="stat-grid cols-3">
        <StatCard icon={IconTrendDown} tone="red" valueClass="money-red" label="Total Opportunity Loss" value={fmtBaht(s.totalLoss)} sub="Potential revenue lost" />
        <StatCard icon={IconChartBar} tone="blue" label="Total Vehicles" value={fmtNum(s.totalVehicles)} sub="Stamped visits" />
        <StatCard icon={IconWarning} tone="amber" label="Average Loss / Vehicle" value={fmtBaht2(s.avgLoss)} sub="Per stamped vehicle" />
      </div>

      <div className="stat-grid cols-3">
        <StatCard icon={IconCoins} tone="green" valueClass="money-green" label="Tenant Revenue" value={fmtBaht(s.tenantRevenue)} sub="Paid by tenants" />
        <StatCard icon={IconCoins} tone="amber" label="Visitor Revenue" value={fmtBaht(s.visitorRevenue)} sub="Paid by visitors" />
        <StatCard icon={IconCoins} tone="blue" label="Total Revenue" value={fmtBaht(s.totalRevenue)} sub="Collected + potential" />
      </div>

      <SiteBreakdown
        txns={txns}
        metrics={['loss', 'stamps', 'tenantPaid', 'visitorPaid']}
        shareBy="revenue"
        sub="Opportunity loss of every site in the total"
      />

      <div className="grid-2">
        <Panel
          title="Revenue vs Opportunity Loss"
          sub="By company"
          right={<div className="legend"><span><i style={{ background: C_TENANT }} /> {t('Tenant')}</span><span><i style={{ background: C_VISITOR }} /> {t('Visitor')}</span><span><i style={{ background: C_LOSS }} /> {t('Loss')}</span></div>}
        >
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={chartData} margin={{ top: 6, right: 8, left: -4, bottom: 40 }} barGap={1}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} angle={-30} textAnchor="end" interval={0} height={60} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => fmtNum(v)} />
              <Tooltip cursor={{ fill: 'var(--surface-inset)' }} content={<ChartTooltip valueFormatter={(v) => fmtBaht(v)} />} />
              <Bar dataKey="tenant" name="Tenant Revenue" fill={C_TENANT} radius={[3, 3, 0, 0]} maxBarSize={12} />
              <Bar dataKey="visitor" name="Visitor Revenue" fill={C_VISITOR} radius={[3, 3, 0, 0]} maxBarSize={12} />
              <Bar dataKey="loss" name="Opportunity Loss" fill={C_LOSS} radius={[3, 3, 0, 0]} maxBarSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Distribution by Stamp Code" sub="Loss share per code">
          <div className="donut-block">
            <Donut segments={stampSegments} centerTop={fmtNum(s.totalVehicles)} centerSub={t('vehicles')} />
            <DonutLegend items={byStamp.slice(0, 6).map((r, i) => ({ label: r.code, value: fmtBaht(r.loss), color: SERIES[i % SERIES.length] }))} />
          </div>
        </Panel>
      </div>

      <div className="two-col">
        <Panel title="Top Loss Companies" sub="Ranked by opportunity loss">
          <div className="prog-list" style={{ maxHeight: 360, overflowY: 'auto' }}>
            {byCompany.slice(0, 8).map((c, i) => (
              <ProgressRow
                key={c.companyId}
                label={c.name}
                value={fmtBaht(c.loss)}
                pct={c.pctOfLoss}
                color={SERIES[i % SERIES.length]}
                sub={<><span>{fmtNum(c.vehicles)} vehicles</span><span>{fmtPct(c.pctOfLoss)} of total loss</span></>}
              />
            ))}
            {!byCompany.length && <div className="empty">No stamp usage in range.</div>}
          </div>
        </Panel>

        <Panel title="Recent Losses" sub="Highest per-vehicle loss">
          <div className="recent-list">
            {byStamp.slice(0, 8).map((r) => (
              <div className="recent-item" key={r.code}>
                <div className="recent-main">
                  <strong>{r.code}</strong>
                  <small>{fmtNum(r.vehicles)} vehicles</small>
                </div>
                <div className="recent-amt">{fmtBaht(r.loss)}<br /><small className="muted">{fmtBaht2(r.loss / (r.vehicles || 1))} / veh</small></div>
              </div>
            ))}
            {!byStamp.length && <div className="empty">No losses in range.</div>}
          </div>
        </Panel>
      </div>
    </>
  )
}
