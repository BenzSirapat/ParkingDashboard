import ReportPage from '../../components/ReportPage.jsx'

/**
 * Manual / emergency barrier opens from dbo.Pkopengateemergency — the audit
 * trail behind the Emergency Barrier page, filterable and exportable.
 */
export default function EmergencyBarrierReport() {
  return (
    <ReportPage
      reportKey="emergency-barrier"
      title="Emergency Barrier Report"
      subtitle="Manual gate opens with the operator, the reason and the outcome"
      exportName="emergency-barrier"
      filters={[
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
        { id: 'search', label: 'Search', type: 'text', placeholder: 'Barrier, operator, plate or reason' },
      ]}
    />
  )
}
