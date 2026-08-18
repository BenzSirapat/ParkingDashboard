import { useCallback } from 'react'
import ReportPage from '../../components/ReportPage.jsx'
import { TRANSACTIONS, companyName, stampInfo } from '../../data/mockData.js'
import { fmtBaht, fmtNum } from '../../lib/format.js'
import { applyFilters, companyOptions, stampOptions } from './reportHelpers.js'

export default function StampReport() {
  const compute = useCallback((values) => {
    const rows = applyFilters(TRANSACTIONS.filter((t) => t.stampCode), values)
    const map = new Map()
    for (const t of rows) {
      const key = `${t.companyId}|${t.stampCode}`
      if (!map.has(key)) {
        map.set(key, {
          _key: key,
          code: t.stampCode,
          detail: stampInfo(t.stampCode)?.label || '—',
          company: companyName(t.companyId),
          vehicleClass: t.vehicleClass,
          count: 0,
          fees: 0,
        })
      }
      const row = map.get(key)
      row.count++
      row.fees += t.stampDiscount
    }
    return [...map.values()]
      .sort((a, b) => b.count - a.count)
      .map((r) => ({ ...r, countText: fmtNum(r.count), feesText: fmtBaht(r.fees) }))
  }, [])

  return (
    <ReportPage
      compute={compute}
      title="Stamp Report"
      subtitle="Validation usage by company &amp; code"
      exportName="stamp-report"
      filters={[
        { id: 'company', label: 'Tenant', type: 'select', options: companyOptions, colSpan: 2 },
        { id: 'stamp', label: 'Stamp code', type: 'select', options: stampOptions, colSpan: 2 },
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
      ]}
      columns={[
        { key: 'code', label: 'Stamp Code', render: (r) => <strong>{r.code}</strong> },
        { key: 'detail', label: 'Description' },
        { key: 'company', label: 'Company' },
        { key: 'vehicleClass', label: 'Vehicle Type' },
        { key: 'countText', label: 'Stamps', align: 'right' },
        { key: 'feesText', label: 'Fees', align: 'right' },
      ]}
    />
  )
}
