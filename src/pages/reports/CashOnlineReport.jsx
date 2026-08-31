import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import ReportPage from '../../components/ReportPage.jsx'
import ChartTooltip from '../../components/ChartTooltip.jsx'
import { fmtBaht, fmtNum } from '../../lib/format.js'
import { cardTypeOptions } from './reportHelpers.js'

const CASH = 'var(--series-3)'
const ONLINE = 'var(--series-1)'

export default function CashOnlineReport() {
  const chart = (rows) => (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="payment" tick={{ fontSize: 12, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={54} tickFormatter={(v) => fmtNum(v)} />
        <Tooltip cursor={{ fill: 'var(--surface-inset)' }} content={<ChartTooltip valueFormatter={(v) => fmtBaht(v)} />} />
        <Bar dataKey="amount" name="Amount" radius={[6, 6, 0, 0]} maxBarSize={64}>
          {rows.map((r, i) => <Cell key={i} fill={r.channel === 'cash' ? CASH : ONLINE} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )

  return (
    <ReportPage
      reportKey="cash-online"
      title="Cash or Online Payment"
      subtitle="Revenue split by payment method and channel"
      exportName="cash-or-online-payment"
      chart={chart}
      chartTitle="Amount by payment method"
      filters={[
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
        { id: 'type', label: 'Card type', type: 'select', options: cardTypeOptions },
      ]}
    />
  )
}
