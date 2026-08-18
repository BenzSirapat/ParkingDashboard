import { useCallback } from 'react'
import ReportPage from '../../components/ReportPage.jsx'
import { TRANSACTIONS } from '../../data/mockData.js'
import { fmtNum, fmtPct, fmtDate } from '../../lib/format.js'
import { applyFilters } from './reportHelpers.js'

// Deterministic per-day "sensor read failure" rate (2–6%).
function failRate(dayKey) {
  let h = 0
  for (let i = 0; i < dayKey.length; i++) h = (h * 31 + dayKey.charCodeAt(i)) & 0xffff
  return 0.02 + (h % 40) / 1000
}

export default function LicensePlateReport() {
  const compute = useCallback((values) => {
    const rows = applyFilters(TRANSACTIONS, values)
    const byDay = new Map()
    for (const t of rows) {
      const key = t.entryTime.slice(0, 10)
      byDay.set(key, (byDay.get(key) || 0) + 1)
    }
    return [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([day, total]) => {
        const fr = failRate(day)
        const fail = Math.round(total * fr)
        const pass = total - fail
        return {
          _key: day,
          date: fmtDate(day + 'T00:00:00', { day: '2-digit', month: 'short', year: 'numeric' }),
          total: fmtNum(total),
          pass: fmtNum(pass),
          fail: fmtNum(fail),
          passPct: fmtPct((pass / total) * 100),
          failPct: fmtPct((fail / total) * 100),
        }
      })
  }, [])

  return (
    <ReportPage
      compute={compute}
      title="License Plate Reading Issue"
      subtitle="Daily LPR accuracy"
      exportName="license-plate-reading-issue"
      filters={[
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
      ]}
      columns={[
        { key: 'date', label: 'Date', render: (r) => <strong>{r.date}</strong> },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'pass', label: 'Pass', align: 'right' },
        { key: 'fail', label: 'Fail', align: 'right' },
        { key: 'passPct', label: 'Pass %', align: 'right' },
        { key: 'failPct', label: 'Fail %', align: 'right' },
      ]}
    />
  )
}
