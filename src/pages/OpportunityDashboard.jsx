import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { resolveRange, DEFAULT_RANGE, rangeLabel } from '../lib/dateRange.js'
import { dashboardApi, rangeParams } from '../lib/api.js'
import { useApi } from '../lib/useApi.js'
import { fmtBaht, fmtBaht2, fmtNum, fmtPct } from '../lib/format.js'
import RangePicker from '../components/RangePicker.jsx'
import StatCard from '../components/StatCard.jsx'
import ChartTooltip from '../components/ChartTooltip.jsx'
import { Panel, Donut, DonutLegend, ProgressRow, DataTable } from '../components/ui.jsx'
import { AsyncState, ErrorState, Loading } from '../components/AsyncState.jsx'
import { IconTrendDown, IconChartBar, IconWarning, IconCoins } from '../components/icons.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useSite } from '../lib/siteContext.jsx'
import { useMasterData } from '../lib/masterData.jsx'
import './dashboard.css'

const SERIES = ['var(--series-4)', 'var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-5)', 'var(--series-6)', 'var(--series-7)']
const C_TENANT = 'var(--series-2)'
const C_VISITOR = 'var(--series-1)'
const C_LOSS = 'var(--danger)'
const C_VEHICLES = 'var(--series-6)'

const EMPTY_STATS = { totalLoss: 0, totalVehicles: 0, avgLoss: 0, tenantRevenue: 0, visitorRevenue: 0, totalRevenue: 0 }

export default function OpportunityDashboard() {
  const { t } = useLang()
  const { label: siteLabel } = useSite()
  const { tenantOptions } = useMasterData()

  const [range, setRange] = useState(DEFAULT_RANGE)
  const [tenantId, setTenantId] = useState('all')
  const bounds = useMemo(() => resolveRange(range), [range])
  const params = useMemo(() => rangeParams(bounds, { tenantId }), [bounds, tenantId])

  const query = useApi((signal) => dashboardApi.opportunity(params, signal), [JSON.stringify(params)])
  const data = query.data

  const s = data?.stats ?? EMPTY_STATS
  const byCompany = data?.byCompany ?? []
  const byStamp = data?.byStamp ?? []

  const chartData = byCompany.slice(0, 8).map((c) => ({
    name: c.name,
    tenant: Math.round(c.tenantPaid),
    visitor: Math.round(c.visitorPaid),
    loss: Math.round(c.loss),
    vehicles: c.vehicles,
  }))
  const totalVehicles = byCompany.reduce((a, c) => a + c.vehicles, 0)
  const stampSegments = byStamp.slice(0, 6).map((r, i) => ({ label: r.code, value: r.loss, color: SERIES[i % SERIES.length] }))

  return (
    <>
      <div className="page-toolbar">
        <div>
          <div className="hint-label">{t('Overview of Opportunity Loss from Stamp Usage')}</div>
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

      <div className="grid-2">
        <Panel
          title="Revenue vs Opportunity Loss"
          sub="By company"
          right={<div className="legend"><span><i style={{ background: C_TENANT }} /> {t('Tenant')}</span><span><i style={{ background: C_VISITOR }} /> {t('Visitor')}</span><span><i style={{ background: C_LOSS }} /> {t('Loss')}</span><span><i style={{ background: C_VEHICLES }} /> {t('Vehicles')}</span></div>}
        >
          <AsyncState query={query} height={340} empty="No stamp usage in range.">
            {() => (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={chartData} margin={{ top: 6, right: 8, left: -4, bottom: 40 }} barGap={1}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} angle={-30} textAnchor="end" interval={0} height={60} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => fmtNum(v)} />
                  <YAxis yAxisId="veh" orientation="right" tick={{ fontSize: 11, fill: C_VEHICLES }} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => fmtNum(v)} />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-inset)' }}
                    content={<ChartTooltip valueFormatter={(v, key) => (key === 'vehicles' ? `${fmtNum(v)} ${t('vehicles')}` : fmtBaht(v))} />}
                  />
                  <Bar dataKey="tenant" name="Tenant Revenue" fill={C_TENANT} radius={[3, 3, 0, 0]} maxBarSize={12} />
                  <Bar dataKey="visitor" name="Visitor Revenue" fill={C_VISITOR} radius={[3, 3, 0, 0]} maxBarSize={12} />
                  <Bar dataKey="loss" name="Opportunity Loss" fill={C_LOSS} radius={[3, 3, 0, 0]} maxBarSize={12} />
                  <Bar yAxisId="veh" dataKey="vehicles" name="Vehicles" fill={C_VEHICLES} radius={[3, 3, 0, 0]} maxBarSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </AsyncState>
        </Panel>

        <Panel title="Distribution by Stamp Code" sub="Loss share per code">
          <div className="donut-block">
            <Donut segments={stampSegments} centerTop={fmtNum(s.totalVehicles)} centerSub={t('vehicles')} />
            <DonutLegend items={byStamp.slice(0, 6).map((r, i) => ({ label: `${r.code} · ${fmtNum(r.vehicles)} ${t('vehicles')}`, value: fmtBaht(r.loss), color: SERIES[i % SERIES.length] }))} />
          </div>
        </Panel>
      </div>

      <Panel
        title="Opportunity Loss by Company"
        sub="Vehicle count next to the money lost"
        right={<span className="chip">{fmtNum(totalVehicles)} {t('vehicles')}</span>}
      >
        <DataTable
          maxHeight={380}
          empty="No stamp usage in range."
          columns={[
            { key: 'name', label: 'Company', render: (r) => <strong>{r.name}</strong> },
            { key: 'vehicles', label: 'Vehicles', align: 'right', render: (r) => fmtNum(r.vehicles) },
            { key: 'vehiclePct', label: 'Vehicle Share', align: 'right', render: (r) => fmtPct(r.vehiclePct) },
            { key: 'tenantPaid', label: 'Tenant Paid', align: 'right', render: (r) => fmtBaht(r.tenantPaid) },
            { key: 'visitorPaid', label: 'Visitor Paid', align: 'right', render: (r) => fmtBaht(r.visitorPaid) },
            { key: 'loss', label: 'Opportunity Loss', align: 'right', render: (r) => <strong className="money-red">{fmtBaht(r.loss)}</strong> },
            { key: 'lossPerVehicle', label: 'Loss / Vehicle', align: 'right', render: (r) => fmtBaht2(r.lossPerVehicle) },
            { key: 'pctOfLoss', label: 'Share of Loss', align: 'right', render: (r) => fmtPct(r.pctOfLoss) },
          ]}
          rows={byCompany.map((c) => ({
            ...c,
            _key: c.companyId,
            vehiclePct: totalVehicles ? (c.vehicles / totalVehicles) * 100 : 0,
            lossPerVehicle: c.vehicles ? c.loss / c.vehicles : 0,
          }))}
          footer={byCompany.length ? (
            <>
              <td><strong>{t('Total')}</strong></td>
              <td className="num tnum"><strong>{fmtNum(totalVehicles)}</strong></td>
              <td className="num tnum">100.0%</td>
              <td className="num tnum">{fmtBaht(s.tenantRevenue)}</td>
              <td className="num tnum">{fmtBaht(s.visitorRevenue)}</td>
              <td className="num tnum"><strong className="money-red">{fmtBaht(s.totalLoss)}</strong></td>
              <td className="num tnum">{fmtBaht2(s.avgLoss)}</td>
              <td className="num tnum">100.0%</td>
            </>
          ) : null}
        />
      </Panel>

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
            {!byCompany.length && !query.loading && <div className="empty">{t('No stamp usage in range.')}</div>}
          </div>
        </Panel>

        <Panel title="Loss by Stamp Code" sub="Highest per-vehicle loss">
          <div className="recent-list">
            {byStamp.slice(0, 8).map((r) => (
              <div className="recent-item" key={r.code}>
                <div className="recent-main">
                  <strong>{r.code}</strong>
                  <small>{r.label || `${fmtNum(r.vehicles)} vehicles`}</small>
                </div>
                <div className="recent-amt">{fmtBaht(r.loss)}<br /><small className="muted">{fmtBaht2(r.loss / (r.vehicles || 1))} / veh</small></div>
              </div>
            ))}
            {!byStamp.length && !query.loading && <div className="empty">{t('No losses in range.')}</div>}
          </div>
        </Panel>
      </div>
    </>
  )
}
