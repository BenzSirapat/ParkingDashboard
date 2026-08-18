import { useMemo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { SITES } from '../data/mockData.js'
import { siteSummary, siteTotals, dailyBySite } from '../lib/selectors.js'
import { fmtBaht, fmtBaht2, fmtNum, fmtPct, fmtDate } from '../lib/format.js'
import { useSite } from '../lib/siteContext.jsx'
import { useLang } from '../lib/i18n.jsx'
import { Panel, DataTable, EmptyState, ProgressRow } from './ui.jsx'
import ChartTooltip from './ChartTooltip.jsx'

export const SITE_COLORS = ['var(--series-1)', 'var(--series-4)', 'var(--series-3)', 'var(--series-2)', 'var(--series-5)', 'var(--series-6)']
export const siteColor = (siteId) => SITE_COLORS[SITES.findIndex((s) => s.id === siteId) % SITE_COLORS.length]

/** Metric registry — how each per-site number is labelled and formatted. */
const METRICS = {
  revenue: { label: 'Revenue', fmt: fmtBaht },
  vat: { label: 'VAT', fmt: fmtBaht },
  avgTicket: { label: 'Avg Ticket', fmt: fmtBaht2 },
  transactions: { label: 'Transactions', fmt: fmtNum },
  entries: { label: 'Entries', fmt: fmtNum },
  exits: { label: 'Exits', fmt: fmtNum },
  inside: { label: 'Inside', fmt: fmtNum },
  peakHour: { label: 'Peak Hour', fmt: (v) => v },
  peakAccumulated: { label: 'Peak Accumulated', fmt: fmtNum },
  stamps: { label: 'Stamps', fmt: fmtNum },
  tenantPaid: { label: 'Tenant Paid', fmt: fmtBaht },
  visitorPaid: { label: 'Visitor Paid', fmt: fmtBaht },
  loss: { label: 'Opportunity Loss', fmt: fmtBaht },
  members: { label: 'Members', fmt: fmtNum },
  visitors: { label: 'Visitors', fmt: fmtNum },
  shareRevenue: { label: 'Share of Revenue', fmt: fmtPct },
  shareEntries: { label: 'Share of Entries', fmt: fmtPct },
}

/**
 * Site-by-site comparison behind the consolidated ("All Sites") roll-up:
 * a share bar per site, a metric table with a grand-total row, and an optional
 * stacked daily chart whose bar height is the all-sites total.
 *
 * Renders nothing when a single site is selected — the page itself is that site.
 * Clicking a row drills the whole dashboard into that site.
 */
export default function SiteBreakdown({
  txns,
  metrics = ['revenue', 'transactions', 'avgTicket'],
  shareBy = 'revenue',
  chartMetric,
  title = 'Site Comparison',
  sub = 'Every site in the consolidated total',
}) {
  const { isAll, setSiteId } = useSite()
  const { t } = useLang()

  const rows = useMemo(() => (isAll ? siteSummary(txns) : []), [txns, isAll])
  const totals = useMemo(() => siteTotals(rows), [rows])
  const daily = useMemo(
    () => (isAll && chartMetric ? dailyBySite(txns, chartMetric) : []),
    [txns, isAll, chartMetric]
  )

  if (!isAll) return null

  const shareKey = shareBy === 'entries' ? 'shareEntries' : 'shareRevenue'
  const chartFmt = chartMetric === 'revenue' ? fmtBaht : fmtNum
  const activeSites = SITES.filter((s) => rows.some((r) => r.siteId === s.id))

  const columns = [
    {
      key: 'name',
      label: 'Site',
      render: (r) => (
        <span className="rank-cell">
          <span className="rank-dot" style={{ background: siteColor(r.siteId) }} />
          <strong>{r.name}</strong>
        </span>
      ),
    },
    ...metrics.map((key) => ({
      key,
      label: METRICS[key]?.label ?? key,
      align: 'right',
      render: (r) => (METRICS[key] ? METRICS[key].fmt(r[key]) : r[key]),
    })),
    {
      key: shareKey,
      label: METRICS[shareKey].label,
      align: 'right',
      render: (r) => fmtPct(r[shareKey]),
    },
  ]

  const footer = (
    <>
      <th style={{ textAlign: 'left' }}>{t('All Sites')}</th>
      {metrics.map((key) => (
        <th key={key} className="num tnum">
          {METRICS[key] && typeof totals[key] === 'number' ? METRICS[key].fmt(totals[key]) : '—'}
        </th>
      ))}
      <th className="num tnum">{fmtPct(100)}</th>
    </>
  )

  return (
    <>
      <Panel title={title} sub={sub}>
        {rows.length ? (
          <>
            <div className="prog-list" style={{ marginBottom: 18 }}>
              {rows.map((r) => (
                <ProgressRow
                  key={r.siteId}
                  label={r.name}
                  value={shareBy === 'entries' ? fmtNum(r.entries) : fmtBaht(r.revenue)}
                  pct={r[shareKey]}
                  color={siteColor(r.siteId)}
                  sub={<><span>{r.area}</span><span>{fmtPct(r[shareKey])} {t('of total')}</span></>}
                />
              ))}
            </div>
            <DataTable columns={columns} rows={rows} footer={footer} onRowClick={(r) => setSiteId(r.siteId)} />
            <p className="panel-sub" style={{ marginTop: 10 }}>
              {t('Tip: pick a single site in the top bar to drill down.')}
            </p>
          </>
        ) : (
          <EmptyState label="No data" />
        )}
      </Panel>

      {chartMetric && (
        <Panel
          title="Daily Trend by Site"
          sub="Stacked — bar height is the all-sites total"
          right={
            <div className="legend">
              {activeSites.map((s) => (
                <span key={s.id}><i style={{ background: siteColor(s.id) }} /> {s.short}</span>
              ))}
            </div>
          }
        >
          {daily.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={daily} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={(d) => fmtDate(`${d}T00:00:00`)}
                  tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-strong)' }}
                  minTickGap={24}
                />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickLine={false} axisLine={false} width={58} tickFormatter={(v) => fmtNum(v)} />
                <Tooltip
                  cursor={{ fill: 'var(--surface-inset)' }}
                  content={<ChartTooltip labelFormatter={(d) => fmtDate(`${d}T00:00:00`, { day: '2-digit', month: 'short', year: 'numeric' })} valueFormatter={(v) => chartFmt(v)} />}
                />
                {activeSites.map((s) => (
                  <Bar key={s.id} dataKey={s.id} name={s.short} stackId="site" fill={siteColor(s.id)} maxBarSize={30} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label="No data for chart" />
          )}
        </Panel>
      )}
    </>
  )
}
