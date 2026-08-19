import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { resolveRange, DEFAULT_RANGE, rangeLabel } from '../lib/dateRange.js'
import {
  filterByRange, vehicleStats, vehicleTypeSplit, occupancy, periodStats,
  overnightStats, overnightByDay,
} from '../lib/selectors.js'
import { fmtNum, fmtHour, fmtDate, fmtBaht, fmtDuration, fmtPct } from '../lib/format.js'
import RangePicker from '../components/RangePicker.jsx'
import StatCard from '../components/StatCard.jsx'
import ChartTooltip from '../components/ChartTooltip.jsx'
import { Panel, Donut, DonutLegend, ProgressRow, DataTable } from '../components/ui.jsx'
import { IconArrowIn, IconArrowOut, IconTrendUp, IconCar, IconMoon, IconUsers, IconUser } from '../components/icons.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useSite, useSiteTransactions } from '../lib/siteContext.jsx'
import SiteBreakdown from '../components/SiteBreakdown.jsx'
import './dashboard.css'

const C_IN = 'var(--good)'
const C_OUT = 'var(--danger)'
const C_REG = 'var(--series-4)'
const C_TMP = 'var(--series-1)'
const C_NIGHT_MEMBER = 'var(--series-5)'
const C_NIGHT_VISITOR = 'var(--series-2)'

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
  const night = useMemo(() => overnightStats(txns), [txns])
  const nightDaily = useMemo(() => overnightByDay(txns), [txns])

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

      <div className="stat-grid cols-3">
        <StatCard icon={IconMoon} tone="violet" label="Overnight Vehicles" value={fmtNum(night.total)} sub="Stays crossing midnight" />
        <StatCard icon={IconUsers} tone="green" label="Overnight · Member" value={fmtNum(night.member)} sub={`${fmtPct(night.memberPct)} ${t('of overnight')}`} />
        <StatCard icon={IconUser} tone="amber" label="Overnight · Visitor" value={fmtNum(night.visitor)} sub={`${fmtPct(night.visitorPct)} ${t('of overnight')}`} />
      </div>

      <div className="grid-2">
        <Panel
          title="Overnight Parking Summary"
          sub="Vehicles left overnight, member vs visitor"
          right={<span className="chip">{fmtPct(night.pctOfEntries)} {t('of all entries')}</span>}
        >
          <div className="donut-block">
            <Donut
              segments={[
                { label: 'Member', value: night.member, color: C_NIGHT_MEMBER },
                { label: 'Visitor', value: night.visitor, color: C_NIGHT_VISITOR },
              ]}
              centerTop={fmtNum(night.total)}
              centerSub={t('vehicles')}
            />
            <DonutLegend items={[
              { label: `${t('Member')} · ${fmtPct(night.memberPct)}`, value: fmtNum(night.member), color: C_NIGHT_MEMBER },
              { label: `${t('Visitor')} · ${fmtPct(night.visitorPct)}`, value: fmtNum(night.visitor), color: C_NIGHT_VISITOR },
            ]} />
          </div>

          <DataTable
            columns={[
              { key: 'group', label: 'Card Type' },
              { key: 'vehicles', label: 'Vehicles', align: 'right' },
              { key: 'share', label: 'Share', align: 'right' },
              { key: 'avg', label: 'Avg Stay', align: 'right' },
            ]}
            rows={[
              { _key: 'm', group: t('Member'), vehicles: fmtNum(night.member), share: fmtPct(night.memberPct), avg: fmtDuration(night.memberAvgMin) },
              { _key: 'v', group: t('Visitor'), vehicles: fmtNum(night.visitor), share: fmtPct(night.visitorPct), avg: fmtDuration(night.visitorAvgMin) },
            ]}
            footer={
              <>
                <td><strong>{t('Total')}</strong></td>
                <td className="num tnum"><strong>{fmtNum(night.total)}</strong></td>
                <td className="num tnum">100.0%</td>
                <td className="num tnum">{fmtDuration(night.avgDurationMin)}</td>
              </>
            }
          />
          <div className="note-row">
            <span>{t('Still inside now')}: <strong>{fmtNum(night.stillInside)}</strong></span>
            <span>{t('Overnight fees')}: <strong>{fmtBaht(night.fees)}</strong></span>
          </div>
        </Panel>

        <Panel title="Overnight Vehicles by Day" sub="Member vs visitor, per night">
          {nightDaily.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={nightDaily} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tickFormatter={(d) => fmtDate(d)} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  cursor={{ fill: 'var(--surface-inset)' }}
                  content={<ChartTooltip labelFormatter={(d) => fmtDate(d, { day: '2-digit', month: 'short', year: 'numeric' })} valueFormatter={(v) => `${fmtNum(v)} cars`} />}
                />
                <Bar dataKey="member" name="Member" stackId="n" fill={C_NIGHT_MEMBER} maxBarSize={22} />
                <Bar dataKey="visitor" name="Visitor" stackId="n" fill={C_NIGHT_VISITOR} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty">{t('No overnight parking in range.')}</div>
          )}
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
