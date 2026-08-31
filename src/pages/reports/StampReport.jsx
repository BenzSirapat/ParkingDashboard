import ReportPage from '../../components/ReportPage.jsx'
import { useMasterData } from '../../lib/masterData.jsx'
import { cardTypeOptions } from './reportHelpers.js'

export default function StampReport() {
  const { tenantOptions, stampOptions } = useMasterData()

  return (
    <ReportPage
      reportKey="stamp"
      title="Stamp Report"
      subtitle="Stamped transactions with tenant and visitor shares"
      exportName="stamp-report"
      filters={[
        { id: 'tenantId', label: 'Tenant', type: 'select', options: tenantOptions, colSpan: 2 },
        { id: 'stampCode', label: 'Stamp code', type: 'select', options: stampOptions, colSpan: 2 },
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
        { id: 'type', label: 'Transaction type', type: 'select', options: cardTypeOptions },
      ]}
    />
  )
}
