import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import ReportPage from '../../components/ReportPage.jsx'
import ChartTooltip from '../../components/ChartTooltip.jsx'
import { fmtBaht, fmtDate, fmtNum } from '../../lib/format.js'

export default function SalesTaxDailyReport() {
  const chart = (rows) => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="day"
          tickFormatter={(d) => fmtDate(`${d}T00:00:00`)}
          tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border-strong)' }}
          minTickGap={24}
        />
        <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => fmtNum(v)} />
        <Tooltip
          cursor={{ fill: 'var(--surface-inset)' }}
          content={(
            <ChartTooltip
              labelFormatter={(d) => fmtDate(`${d}T00:00:00`, { day: '2-digit', month: 'short', year: 'numeric' })}
              valueFormatter={(v) => fmtBaht(v)}
            />
          )}
        />
        <Bar dataKey="totalAmount" name="Total amount" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )

  return (
    <ReportPage
      reportKey="sales-tax-daily"
      title="Sales Tax Daily Summary"
      subtitle="Cash takings totalled per day"
      exportName="sales-tax-daily-summary"
      chart={chart}
      chartTitle="Daily takings"
      filters={[
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
      ]}
    />
  )
}
