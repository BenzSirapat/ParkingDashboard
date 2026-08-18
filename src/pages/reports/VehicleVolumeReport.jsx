import { useCallback } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import ReportPage from '../../components/ReportPage.jsx'
import ChartTooltip from '../../components/ChartTooltip.jsx'
import { EmptyState } from '../../components/ui.jsx'
import { TRANSACTIONS } from '../../data/mockData.js'
import { fmtNum, fmtHour } from '../../lib/format.js'
import { hourOf } from '../../lib/selectors.js'
import { applyFilters, vehicleClassOptions } from './reportHelpers.js'

export default function VehicleVolumeReport() {
  const compute = useCallback((values) => {
    const rows = applyFilters(TRANSACTIONS, values)
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      hour: h, regIn: 0, tmpIn: 0, totalIn: 0, totalOut: 0,
    }))
    for (const t of rows) {
      const b = buckets[hourOf(t.entryTime)]
      b.totalIn++
      if (t.vehicleClass === 'regular') b.regIn++
      else b.tmpIn++
      if (t.exitTime) buckets[hourOf(t.exitTime)].totalOut++
    }
    return buckets.map((b) => ({
      _key: b.hour,
      period: `${fmtHour(b.hour)} – ${String(b.hour).padStart(2, '0')}:59`,
      regIn: fmtNum(b.regIn),
      tmpIn: fmtNum(b.tmpIn),
      totalIn: fmtNum(b.totalIn),
      totalOut: fmtNum(b.totalOut),
      net: b.totalIn - b.totalOut,
      _totalIn: b.totalIn,
      _totalOut: b.totalOut,
    }))
  }, [])

  const chart = (rows) =>
    rows.some((r) => r._totalIn || r._totalOut) ? (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={rows} margin={{ top: 6, right: 8, left: -8, bottom: 0 }} barGap={2}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="_key" tickFormatter={fmtHour} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} interval={1} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={40} />
          <Tooltip cursor={{ fill: 'var(--surface-inset)' }} content={<ChartTooltip valueFormatter={(v) => `${fmtNum(v)} cars`} />} />
          <Bar dataKey="_totalIn" name="Vehicles In" fill="var(--good)" radius={[4, 4, 0, 0]} maxBarSize={14} />
          <Bar dataKey="_totalOut" name="Vehicles Out" fill="var(--danger)" radius={[4, 4, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <EmptyState label="No data for chart" />
    )

  return (
    <ReportPage
      compute={compute}
      title="Vehicle Volume Time Period"
      subtitle="In / out by hour of day"
      exportName="vehicle-volume-time-period"
      chart={chart}
      chartTitle="Volume by time period"
      filters={[
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
        { id: 'vehicleClass', label: 'Vehicle type', type: 'select', options: vehicleClassOptions },
      ]}
      columns={[
        { key: 'period', label: 'Time Period', render: (r) => <strong>{r.period}</strong> },
        { key: 'regIn', label: 'Regular In', align: 'right' },
        { key: 'tmpIn', label: 'Temp In', align: 'right' },
        { key: 'totalIn', label: 'Total In', align: 'right' },
        { key: 'totalOut', label: 'Total Out', align: 'right' },
        { key: 'net', label: 'In − Out', align: 'right', render: (r) => (r.net >= 0 ? `+${r.net}` : r.net) },
      ]}
    />
  )
}
