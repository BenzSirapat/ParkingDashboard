import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { resolveRange, DEFAULT_RANGE, rangeLabel } from '../lib/dateRange.js'
import {
  filterByRange, transactionStats, hourlyTraffic, cardTypes, recentTransactions,
} from '../lib/selectors.js'
import { fmtNum, fmtHour, fmtTime, fmtDuration } from '../lib/format.js'
import RangePicker from '../components/RangePicker.jsx'
import StatCard from '../components/StatCard.jsx'
import ChartTooltip from '../components/ChartTooltip.jsx'
import { Panel, Donut, DonutLegend, DataTable, ProgressRow } from '../components/ui.jsx'
import { IconArrowIn, IconArrowOut, IconUsers, IconClock } from '../components/icons.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useSite, useSiteTransactions } from '../lib/siteContext.jsx'
import SiteBreakdown from '../components/SiteBreakdown.jsx'
import './dashboard.css'

const C_IN = 'var(--good)'
const C_OUT = 'var(--danger)'
const C_MEMBER = 'var(--series-4)'
const C_VISITOR = 'var(--series-1)'

export default function TransactionDashboard() {
  const { t } = useLang()
  const { label: siteLabel } = useSite()
  const siteTxns = useSiteTransactions()
  const [range, setRange] = useState(DEFAULT_RANGE)
  const bounds = useMemo(() => resolveRange(range), [range])
  const txns = useMemo(() => filterByRange(siteTxns, bounds), [siteTxns, bounds])

  const s = useMemo(() => transactionStats(txns), [txns])
  const hourly = useMemo(() => hourlyTraffic(txns), [txns])
  const cards = useMemo(() => cardTypes(txns), [txns])
  const recent = useMemo(() => recentTransactions(txns, 8), [txns])

  return (
    <>
      <div className="page-toolbar">
        <div>
          <div className="hint-label">{t('Vehicle Entry / Exit Overview')}</div>
          <div className="chips"><span className="chip">{t(siteLabel)}</span><span className="chip">{t(rangeLabel(range))}</span></div>
        </div>
        <RangePicker value={range} onChange={setRange} />
      </div>

      <div className="stat-grid">
        <StatCard icon={IconArrowIn} tone="green" label="Total Entries" value={fmtNum(s.entries)} sub="Vehicles in" />
        <StatCard icon={IconArrowOut} tone="blue" label="Total Exits" value={fmtNum(s.exits)} sub="Vehicles out" />
        <StatCard icon={IconUsers} tone="amber" label="Currently Inside" value={fmtNum(s.inside)} sub="Not yet exited" />
        <StatCard icon={IconClock} tone="violet" label="Peak Hour" value={s.peakHour} sub="Busiest entry hour" />
      </div>

      <SiteBreakdown
        txns={txns}
        metrics={['entries', 'exits', 'inside', 'members', 'visitors', 'peakHour']}
        shareBy="entries"
        chartMetric="entries"
        sub="Entry volume of every site in the total"
      />

      <Panel title="Status Breakdown" sub="Exit completion of entries">
        <div className="prog-list">
          <ProgressRow label="Exited Successfully" value={`${fmtNum(s.exits)} · ${s.exitedPct}%`} pct={s.exitedPct} color="var(--good)" />
          <ProgressRow label="Not Exited (inside)" value={`${fmtNum(s.inside)} · ${100 - s.exitedPct}%`} pct={100 - s.exitedPct} color="var(--warn)" />
        </div>
      </Panel>

      <div className="grid-2">
        <Panel
          title="Hourly Traffic"
          sub="Entries vs exits by hour"
          right={<div className="legend"><span><i style={{ background: C_IN }} /> {t('Entries')}</span><span><i style={{ background: C_OUT }} /> {t('Exits')}</span></div>}
        >
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={hourly} margin={{ top: 6, right: 8, left: -8, bottom: 0 }} barGap={2}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="hour" tickFormatter={fmtHour} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} interval={1} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => fmtNum(v)} />
              <Tooltip cursor={{ fill: 'var(--surface-inset)' }} content={<ChartTooltip labelFormatter={fmtHour} valueFormatter={(v) => `${fmtNum(v)} cars`} />} />
              <Bar dataKey="entries" name="Entries" fill={C_IN} radius={[4, 4, 0, 0]} maxBarSize={14} />
              <Bar dataKey="exits" name="Exits" fill={C_OUT} radius={[4, 4, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Card Types" sub="Member vs visitor entries">
          <div className="donut-block">
            <Donut
              segments={[
                { label: 'Member', value: cards.member, color: C_MEMBER },
                { label: 'Visitor', value: cards.visitor, color: C_VISITOR },
              ]}
              centerTop={fmtNum(cards.member + cards.visitor)}
              centerSub={t('entries')}
            />
            <DonutLegend items={[
              { label: 'Member', value: fmtNum(cards.member), color: C_MEMBER },
              { label: 'Visitor', value: fmtNum(cards.visitor), color: C_VISITOR },
            ]} />
          </div>
        </Panel>
      </div>

      <Panel title="Recent Transactions" sub="Latest vehicle movements">
        <DataTable
          columns={[
            { key: 'entryTime', label: 'Entry', render: (r) => fmtTime(r.entryTime) },
            { key: 'exitTime', label: 'Exit', render: (r) => (r.exitTime ? fmtTime(r.exitTime) : '—') },
            { key: 'plate', label: 'License Plate', render: (r) => <strong>{r.plate}</strong> },
            { key: 'cardNo', label: 'Card No.' },
            { key: 'type', label: 'Type', render: (r) => <span className={`pill ${r.type}`}>{t(r.type)}</span> },
            { key: 'durationMin', label: 'Duration', align: 'right', render: (r) => fmtDuration(r.durationMin) },
            { key: 'status', label: 'Status', render: (r) => <span className={`pill ${r.status === 'exited' ? 'ok' : 'inside'}`}>{t(r.status === 'exited' ? 'Exited' : 'Inside')}</span> },
          ]}
          rows={recent}
        />
      </Panel>
    </>
  )
}
