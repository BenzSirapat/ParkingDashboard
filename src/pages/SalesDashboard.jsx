import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { resolveRange, DEFAULT_RANGE, rangeLabel } from '../lib/dateRange.js'
import { dashboardApi, rangeParams } from '../lib/api.js'
import { useApi } from '../lib/useApi.js'
import { fmtBaht, fmtBaht2, fmtNum, fmtHour, fmtTime, fmtDate } from '../lib/format.js'
import RangePicker from '../components/RangePicker.jsx'
import StatCard from '../components/StatCard.jsx'
import ChartTooltip from '../components/ChartTooltip.jsx'
import { Panel, Donut, DonutLegend, DataTable } from '../components/ui.jsx'
import { AsyncState, ErrorState, Loading } from '../components/AsyncState.jsx'
import { IconCoins, IconReceipt, IconFile, IconTrendUp, IconCar, IconWarning, IconWallet } from '../components/icons.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useSite } from '../lib/siteContext.jsx'
import './dashboard.css'

const SERIES = ['var(--series-1)', 'var(--series-3)', 'var(--series-5)', 'var(--series-2)', 'var(--series-4)', 'var(--series-6)', 'var(--series-7)']

const EMPTY_STATS = { revenue: 0, transactions: 0, vat: 0, avgTicket: 0, parkingFees: 0, lostCardFees: 0, overnightFees: 0 }
const EMPTY_ABB = { count: 0, amount: 0, vat: 0, net: 0, avg: 0, cash: 0, online: 0 }

export default function SalesDashboard() {
  const { t } = useLang()
  const { label: siteLabel } = useSite()
  const [range, setRange] = useState(DEFAULT_RANGE)
  const bounds = useMemo(() => resolveRange(range), [range])
  const params = useMemo(() => rangeParams(bounds), [bounds])

  const query = useApi((signal) => dashboardApi.sales(params, signal), [JSON.stringify(params)])
  const data = query.data

  const s = data?.stats ?? EMPTY_STATS
  const abb = data?.abb ?? EMPTY_ABB
  const payments = data?.payments ?? []
  const abbDaily = (data?.abbDaily ?? []).slice(0, 14)

  const paySegments = payments.map((p, i) => ({ label: p.key, value: p.count, color: SERIES[i % SERIES.length] }))

  return (
    <>
      <div className="page-toolbar">
        <div>
          <div className="hint-label">{t('Sales Overview')}</div>
          <div className="chips">
            <span className="chip">{siteLabel}</span>
            <span className="chip">{t(rangeLabel(range))}</span>
          </div>
        </div>
        <RangePicker value={range} onChange={setRange} />
      </div>

      {query.error && <ErrorState error={query.error} onRetry={query.reload} />}
      {query.loading && !data && <Loading />}

      <div className="stat-grid">
        <StatCard icon={IconCoins} tone="green" valueClass="money-green" label="Total Revenue" value={fmtBaht(s.revenue)} sub="VAT included" />
        <StatCard icon={IconReceipt} tone="blue" label="Total Transactions" value={fmtNum(s.transactions)} sub="Paid & exited" />
        <StatCard icon={IconFile} tone="amber" label="Total VAT" value={fmtBaht(s.vat)} sub="Included in the total" />
        <StatCard icon={IconTrendUp} tone="violet" label="Average Ticket" value={fmtBaht2(s.avgTicket)} sub="Per transaction" />
      </div>

      <div className="stat-grid cols-3">
        <StatCard icon={IconCar} tone="green" valueClass="money-green" label="Parking Fees" value={fmtBaht(s.parkingFees)} />
        <StatCard icon={IconWarning} tone="red" valueClass="money-red" label="Lost Card Fees" value={fmtBaht(s.lostCardFees)} />
        <StatCard icon={IconWallet} tone="amber" label="Overnight Fees" value={fmtBaht(s.overnightFees)} />
      </div>

      <div className="grid-2">
        <Panel title="Hourly Revenue" sub="Collected fees by hour of day">
          <AsyncState query={query} height={320}>
            {(d) => (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={d.hourlyRevenue} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="hour" tickFormatter={fmtHour} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} interval={1} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={58} tickFormatter={(v) => fmtNum(v)} />
                  <Tooltip cursor={{ fill: 'var(--surface-inset)' }} content={<ChartTooltip labelFormatter={fmtHour} valueFormatter={(v) => fmtBaht(v)} />} />
                  <Bar dataKey="revenue" name="Revenue" fill="var(--series-1)" radius={[5, 5, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </AsyncState>
        </Panel>

        <Panel title="Payment Methods" sub="Share of transactions">
          <AsyncState query={query} height={320} empty="No payments in this range.">
            {() => (
              <div className="donut-block">
                <Donut segments={paySegments} centerTop={fmtNum(s.transactions)} centerSub={t('txns')} />
                <DonutLegend items={payments.map((p, i) => ({ label: p.key, value: fmtNum(p.count), color: SERIES[i % SERIES.length] }))} />
              </div>
            )}
          </AsyncState>
        </Panel>
      </div>

      <Panel
        title="ABB Summary"
        sub="Abbreviated tax invoices (ใบกำกับภาษีอย่างย่อ) issued at the pay stations"
        right={
          <div className="legend">
            <span>{t('Issued')}: <strong>{fmtNum(abb.count)}</strong></span>
            <span>{t('Total')}: <strong>{fmtBaht(abb.amount)}</strong></span>
            <span>{t('VAT')}: <strong>{fmtBaht(abb.vat)}</strong></span>
          </div>
        }
      >
        <div className="stat-grid cols-4 flush">
          <StatCard icon={IconReceipt} tone="blue" label="ABB Issued" value={fmtNum(abb.count)} sub="Receipts" />
          <StatCard icon={IconCoins} tone="green" valueClass="money-green" label="ABB Net" value={fmtBaht(abb.net)} sub="Before VAT" />
          <StatCard icon={IconFile} tone="amber" label="ABB VAT" value={fmtBaht(abb.vat)} sub="Included in the total" />
          <StatCard icon={IconWallet} tone="violet" label="Cash / Online" value={`${fmtNum(abb.cash)} / ${fmtNum(abb.online)}`} sub="By channel" />
        </div>

        <DataTable
          maxHeight={320}
          empty="No ABB receipts in this range."
          columns={[
            { key: 'day', label: 'Date', render: (r) => fmtDate(`${r.day}T00:00:00`, { day: '2-digit', month: 'short', year: 'numeric' }) },
            { key: 'count', label: 'ABB Count', align: 'right', render: (r) => fmtNum(r.count) },
            { key: 'firstNo', label: 'First No.', render: (r) => r.firstNo || '—' },
            { key: 'lastNo', label: 'Last No.', render: (r) => r.lastNo || '—' },
            { key: 'net', label: 'Net', align: 'right', render: (r) => fmtBaht2(r.net) },
            { key: 'vat', label: 'VAT', align: 'right', render: (r) => fmtBaht2(r.vat) },
            { key: 'amount', label: 'Total', align: 'right', render: (r) => <strong>{fmtBaht2(r.amount)}</strong> },
          ]}
          rows={abbDaily.map((r) => ({ ...r, _key: r.day }))}
        />
      </Panel>

      <Panel title="Recent Transactions" sub="Latest paid exits">
        <AsyncState query={query} height={240} empty="No transactions in this range.">
          {(d) => (
            <DataTable
              columns={[
                { key: 'entryTime', label: 'Time', render: (r) => fmtTime(r.exitTime || r.entryTime) },
                { key: 'plate', label: 'License Plate', render: (r) => <strong>{r.plate || '—'}</strong> },
                { key: 'type', label: 'Type', render: (r) => <span className={`pill ${r.type}`}>{t(r.type)}</span> },
                { key: 'payment', label: 'Payment', render: (r) => r.payment || '—' },
                { key: 'total', label: 'Amount', align: 'right', render: (r) => fmtBaht(r.total) },
              ]}
              rows={(d.recent ?? []).map((r) => ({ ...r, _key: r.id }))}
              empty="No transactions in this range."
            />
          )}
        </AsyncState>
      </Panel>
    </>
  )
}
