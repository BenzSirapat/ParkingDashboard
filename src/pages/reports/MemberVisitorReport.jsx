import { useCallback } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import ReportPage from '../../components/ReportPage.jsx'
import ChartTooltip from '../../components/ChartTooltip.jsx'
import { EmptyState } from '../../components/ui.jsx'
import { TRANSACTIONS, stampInfo, siteShort } from '../../data/mockData.js'
import { fmtDateTime, fmtNum, fmtHour, fmtBaht } from '../../lib/format.js'
import { hourOf } from '../../lib/selectors.js'
import { useLang } from '../../lib/i18n.jsx'
import { applyFilters, cardTypeOptions, vehicleClassOptions, companyOptions } from './reportHelpers.js'

export default function MemberVisitorReport() {
  const { t: tr } = useLang()
  const compute = useCallback((values) => {
    const rows = applyFilters(TRANSACTIONS, values)
    return rows.slice(0, 500).map((t) => ({
      _key: t.id,
      site: siteShort(t.siteId),
      cardNo: t.cardNo,
      plate: t.plate,
      type: t.type,
      entry: fmtDateTime(t.entryTime),
      exit: t.exitTime ? fmtDateTime(t.exitTime) : '—',
      duration: fmtNum(t.durationMin),
      stampRate: t.stampCode ? fmtBaht(stampInfo(t.stampCode)?.rate || 0) : '—',
      _hour: hourOf(t.entryTime),
    }))
  }, [])

  const chart = (rows) => {
    if (!rows.length) return <EmptyState label="No data for chart" />
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }))
    for (const r of rows) buckets[r._hour].count++
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={buckets} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="hour" tickFormatter={fmtHour} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} interval={1} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={40} />
          <Tooltip cursor={{ fill: 'var(--surface-inset)' }} content={<ChartTooltip labelFormatter={fmtHour} valueFormatter={(v) => `${fmtNum(v)} visits`} />} />
          <Bar dataKey="count" name="Visits" fill="var(--series-1)" radius={[5, 5, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ReportPage
      compute={compute}
      title="Dashboard Member Visitor"
      subtitle="Member &amp; visitor entry log"
      exportName="member-visitor-report"
      chart={chart}
      chartTitle="Hourly statistics"
      filters={[
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
        { id: 'cardType', label: 'Type', type: 'select', options: cardTypeOptions },
        { id: 'vehicleClass', label: 'Vehicle type', type: 'select', options: vehicleClassOptions },
        { id: 'company', label: 'Tenant', type: 'select', options: companyOptions },
        { id: 'cardNo', label: 'Search card no.', type: 'text', placeholder: 'Card no.' },
      ]}
      columns={[
        { key: 'cardNo', label: 'Member / Card No.', render: (r) => <strong>{r.cardNo}</strong> },
        { key: 'plate', label: 'License Plate' },
        { key: 'type', label: 'Type', render: (r) => <span className={`pill ${r.type}`}>{tr(r.type)}</span> },
        { key: 'entry', label: 'Entry' },
        { key: 'exit', label: 'Exit' },
        { key: 'duration', label: 'Duration (min)', align: 'right' },
        { key: 'stampRate', label: 'Stamp Rate', align: 'right' },
      ]}
    />
  )
}
