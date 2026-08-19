import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { resolveRange, DEFAULT_RANGE, rangeLabel } from '../lib/dateRange.js'
import {
  filterByRange, transactionStats, hourlyTraffic, dailyTraffic, cardTypes, recentTransactions,
} from '../lib/selectors.js'
import { fmtNum, fmtHour, fmtTime, fmtDate, fmtDateTime, fmtDuration } from '../lib/format.js'
import RangePicker from '../components/RangePicker.jsx'
import StatCard from '../components/StatCard.jsx'
import ChartTooltip from '../components/ChartTooltip.jsx'
import { Panel, Donut, DonutLegend, DataTable, ProgressRow } from '../components/ui.jsx'
import { IconArrowIn, IconArrowOut, IconUsers, IconClock, IconSearch } from '../components/icons.jsx'
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

  // Traffic can be read by hour of day or day by day — long ranges default to
  // the daily view, where a 24-hour profile says very little.
  const [grain, setGrain] = useState('hour')
  const s = useMemo(() => transactionStats(txns), [txns])
  const hourly = useMemo(() => hourlyTraffic(txns), [txns])
  const daily = useMemo(() => dailyTraffic(txns), [txns])
  const byDay = grain === 'day'
  const trafficData = byDay ? daily : hourly
  const cards = useMemo(() => cardTypes(txns), [txns])
  const recent = useMemo(() => recentTransactions(txns, 8), [txns])

  // Plate lookup — find a member or visitor by (part of) their license plate.
  const [plateQuery, setPlateQuery] = useState('')
  const [plateType, setPlateType] = useState('all')
  const plateHits = useMemo(() => {
    const q = plateQuery.trim().toLowerCase()
    if (!q) return []
    return txns
      .filter((tx) => (plateType === 'all' ? true : tx.type === plateType))
      .filter((tx) => tx.plate.toLowerCase().includes(q) || tx.cardNo.includes(q))
      .sort((a, b) => (a.entryTime < b.entryTime ? 1 : -1))
      .slice(0, 100)
  }, [txns, plateQuery, plateType])

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
          title={byDay ? 'Daily Traffic' : 'Hourly Traffic'}
          sub={byDay ? 'Entries vs exits by day' : 'Entries vs exits by hour'}
          right={
            <div className="panel-filters">
              <div className="segmented small" role="tablist" aria-label={t('Traffic grain')}>
                <button role="tab" aria-selected={!byDay} className={!byDay ? 'active' : ''} onClick={() => setGrain('hour')}>{t('By hour')}</button>
                <button role="tab" aria-selected={byDay} className={byDay ? 'active' : ''} onClick={() => setGrain('day')}>{t('By day')}</button>
              </div>
              <div className="legend"><span><i style={{ background: C_IN }} /> {t('Entries')}</span><span><i style={{ background: C_OUT }} /> {t('Exits')}</span></div>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={trafficData} margin={{ top: 6, right: 8, left: -8, bottom: 0 }} barGap={2}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              {byDay ? (
                <XAxis dataKey="day" tickFormatter={(d) => fmtDate(d)} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} minTickGap={24} />
              ) : (
                <XAxis dataKey="hour" tickFormatter={fmtHour} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} interval={1} />
              )}
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => fmtNum(v)} />
              <Tooltip
                cursor={{ fill: 'var(--surface-inset)' }}
                content={
                  <ChartTooltip
                    labelFormatter={byDay ? (d) => fmtDate(d, { day: '2-digit', month: 'short', year: 'numeric' }) : fmtHour}
                    valueFormatter={(v) => `${fmtNum(v)} cars`}
                  />
                }
              />
              <Bar dataKey="entries" name="Entries" fill={C_IN} radius={[4, 4, 0, 0]} maxBarSize={byDay ? 22 : 14} />
              <Bar dataKey="exits" name="Exits" fill={C_OUT} radius={[4, 4, 0, 0]} maxBarSize={byDay ? 22 : 14} />
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

      <Panel
        title="Member / Visitor Plate Search"
        sub="Look up a member or visitor by license plate"
        right={
          <div className="panel-filters">
            <label className="search-box">
              <IconSearch width={15} height={15} />
              <input
                className="input"
                placeholder={t('License plate or card no.')}
                value={plateQuery}
                onChange={(e) => setPlateQuery(e.target.value)}
              />
            </label>
            <select className="select" value={plateType} onChange={(e) => setPlateType(e.target.value)}>
              <option value="all">{t('Member + Visitor')}</option>
              <option value="member">{t('Member')}</option>
              <option value="visitor">{t('Visitor')}</option>
            </select>
          </div>
        }
      >
        {plateQuery.trim() ? (
          <>
            <div className="selection-bar">
              {fmtNum(plateHits.length)} {t('matches')} · {t(rangeLabel(range))}
              <button className="btn tiny" onClick={() => setPlateQuery('')}>{t('Clear')}</button>
            </div>
            <DataTable
              maxHeight={360}
              empty="No vehicle matches that plate in this range."
              rows={plateHits.map((r) => ({ ...r, _key: r.id }))}
              columns={[
                { key: 'plate', label: 'License Plate', render: (r) => <strong>{r.plate}</strong> },
                { key: 'province', label: 'Province' },
                { key: 'type', label: 'Type', render: (r) => <span className={`pill ${r.type}`}>{t(r.type)}</span> },
                { key: 'cardNo', label: 'Card No.' },
                { key: 'entryTime', label: 'Entry', render: (r) => fmtDateTime(r.entryTime) },
                { key: 'exitTime', label: 'Exit', render: (r) => (r.exitTime ? fmtDateTime(r.exitTime) : '—') },
                { key: 'durationMin', label: 'Duration', align: 'right', render: (r) => fmtDuration(r.durationMin) },
                { key: 'overnight', label: 'Overnight', render: (r) => (r.overnight ? <span className="pill warn">{t('Overnight')}</span> : '—') },
                { key: 'status', label: 'Status', render: (r) => <span className={`pill ${r.status === 'exited' ? 'ok' : 'inside'}`}>{t(r.status === 'exited' ? 'Exited' : 'Inside')}</span> },
              ]}
            />
          </>
        ) : (
          <div className="empty">{t('Type a license plate to search members and visitors.')}</div>
        )}
      </Panel>

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
