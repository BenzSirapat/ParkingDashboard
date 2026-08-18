import { useCallback } from 'react'
import ReportPage from '../../components/ReportPage.jsx'
import { TRANSACTIONS, siteShort } from '../../data/mockData.js'
import { fmtDateTime, fmtBaht2, fmtDuration } from '../../lib/format.js'
import { useLang } from '../../lib/i18n.jsx'
import { applyFilters, cardTypeOptions, statusOptions, paymentOptions } from './reportHelpers.js'

export default function VehicleTransactionReport() {
  const { t } = useLang()
  const compute = useCallback((values) => {
    const rows = applyFilters(TRANSACTIONS, values)
    return rows.slice(0, 500).map((t) => ({
      _key: t.id,
      site: siteShort(t.siteId),
      entry: fmtDateTime(t.entryTime),
      exit: t.exitTime ? fmtDateTime(t.exitTime) : '—',
      duration: fmtDuration(t.durationMin),
      cardNo: t.cardNo,
      plate: t.plate,
      type: t.type,
      payment: t.payment || '—',
      total: fmtBaht2(t.total),
      status: t.status,
    }))
  }, [])

  return (
    <ReportPage
      compute={compute}
      title="Vehicle Transaction Report"
      subtitle="Vehicle entry / exit records"
      exportName="vehicle-transaction-report"
      filters={[
        { id: 'plate', label: 'License plate', type: 'text', placeholder: 'Search plate' },
        { id: 'cardNo', label: 'Card no.', type: 'text', placeholder: 'Search card no.' },
        { id: 'range', label: 'Entry date range', type: 'daterange', colSpan: 2 },
        { id: 'cardType', label: 'Card type', type: 'select', options: cardTypeOptions },
        { id: 'status', label: 'Status', type: 'select', options: statusOptions },
        { id: 'payment', label: 'Pay by', type: 'select', options: paymentOptions },
      ]}
      columns={[
        { key: 'entry', label: 'Entry' },
        { key: 'exit', label: 'Exit' },
        { key: 'duration', label: 'Duration' },
        { key: 'cardNo', label: 'Card No.' },
        { key: 'plate', label: 'License Plate', render: (r) => <strong>{r.plate}</strong> },
        { key: 'type', label: 'Type', render: (r) => <span className={`pill ${r.type}`}>{t(r.type)}</span> },
        { key: 'payment', label: 'Payment' },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'status', label: 'Status', render: (r) => <span className={`pill ${r.status === 'exited' ? 'ok' : 'inside'}`}>{t(r.status === 'exited' ? 'Exited' : 'Inside')}</span> },
      ]}
    />
  )
}
