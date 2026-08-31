import ReportPage from '../../components/ReportPage.jsx'
import { statusOptions } from './reportHelpers.js'

/**
 * LPR passages (in_by / out_by = 200) that carry no plate — the reads the
 * cameras could not resolve.
 */
export default function LicensePlateReport() {
  return (
    <ReportPage
      reportKey="license-plate"
      title="License Plate Reading Issue"
      subtitle="Passages the cameras could not read"
      exportName="license-plate-reading-issue"
      filters={[
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
        { id: 'status', label: 'Status', type: 'select', options: statusOptions },
      ]}
    />
  )
}
