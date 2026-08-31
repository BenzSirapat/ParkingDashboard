import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import ReportPage from '../../components/ReportPage.jsx'
import ChartTooltip from '../../components/ChartTooltip.jsx'
import { fmtNum } from '../../lib/format.js'
import { cardTypeOptions, vehicleTypeOptions } from './reportHelpers.js'

export default function VehicleVolumeReport() {
  const chart = (rows) => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} margin={{ top: 6, right: 8, left: -8, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} interval={1} tickFormatter={(p) => String(p).slice(0, 5)} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={40} />
        <Tooltip cursor={{ fill: 'var(--surface-inset)' }} content={<ChartTooltip valueFormatter={(v) => `${fmtNum(v)} cars`} />} />
        <Bar dataKey="in" name="Vehicles In" fill="var(--good)" radius={[4, 4, 0, 0]} maxBarSize={14} />
        <Bar dataKey="out" name="Vehicles Out" fill="var(--danger)" radius={[4, 4, 0, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  )

  return (
    <ReportPage
      reportKey="vehicle-volume"
      title="Vehicle Volume Time Period"
      subtitle="In / out by hour of day"
      exportName="vehicle-volume-time-period"
      chart={chart}
      chartTitle="Volume by time period"
      filters={[
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
        { id: 'vehicleType', label: 'Vehicle type', type: 'select', options: vehicleTypeOptions },
        { id: 'type', label: 'Card type', type: 'select', options: cardTypeOptions },
      ]}
    />
  )
}
