import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import ReportPage from '../../components/ReportPage.jsx'
import ChartTooltip from '../../components/ChartTooltip.jsx'
import { fmtBaht } from '../../lib/format.js'
import { useMasterData } from '../../lib/masterData.jsx'
import { cardTypeOptions } from './reportHelpers.js'

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)', 'var(--series-7)']

export default function DiscountReport() {
  const { tenantOptions, stampOptions } = useMasterData()

  const chart = (rows) => {
    const top = rows.slice(0, 10)
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={top} margin={{ top: 6, right: 8, left: 0, bottom: 46 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="code" tick={{ fontSize: 10.5, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} angle={-30} textAnchor="end" interval={0} height={64} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={52} />
          <Tooltip cursor={{ fill: 'var(--surface-inset)' }} content={<ChartTooltip valueFormatter={(v) => fmtBaht(v)} />} />
          <Bar dataKey="discount" name="Discount given" radius={[5, 5, 0, 0]} maxBarSize={40}>
            {top.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ReportPage
      reportKey="discount"
      title="Discount Report"
      subtitle="Stamp discount by tenant and stamp code"
      exportName="discount-report"
      chart={chart}
      chartTitle="Discount given by stamp code"
      filters={[
        { id: 'tenantId', label: 'Tenant', type: 'select', options: tenantOptions },
        { id: 'stampCode', label: 'Stamp code', type: 'select', options: stampOptions },
        { id: 'type', label: 'Transaction type', type: 'select', options: cardTypeOptions },
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
      ]}
    />
  )
}
