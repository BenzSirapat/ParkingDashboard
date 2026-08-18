import { useCallback } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import ReportPage from '../../components/ReportPage.jsx'
import ChartTooltip from '../../components/ChartTooltip.jsx'
import { EmptyState } from '../../components/ui.jsx'
import { TRANSACTIONS } from '../../data/mockData.js'
import { fmtBaht, fmtNum } from '../../lib/format.js'
import { useLang } from '../../lib/i18n.jsx'
import { applyFilters, channelOptions, paymentOptions } from './reportHelpers.js'

const COLORS = {
  'QR Pay': 'var(--series-1)',
  Cash: 'var(--series-3)',
  'บัตร Rabbit': 'var(--series-5)',
  'Rabbit Line Pay': 'var(--series-2)',
}

export default function CashOnlineReport() {
  const { t: tr } = useLang()
  const compute = useCallback((values) => {
    const rows = applyFilters(TRANSACTIONS.filter((t) => t.payment), { ...values, status: 'exited' })
    const map = new Map()
    for (const t of rows) {
      if (!map.has(t.payment)) map.set(t.payment, { _key: t.payment, method: t.payment, channel: t.channel, count: 0, amount: 0, vat: 0 })
      const row = map.get(t.payment)
      row.count++
      row.amount += t.total
      row.vat += t.vat
    }
    return [...map.values()]
      .sort((a, b) => b.amount - a.amount)
      .map((r) => ({
        ...r,
        channel: r.channel === 'cash' ? 'Cash' : 'Online',
        transactions: fmtNum(r.count),
        amountText: fmtBaht(r.amount),
        vatText: fmtBaht(r.vat),
        _amount: Math.round(r.amount),
      }))
  }, [])

  const chart = (rows) =>
    rows.length ? (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="method" tick={{ fontSize: 12, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={54} tickFormatter={(v) => fmtNum(v)} />
          <Tooltip cursor={{ fill: 'var(--surface-inset)' }} content={<ChartTooltip valueFormatter={(v) => fmtBaht(v)} />} />
          <Bar dataKey="_amount" name="Amount" radius={[6, 6, 0, 0]} maxBarSize={64}>
            {rows.map((r, i) => <Cell key={i} fill={COLORS[r.method] || 'var(--series-4)'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <EmptyState label="No data for chart" />
    )

  return (
    <ReportPage
      compute={compute}
      title="Cash or Online Payment"
      subtitle="Payment method breakdown"
      exportName="cash-or-online-payment"
      chart={chart}
      chartTitle="Amount by payment method"
      filters={[
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
        { id: 'channel', label: 'Channel', type: 'select', options: channelOptions },
        { id: 'payment', label: 'Payment method', type: 'select', options: paymentOptions },
      ]}
      columns={[
        { key: 'method', label: 'Payment Method', render: (r) => <strong>{r.method}</strong> },
        { key: 'channel', label: 'Channel', render: (r) => <span className={`pill ${r.channel === 'Cash' ? 'inside' : 'ok'}`}>{tr(r.channel)}</span> },
        { key: 'transactions', label: 'Transactions', align: 'right' },
        { key: 'amountText', label: 'Amount', align: 'right' },
        { key: 'vatText', label: 'VAT', align: 'right' },
      ]}
    />
  )
}
