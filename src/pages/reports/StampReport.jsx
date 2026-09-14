import ReportPage from '../../components/ReportPage.jsx'
import { useMasterData } from '../../lib/masterData.jsx'

export default function StampReport() {
  const { tenantOptions } = useMasterData()

  /* The server groups dbo.vsummarytenant by tenant and day, so the filters the
     report can honour are the window, the tenant and free text — a card type or
     a stamp code would have nothing to match against in a grouped row. */
  return (
    <ReportPage
      reportKey="stamp"
      title="Stamp Usage Summary"
      subtitle="Stamps used per tenant and day, with the amount the tenant absorbed"
      exportName="stamp-usage-summary"
      filters={[
        { id: 'tenantId', label: 'Tenant', type: 'select', options: tenantOptions, colSpan: 2 },
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
        { id: 'search', label: 'Search', type: 'text', placeholder: 'Tenant code or name', colSpan: 2 },
      ]}
    />
  )
}
