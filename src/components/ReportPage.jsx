import { useCallback, useMemo, useState } from 'react'
import { Panel, DataTable, EmptyState } from './ui.jsx'
import { AsyncState } from './AsyncState.jsx'
import { IconSearch, IconPrinter, IconDownload } from './icons.jsx'
import { reportsApi } from '../lib/api.js'
import { useApi } from '../lib/useApi.js'
import { toApiParams } from '../pages/reports/reportHelpers.js'
import { formatCell, plainCell } from '../lib/reportFormat.js'
import { exportPdf } from '../lib/export.js'
import { useLang } from '../lib/i18n.jsx'
import { useSite } from '../lib/siteContext.jsx'
import { daysAgo, isoDate } from '../lib/dateRange.js'
import '../pages/dashboard.css'

function defaultValue(f) {
  if (f.default !== undefined) return f.default
  switch (f.type) {
    case 'daterange': return { from: daysAgo(6), to: isoDate() }
    case 'date': return isoDate()
    case 'select': return f.options?.[0]?.value ?? 'all'
    default: return ''
  }
}

/**
 * Config-driven report page.
 *
 * The server owns each report: `GET /api/reports/{key}` returns the columns,
 * the rows and the footer totals, and `…/export` renders the CSV / Excel file.
 * This component only supplies the filter bar, an optional chart and the
 * "Export PDF" print view (the browser's print dialog, no extra dependency).
 */
export default function ReportPage({
  reportKey, title, subtitle, filters = [], chart, chartTitle, exportName,
}) {
  const { t } = useLang()
  const { short: siteShort } = useSite()

  const [values, setValues] = useState(() => {
    const v = {}
    for (const f of filters) v[f.id] = defaultValue(f)
    return v
  })
  const [applied, setApplied] = useState(values)

  const params = useMemo(() => toApiParams(applied), [applied])
  const query = useApi(
    (signal) => reportsApi.run(reportKey, params, signal),
    [reportKey, JSON.stringify(params)]
  )

  const set = (id, val) => setValues((v) => ({ ...v, [id]: val }))
  const onSearch = () => setApplied({ ...values })

  const report = query.data
  const columns = report?.columns ?? []
  const rows = report?.rows ?? []

  // The server sends raw values with a type per column; render them here so
  // the table, the print view and the chart all read the same numbers.
  const tableColumns = useMemo(
    () => columns.map((c) => ({
      key: c.key,
      label: c.label,
      align: c.type === 'text' ? undefined : 'right',
      render: (r) => formatCell(r[c.key], c.type),
    })),
    [columns]
  )

  const tableRows = useMemo(
    () => rows.map((r, i) => ({ ...r, _key: r.id ?? `${i}` })),
    [rows]
  )

  const summaryRow = useMemo(() => {
    const summary = report?.summary
    if (!summary || !Object.keys(summary).length) return null
    return (
      <>
        {columns.map((c, i) => (
          <td key={c.key} className={c.type === 'text' ? '' : 'num tnum'}>
            {summary[c.key] !== undefined && summary[c.key] !== null
              ? <strong>{formatCell(summary[c.key], c.type)}</strong>
              : (i === 0 ? <strong>{t('Total')}</strong> : '')}
          </td>
        ))}
      </>
    )
  }, [report, columns, t])

  const printPdf = useCallback(() => {
    const cols = columns.map((c) => ({ key: c.key, label: c.label }))
    const flat = rows.map((r) => {
      const o = {}
      for (const c of columns) o[c.key] = plainCell(r[c.key], c.type)
      return o
    })
    exportPdf(cols, flat, exportName || reportKey, `${report?.title || title} · ${siteShort}`)
  }, [columns, rows, exportName, reportKey, report, title, siteShort])

  const [downloading, setDownloading] = useState(null)
  const download = async (format) => {
    setDownloading(format)
    try {
      await reportsApi.download(reportKey, params, format)
    } catch {
      /* the button returns to idle; the on-screen table still shows the data */
    } finally {
      setDownloading(null)
    }
  }

  const busy = query.loading || !!downloading
  const noRows = !query.loading && !query.error && rows.length === 0

  return (
    <>
      <Panel className="report-card">
        <h2 className="report-title">{t(title)}</h2>
        {subtitle && <p className="report-title-sub">{t(subtitle)}</p>}

        <div className="filter-grid">
          {filters.map((f) => (
            <div className="field" key={f.id} style={f.colSpan ? { gridColumn: `span ${f.colSpan}` } : undefined}>
              <label>{t(f.label)}</label>
              <FilterControl f={f} value={values[f.id]} onChange={(val) => set(f.id, val)} t={t} />
            </div>
          ))}
        </div>

        <div className="filter-actions">
          <button className="btn primary" onClick={onSearch} disabled={query.loading}>
            <IconSearch width={16} height={16} /> {query.loading ? t('Searching…') : t('Search')}
          </button>
          <button className="btn" onClick={printPdf} disabled={busy || noRows}>
            <IconPrinter width={16} height={16} /> {t('Export PDF')}
          </button>
          <button className="btn" onClick={() => download('csv')} disabled={busy}>
            <IconDownload width={16} height={16} /> {downloading === 'csv' ? t('Preparing…') : t('CSV')}
          </button>
          <button className="btn" onClick={() => download('xlsx')} disabled={busy}>
            <IconDownload width={16} height={16} /> {downloading === 'xlsx' ? t('Preparing…') : t('Excel')}
          </button>
        </div>
      </Panel>

      {chart && (
        <Panel title={chartTitle} className="report-card">
          <AsyncState query={query} height={280}>
            {() => (rows.length ? chart(rows, applied) : <EmptyState label="No data for chart" />)}
          </AsyncState>
        </Panel>
      )}

      <Panel
        title="Results"
        sub={query.loading ? 'Loading…' : `${rows.length} ${t(rows.length === 1 ? 'record' : 'records')}`}
      >
        <AsyncState query={query} height={320}>
          {() => (
            <DataTable
              columns={tableColumns}
              rows={tableRows}
              footer={summaryRow}
              maxHeight={520}
              empty="No data — adjust filters and search again."
            />
          )}
        </AsyncState>
      </Panel>
    </>
  )
}

function FilterControl({ f, value, onChange, t }) {
  if (f.type === 'select') {
    return (
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)} disabled={f.disabled}>
        {(f.options ?? []).map((o) => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
      </select>
    )
  }
  if (f.type === 'date') {
    return <input type="date" className="input" value={value} onChange={(e) => onChange(e.target.value)} />
  }
  if (f.type === 'daterange') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="date" className="input" style={{ flex: 1 }} value={value.from} max={value.to} onChange={(e) => onChange({ ...value, from: e.target.value })} />
        <span className="muted">→</span>
        <input type="date" className="input" style={{ flex: 1 }} value={value.to} min={value.from} onChange={(e) => onChange({ ...value, to: e.target.value })} />
      </div>
    )
  }
  return <input type="text" className="input" placeholder={f.placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
}
