import { useCallback } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import ReportPage from '../../components/ReportPage.jsx'
import ChartTooltip from '../../components/ChartTooltip.jsx'
import { EmptyState } from '../../components/ui.jsx'
import { TRANSACTIONS, companyName, siteShort } from '../../data/mockData.js'
import { fmtDateTime, fmtNum, fmtHour, fmtBaht, fmtDuration } from '../../lib/format.js'
import { hourOf } from '../../lib/selectors.js'
import { applyFilters, companyOptions, stampOptions, cardTypeOptions } from './reportHelpers.js'

export default function DiscountReport() {
  const compute = useCallback((values) => {
    const rows = applyFilters(TRANSACTIONS.filter((t) => t.stampCode), values)
    return rows.slice(0, 500).map((t) => ({
      _key: t.id,
      site: siteShort(t.siteId),
      code: t.companyId.toUpperCase(),
      company: companyName(t.companyId),
      plate: t.plate,
      entry: fmtDateTime(t.entryTime),
      exit: t.exitTime ? fmtDateTime(t.exitTime) : '—',
      duration: fmtDuration(t.durationMin),
      stampCode: t.stampCode,
      companyPaid: fmtBaht(t.stampDiscount),
      contactPaid: fmtBaht(t.parkingFee),
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
          <Tooltip cursor={{ fill: 'var(--surface-inset)' }} content={<ChartTooltip labelFormatter={fmtHour} valueFormatter={(v) => `${fmtNum(v)} stamps`} />} />
          <Bar dataKey="count" name="Stamps" fill="var(--series-2)" radius={[5, 5, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ReportPage
      compute={compute}
      title="Discount Report"
      subtitle="Discount stamp validations"
      exportName="discount-report"
      chart={chart}
      chartTitle="Hourly stamp usage"
      filters={[
        { id: 'company', label: 'Tenant', type: 'select', options: companyOptions },
        { id: 'stamp', label: 'Stamp code', type: 'select', options: stampOptions },
        { id: 'cardType', label: 'Transaction type', type: 'select', options: cardTypeOptions },
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
      ]}
      columns={[
        { key: 'company', label: 'Company', render: (r) => <strong>{r.company}</strong> },
        { key: 'plate', label: 'License Plate' },
        { key: 'entry', label: 'Entry' },
        { key: 'exit', label: 'Exit' },
        { key: 'duration', label: 'Duration' },
        { key: 'stampCode', label: 'Stamp Code' },
        { key: 'companyPaid', label: 'Company Paid', align: 'right' },
        { key: 'contactPaid', label: 'Contact Paid', align: 'right' },
      ]}
    />
  )
}
