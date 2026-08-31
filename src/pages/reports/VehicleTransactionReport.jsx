import ReportPage from '../../components/ReportPage.jsx'
import { cardTypeOptions, statusOptions, vehicleTypeOptions } from './reportHelpers.js'

export default function VehicleTransactionReport() {
  return (
    <ReportPage
      reportKey="vehicle-transaction"
      title="Vehicle Transaction Report"
      subtitle="Vehicle entry / exit records"
      exportName="vehicle-transaction-report"
      filters={[
        { id: 'search', label: 'Search', type: 'text', placeholder: 'Plate, card or invoice no.', colSpan: 2 },
        { id: 'range', label: 'Entry date range', type: 'daterange', colSpan: 2 },
        { id: 'type', label: 'Card type', type: 'select', options: cardTypeOptions },
        { id: 'status', label: 'Status', type: 'select', options: statusOptions },
        { id: 'vehicleType', label: 'Vehicle type', type: 'select', options: vehicleTypeOptions },
      ]}
    />
  )
}
