import ReportPage from '../../components/ReportPage.jsx'
import { useMasterData } from '../../lib/masterData.jsx'

/**
 * Membership packages. Unlike the other reports this one reads USERINFO on the
 * server rather than the transaction feed, so it has no date range — a member
 * record is current, not something that happened in a window.
 */
export default function PackageMemberReport() {
  const { tenantOptions } = useMasterData()

  return (
    <ReportPage
      reportKey="package-member"
      title="Package Member Report"
      subtitle="Membership packages &amp; validity"
      exportName="package-member-report"
      filters={[
        { id: 'tenantId', label: 'Tenant', type: 'select', options: tenantOptions, colSpan: 2 },
        { id: 'search', label: 'Search', type: 'text', placeholder: 'Member no. or license plate', colSpan: 2 },
      ]}
    />
  )
}
