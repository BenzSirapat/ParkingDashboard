import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import ReportPage from '../../components/ReportPage.jsx'
import ChartTooltip from '../../components/ChartTooltip.jsx'
import { fmtDate, fmtNum } from '../../lib/format.js'
import { useMasterData } from '../../lib/masterData.jsx'
import { vehicleTypeOptions } from './reportHelpers.js'

const C_MEMBER = 'var(--series-4)'
const C_VISITOR = 'var(--series-1)'

export default function MemberVisitorReport() {
  const { tenantOptions } = useMasterData()

  const chart = (rows) => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="day" tickFormatter={(d) => fmtDate(`${d}T00:00:00`)} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} minTickGap={24} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          cursor={{ fill: 'var(--surface-inset)' }}
          content={<ChartTooltip labelFormatter={(d) => fmtDate(`${d}T00:00:00`, { day: '2-digit', month: 'short', year: 'numeric' })} valueFormatter={(v) => `${fmtNum(v)} visits`} />}
        />
        <Bar dataKey="members" name="Members" stackId="v" fill={C_MEMBER} maxBarSize={22} />
        <Bar dataKey="visitors" name="Visitors" stackId="v" fill={C_VISITOR} radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  )

  return (
    <ReportPage
      reportKey="member-visitor"
      title="Dashboard Member Visitor"
      subtitle="Member &amp; visitor split, day by day"
      exportName="member-visitor-report"
      chart={chart}
      chartTitle="Daily member / visitor split"
      filters={[
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
        { id: 'search', label: 'Search license plate', type: 'text', placeholder: 'e.g. 1กข 1234', colSpan: 2 },
        { id: 'vehicleType', label: 'Vehicle type', type: 'select', options: vehicleTypeOptions },
        { id: 'tenantId', label: 'Tenant', type: 'select', options: tenantOptions },
      ]}
    />
  )
}
