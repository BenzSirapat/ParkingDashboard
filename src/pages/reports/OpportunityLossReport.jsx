import { useCallback } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import ReportPage from '../../components/ReportPage.jsx'
import ChartTooltip from '../../components/ChartTooltip.jsx'
import { EmptyState } from '../../components/ui.jsx'
import { TRANSACTIONS, companyShort } from '../../data/mockData.js'
import { opportunityByCompany } from '../../lib/selectors.js'
import { fmtBaht, fmtNum } from '../../lib/format.js'
import { applyFilters, companyOptions, stampOptions } from './reportHelpers.js'

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)', 'var(--series-7)']

export default function OpportunityLossReport() {
  const compute = useCallback((values) => {
    const filtered = applyFilters(TRANSACTIONS.filter((t) => t.stampCode), values)
    return opportunityByCompany(filtered).map((c) => ({
      _key: c.companyId,
      code: c.companyId.toUpperCase(),
      company: c.name,
      short: companyShort(c.companyId),
      vehicles: c.vehicles,
      tenantPaid: Math.round(c.tenantPaid),
      visitorPaid: Math.round(c.visitorPaid),
      loss: Math.round(c.loss),
      vehiclesText: fmtNum(c.vehicles),
      tenantText: fmtBaht(c.tenantPaid),
      visitorText: fmtBaht(c.visitorPaid),
      lossText: fmtBaht(c.loss),
    }))
  }, [])

  const chart = (rows) =>
    rows.length ? (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={rows.slice(0, 8)} margin={{ top: 6, right: 8, left: 0, bottom: 46 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="short" tick={{ fontSize: 10.5, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} angle={-30} textAnchor="end" interval={0} height={64} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => fmtNum(v)} />
          <Tooltip cursor={{ fill: 'var(--surface-inset)' }} content={<ChartTooltip valueFormatter={(v) => fmtBaht(v)} />} />
          <Bar dataKey="loss" name="Opportunity Loss" radius={[5, 5, 0, 0]} maxBarSize={40}>
            {rows.slice(0, 8).map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <EmptyState label="No data for chart" />
    )

  return (
    <ReportPage
      compute={compute}
      title="Opportunity Loss Summary"
      subtitle="Loss from stamp validations"
      exportName="opportunity-loss-summary"
      chart={chart}
      chartTitle="Bar comparison by company"
      filters={[
        { id: 'company', label: 'Tenant', type: 'select', options: companyOptions, colSpan: 2 },
        { id: 'stamp', label: 'Stamp code', type: 'select', options: stampOptions, colSpan: 2 },
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
      ]}
      columns={[
        { key: 'code', label: 'Company Code' },
        { key: 'company', label: 'Company', render: (r) => <strong>{r.company}</strong> },
        { key: 'vehiclesText', label: 'Vehicles', align: 'right' },
        { key: 'tenantText', label: 'Tenant Paid', align: 'right' },
        { key: 'visitorText', label: 'Visitor Paid', align: 'right' },
        { key: 'lossText', label: 'Opportunity Loss', align: 'right' },
      ]}
    />
  )
}
