import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { resolveRange, DEFAULT_RANGE, rangeLabel } from '../lib/dateRange.js'
import {
  filterByRange, salesStats, hourlyRevenue, paymentBreakdown, recentTransactions,
} from '../lib/selectors.js'
import { fmtBaht, fmtBaht2, fmtNum, fmtHour, fmtTime } from '../lib/format.js'
import RangePicker from '../components/RangePicker.jsx'
import StatCard from '../components/StatCard.jsx'
import ChartTooltip from '../components/ChartTooltip.jsx'
import { Panel, Donut, DonutLegend, DataTable } from '../components/ui.jsx'
import { IconCoins, IconReceipt, IconFile, IconTrendUp, IconCar, IconWarning, IconWallet } from '../components/icons.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useSite, useSiteTransactions } from '../lib/siteContext.jsx'
import SiteBreakdown from '../components/SiteBreakdown.jsx'
import './dashboard.css'

const PAY_COLORS = {
  'QR Pay': 'var(--series-1)',
  Cash: 'var(--series-3)',
  'บัตร Rabbit': 'var(--series-5)',
  'Rabbit Line Pay': 'var(--series-2)',
}

export default function SalesDashboard() {
  const { t } = useLang()
  const { label: siteLabel } = useSite()
  const siteTxns = useSiteTransactions()
  const [range, setRange] = useState(DEFAULT_RANGE)
  const bounds = useMemo(() => resolveRange(range), [range])
  const txns = useMemo(() => filterByRange(siteTxns, bounds), [siteTxns, bounds])

  const s = useMemo(() => salesStats(txns), [txns])
  const hourly = useMemo(() => hourlyRevenue(txns), [txns])
  const payments = useMemo(() => paymentBreakdown(txns), [txns])
  const recent = useMemo(() => recentTransactions(txns.filter((t) => t.status === 'exited'), 8), [txns])

  const paySegments = payments.map((p) => ({ label: p.key, value: p.count, color: PAY_COLORS[p.key] || 'var(--series-4)' }))

  return (
    <>
      <div className="page-toolbar">
        <div>
          <div className="hint-label">{t('Sales Overview')}</div>
          <div className="chips">
            <span className="chip">{t(siteLabel)}</span>
            <span className="chip">{t(rangeLabel(range))}</span>
          </div>
        </div>
        <RangePicker value={range} onChange={setRange} />
      </div>

      <div className="stat-grid">
        <StatCard icon={IconCoins} tone="green" valueClass="money-green" label="Total Revenue" value={fmtBaht(s.revenue)} sub="VAT included" />
        <StatCard icon={IconReceipt} tone="blue" label="Total Transactions" value={fmtNum(s.transactions)} sub="Paid & exited" />
        <StatCard icon={IconFile} tone="amber" label="Total VAT" value={fmtBaht(s.vat)} sub="7% included" />
        <StatCard icon={IconTrendUp} tone="violet" label="Average Ticket" value={fmtBaht2(s.avgTicket)} sub="Per transaction" />
      </div>

      <div className="stat-grid cols-3">
        <StatCard icon={IconCar} tone="green" valueClass="money-green" label="Parking Fees" value={fmtBaht(s.parkingFees)} />
        <StatCard icon={IconWarning} tone="red" valueClass="money-red" label="Lost Card Fees" value={fmtBaht(s.lostCardFees)} />
        <StatCard icon={IconWallet} tone="amber" label="Overnight Fees" value={fmtBaht(s.overnightFees)} />
      </div>

      <SiteBreakdown
        txns={txns}
        metrics={['revenue', 'transactions', 'avgTicket', 'vat']}
        shareBy="revenue"
        chartMetric="revenue"
        sub="Revenue contribution of every site in the total"
      />

      <div className="grid-2">
        <Panel title="Hourly Revenue" sub="Collected fees by hour of day">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={hourly} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="hour" tickFormatter={fmtHour} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} interval={1} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={58} tickFormatter={(v) => fmtNum(v)} />
              <Tooltip cursor={{ fill: 'var(--surface-inset)' }} content={<ChartTooltip labelFormatter={fmtHour} valueFormatter={(v) => fmtBaht(v)} />} />
              <Bar dataKey="revenue" name="Revenue" fill="var(--series-1)" radius={[5, 5, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Payment Methods" sub="Share of transactions">
          <div className="donut-block">
            <Donut segments={paySegments} centerTop={fmtNum(s.transactions)} centerSub={t('txns')} />
            <DonutLegend items={payments.map((p) => ({ label: p.key, value: fmtNum(p.count), color: PAY_COLORS[p.key] || 'var(--series-4)' }))} />
          </div>
        </Panel>
      </div>

      <Panel title="Recent Transactions" sub="Latest paid exits">
        <DataTable
          columns={[
            { key: 'entryTime', label: 'Time', render: (r) => fmtTime(r.exitTime || r.entryTime) },
            { key: 'plate', label: 'License Plate', render: (r) => <strong>{r.plate}</strong> },
            { key: 'type', label: 'Type', render: (r) => <span className={`pill ${r.type}`}>{t(r.type)}</span> },
            { key: 'payment', label: 'Payment', render: (r) => r.payment || '—' },
            { key: 'total', label: 'Amount', align: 'right', render: (r) => fmtBaht(r.total) },
          ]}
          rows={recent}
        />
      </Panel>
    </>
  )
}
