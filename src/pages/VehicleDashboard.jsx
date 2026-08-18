import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { resolveRange, DEFAULT_RANGE, rangeLabel } from '../lib/dateRange.js'
import {
  filterByRange, vehicleStats, vehicleTypeSplit, occupancy, periodStats,
} from '../lib/selectors.js'
import { fmtNum, fmtHour, fmtDate } from '../lib/format.js'
import RangePicker from '../components/RangePicker.jsx'
import StatCard from '../components/StatCard.jsx'
import ChartTooltip from '../components/ChartTooltip.jsx'
import { Panel, Donut, DonutLegend, ProgressRow } from '../components/ui.jsx'
import { IconArrowIn, IconArrowOut, IconTrendUp, IconCar } from '../components/icons.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useSite, useSiteTransactions } from '../lib/siteContext.jsx'
import SiteBreakdown from '../components/SiteBreakdown.jsx'
import './dashboard.css'

const C_IN = 'var(--good)'
const C_OUT = 'var(--danger)'
const C_REG = 'var(--series-4)'
const C_TMP = 'var(--series-1)'

export default function VehicleDashboard() {
  const { t } = useLang()
  const { label: siteLabel } = useSite()
  const siteTxns = useSiteTransactions()
  const [range, setRange] = useState(DEFAULT_RANGE)
  const bounds = useMemo(() => resolveRange(range), [range])
  const txns = useMemo(() => filterByRange(siteTxns, bounds), [siteTxns, bounds])

  const s = useMemo(() => vehicleStats(txns), [txns])
  const types = useMemo(() => vehicleTypeSplit(txns), [txns])
  const trend = useMemo(() => occupancy(txns, bounds).rows, [txns, bounds])
  const periods = useMemo(() => periodStats(txns), [txns])

  const totalTypes = types.regular + types.temporary || 1

  return (
    <>
      <div className="page-toolbar">
        <div>
          <div className="hint-label">{t('Vehicle Traffic by Time Period')}</div>
          <div className="chips"><span className="chip">{t(siteLabel)}</span><span className="chip">{t(rangeLabel(range))}</span></div>
        </div>
        <RangePicker value={range} onChange={setRange} />
      </div>

      <div className="stat-grid">
        <StatCard icon={IconArrowIn} tone="green" label="Total Vehicles In" value={fmtNum(s.vehiclesIn)} sub="Entries" />
        <StatCard icon={IconArrowOut} tone="blue" label="Total Vehicles Out" value={fmtNum(s.vehiclesOut)} sub="Exits" />
        <StatCard icon={IconTrendUp} tone="amber" label="Peak Accumulated" value={fmtNum(s.peakAccumulated)} sub="Max concurrent" />
        <StatCard icon={IconCar} tone={s.netFlow >= 0 ? 'violet' : 'red'} valueClass={s.netFlow < 0 ? 'money-red' : ''} label="Net Flow" value={fmtNum(s.netFlow)} sub="In − Out" />
      </div>

      <div className="stat-grid cols-3">
        <StatCard icon={IconCar} tone="green" valueClass="money-green" label="Regular Vehicles" value={`${fmtNum(s.regular.in)}`} sub={`${fmtNum(s.regular.out)} out`} />
        <StatCard icon={IconCar} tone="amber" label="Temporary Vehicles" value={`${fmtNum(s.temporary.in)}`} sub={`${fmtNum(s.temporary.out)} out`} />
      </div>

      <SiteBreakdown
        txns={txns}
        metrics={['entries', 'exits', 'peakAccumulated', 'inside']}
        shareBy="entries"
        chartMetric="entries"
        sub="Vehicle volume of every site in the total"
      />

      <div className="grid-2">
        <Panel
          title="In-Out Comparison by Time Period"
          sub="Vehicles in vs out by hour"
          right={<div className="legend"><span><i style={{ background: C_IN }} /> {t('In')}</span><span><i style={{ background: C_OUT }} /> {t('Out')}</span></div>}
        >
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={periods} margin={{ top: 6, right: 8, left: -8, bottom: 0 }} barGap={2}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="hour" tickFormatter={fmtHour} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} interval={1} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip cursor={{ fill: 'var(--surface-inset)' }} content={<ChartTooltip labelFormatter={fmtHour} valueFormatter={(v) => `${fmtNum(v)} cars`} />} />
              <Bar dataKey="in" name="Vehicles In" fill={C_IN} radius={[4, 4, 0, 0]} maxBarSize={14} />
              <Bar dataKey="out" name="Vehicles Out" fill={C_OUT} radius={[4, 4, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Vehicle Types" sub="Regular vs temporary">
          <div className="donut-block">
            <Donut
              segments={[
                { label: 'Regular', value: types.regular, color: C_REG },
                { label: 'Temporary', value: types.temporary, color: C_TMP },
              ]}
              centerTop={fmtNum(totalTypes)}
              centerSub={t('vehicles')}
            />
            <DonutLegend items={[
              { label: `${t('Regular')} · ${((types.regular / totalTypes) * 100).toFixed(1)}%`, value: fmtNum(types.regular), color: C_REG },
              { label: `${t('Temporary')} · ${((types.temporary / totalTypes) * 100).toFixed(1)}%`, value: fmtNum(types.temporary), color: C_TMP },
            ]} />
          </div>
        </Panel>
      </div>

      <Panel title="Accumulated Trend" sub="Vehicles inside over time">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trend} margin={{ top: 6, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="t" tickFormatter={(t) => fmtDate(new Date(t).toISOString())} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} minTickGap={40} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={44} />
            <Tooltip cursor={{ stroke: 'var(--border-strong)' }} content={<ChartTooltip labelFormatter={(t) => new Date(t).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} valueFormatter={(v) => `${fmtNum(v)} inside`} />} />
            <Line type="monotone" dataKey="acc" name="Accumulated" stroke="var(--series-4)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Time Period Statistics" sub="Per-hour in/out summary">
        <div className="prog-list" style={{ maxHeight: 340, overflowY: 'auto' }}>
          {periods.map((p) => (
            <ProgressRow
              key={p.hour}
              label={`${fmtHour(p.hour)} – ${String(p.hour).padStart(2, '0')}:59`}
              value={`${fmtNum(p.in)} in / ${fmtNum(p.out)} out`}
              pct={Math.min(100, p.exitRate)}
              color={p.net >= 0 ? 'var(--good)' : 'var(--danger)'}
              sub={<><span>Net: {p.net >= 0 ? '+' : ''}{fmtNum(p.net)}</span><span>Exit rate: {p.exitRate}%</span></>}
            />
          ))}
        </div>
      </Panel>
    </>
  )
}
