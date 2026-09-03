import ReportPage from '../../components/ReportPage.jsx'
import { cardTypeOptions, vehicleTypeOptions } from './reportHelpers.js'

export default function SalesTaxReport() {
  return (
    <ReportPage
      reportKey="sales-tax"
      title="Detailed Sales Tax Report"
      subtitle="Issued invoices with the payment method actually taken"
      exportName="detailed-sales-tax-report"
      filters={[
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
        { id: 'vehicleType', label: 'Vehicle type', type: 'select', options: vehicleTypeOptions },
        { id: 'type', label: 'Card type', type: 'select', options: cardTypeOptions },
        { id: 'search', label: 'Search', type: 'text', placeholder: 'Plate, card or invoice no.', colSpan: 2 },
      ]}
    />
  )
}
