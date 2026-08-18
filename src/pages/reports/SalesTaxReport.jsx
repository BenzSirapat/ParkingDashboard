import { useCallback } from 'react'
import ReportPage from '../../components/ReportPage.jsx'
import { TRANSACTIONS, siteShort } from '../../data/mockData.js'
import { fmtDateTime, fmtBaht2, fmtDuration } from '../../lib/format.js'
import { applyFilters, cardTypeOptions, vehicleClassOptions, paymentOptions } from './reportHelpers.js'

export default function SalesTaxReport() {
  const compute = useCallback((values) => {
    const rows = applyFilters(TRANSACTIONS, { ...values, status: 'exited' }, { dateField: 'exitTime' })
    return rows.slice(0, 500).map((t) => ({
      _key: t.id,
      site: siteShort(t.siteId),
      entry: fmtDateTime(t.entryTime),
      exit: t.exitTime ? fmtDateTime(t.exitTime) : '—',
      duration: fmtDuration(t.durationMin),
      cardNo: t.cardNo,
      plate: t.plate,
      invoice: `INV-${String(t.id).padStart(6, '0')}`,
      vat: fmtBaht2(t.vat),
      parking: fmtBaht2(t.parkingFee),
      total: fmtBaht2(t.total),
    }))
  }, [])

  return (
    <ReportPage
      compute={compute}
      title="Detailed Sales Tax Report"
      subtitle="VAT-inclusive parking revenue"
      exportName="detailed-sales-tax-report"
      filters={[
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
        { id: 'vehicleClass', label: 'Vehicle type', type: 'select', options: vehicleClassOptions },
        { id: 'cardType', label: 'Card type', type: 'select', options: cardTypeOptions },
        { id: 'payment', label: 'Payment method', type: 'select', options: paymentOptions },
        { id: 'cardNo', label: 'Card no.', type: 'text', placeholder: 'Search card no.' },
      ]}
      columns={[
        { key: 'entry', label: 'Entry' },
        { key: 'exit', label: 'Exit' },
        { key: 'duration', label: 'Duration' },
        { key: 'cardNo', label: 'Card No.' },
        { key: 'plate', label: 'License Plate', render: (r) => <strong>{r.plate}</strong> },
        { key: 'invoice', label: 'Tax Invoice' },
        { key: 'vat', label: 'VAT', align: 'right' },
        { key: 'parking', label: 'Parking Fee', align: 'right' },
        { key: 'total', label: 'Total', align: 'right' },
      ]}
    />
  )
}
