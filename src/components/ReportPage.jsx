import { useEffect, useMemo, useState } from 'react'
import { Panel, DataTable } from './ui.jsx'
import { IconSearch, IconPrinter, IconDownload } from './icons.jsx'
import { exportCsv, exportExcel, exportPdf } from '../lib/export.js'
import { useLang } from '../lib/i18n.jsx'
import { useSite, ALL_SITES } from '../lib/siteContext.jsx'
import { siteOptions } from '../pages/reports/reportHelpers.js'
import '../pages/dashboard.css'

export function isoDate(d = new Date()) {
  const x = new Date(d)
  return x.toISOString().slice(0, 10)
}
export function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return isoDate(d)
}

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
 * Config-driven report page: filter bar + actions + optional chart + table.
 * `compute(values)` returns the filtered rows (raw primitives) used by both
 * the on-screen table and the CSV/Excel/PDF exports.
 */
export default function ReportPage({
  title, subtitle, filters = [], columns, compute,
  chart, chartTitle, exportName = 'report', exportTitle,
}) {
  const { t } = useLang()
  const { siteId, setSiteId } = useSite()

  // Every report gets a site filter first; "All Sites" consolidates them.
  const allFilters = useMemo(
    () => [{ id: 'site', label: 'Site', type: 'select', options: siteOptions, colSpan: 2 }, ...filters],
    [filters]
  )

  const [values, setValues] = useState(() => {
    const v = { site: siteId }
    for (const f of filters) v[f.id] = defaultValue(f)
    return v
  })
  const [applied, setApplied] = useState(values)

  // Follow the top-bar switcher, and keep the report showing what it says.
  useEffect(() => {
    setValues((v) => (v.site === siteId ? v : { ...v, site: siteId }))
    setApplied((a) => (a.site === siteId ? a : { ...a, site: siteId }))
  }, [siteId])

  const rows = useMemo(() => compute(applied), [applied, compute])

  // Selecting a site inside the report drives the whole app, so the top bar,
  // the dashboards and the next report all stay on the same site.
  const set = (id, val) => {
    if (id === 'site') setSiteId(val)
    setValues((v) => ({ ...v, [id]: val }))
  }
  const onSearch = () => setApplied({ ...values })

  // Show which site a row came from only when several are mixed together.
  const showSite = applied.site === ALL_SITES && rows.length > 0 && rows[0].site !== undefined
  const tableColumns = showSite ? [{ key: 'site', label: 'Site' }, ...columns] : columns
  const exportCols = tableColumns.map((c) => ({ key: c.key, label: c.label }))

  return (
    <>
      <Panel className="report-card">
        <h2 className="report-title">{t(title)}</h2>
        {subtitle && <p className="report-title-sub">{t(subtitle)}</p>}

        <div className="filter-grid">
          {allFilters.map((f) => (
            <div className="field" key={f.id} style={f.colSpan ? { gridColumn: `span ${f.colSpan}` } : undefined}>
              <label>{t(f.label)}</label>
              <FilterControl f={f} value={values[f.id]} onChange={(val) => set(f.id, val)} t={t} />
            </div>
          ))}
        </div>

        <div className="filter-actions">
          <button className="btn primary" onClick={onSearch}><IconSearch width={16} height={16} /> {t('Search')}</button>
          <button className="btn" onClick={() => exportPdf(exportCols, rows, exportName, exportTitle || title)}><IconPrinter width={16} height={16} /> {t('Export PDF')}</button>
          <button className="btn" onClick={() => exportCsv(exportCols, rows, exportName)}><IconDownload width={16} height={16} /> {t('CSV')}</button>
          <button className="btn" onClick={() => exportExcel(exportCols, rows, exportName, 'Report')}><IconDownload width={16} height={16} /> {t('Excel')}</button>
        </div>
      </Panel>

      {chart && (
        <Panel title={chartTitle} className="report-card">
          {chart(rows, applied)}
        </Panel>
      )}

      <Panel title="Results" sub={`${rows.length} ${t(rows.length === 1 ? 'record' : 'records')}`}>
        <DataTable columns={tableColumns} rows={rows} maxHeight={520} empty="No data — adjust filters and search again." />
      </Panel>
    </>
  )
}

function FilterControl({ f, value, onChange, t }) {
  if (f.type === 'select') {
    return (
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)} disabled={f.disabled}>
        {f.options.map((o) => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
      </select>
    )
  }
  if (f.type === 'date') {
    return <input type="date" className="input" value={value} onChange={(e) => onChange(e.target.value)} />
  }
  if (f.type === 'daterange') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="date" className="input" style={{ flex: 1 }} value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} />
        <span className="muted">→</span>
        <input type="date" className="input" style={{ flex: 1 }} value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} />
      </div>
    )
  }
  return <input type="text" className="input" placeholder={f.placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
}
