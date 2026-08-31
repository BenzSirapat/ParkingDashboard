import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import ReportPage from '../../components/ReportPage.jsx'
import ChartTooltip from '../../components/ChartTooltip.jsx'
import { fmtBaht, fmtNum } from '../../lib/format.js'
import { useMasterData } from '../../lib/masterData.jsx'

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)', 'var(--series-7)']

export default function OpportunityLossReport() {
  const { tenantOptions, stampOptions } = useMasterData()

  const chart = (rows) => {
    const top = rows.slice(0, 8)
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={top} margin={{ top: 6, right: 8, left: 0, bottom: 46 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} angle={-30} textAnchor="end" interval={0} height={64} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => fmtNum(v)} />
          <Tooltip cursor={{ fill: 'var(--surface-inset)' }} content={<ChartTooltip valueFormatter={(v) => fmtBaht(v)} />} />
          <Bar dataKey="loss" name="Opportunity Loss" radius={[5, 5, 0, 0]} maxBarSize={40}>
            {top.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ReportPage
      reportKey="opportunity-loss"
      title="Opportunity Loss Summary"
      subtitle="Uncollected revenue per tenant"
      exportName="opportunity-loss-summary"
      chart={chart}
      chartTitle="Bar comparison by tenant"
      filters={[
        { id: 'tenantId', label: 'Tenant', type: 'select', options: tenantOptions, colSpan: 2 },
        { id: 'stampCode', label: 'Stamp code', type: 'select', options: stampOptions, colSpan: 2 },
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
      ]}
    />
  )
}
