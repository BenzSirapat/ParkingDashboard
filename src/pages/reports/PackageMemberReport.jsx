import { useCallback } from 'react'
import ReportPage from '../../components/ReportPage.jsx'
import { TRANSACTIONS, COMPANIES, siteShort } from '../../data/mockData.js'
import { fmtNum, fmtDate } from '../../lib/format.js'
import { useLang } from '../../lib/i18n.jsx'
import { applyFilters, companyOptions } from './reportHelpers.js'

const PACKAGES = ['Monthly', 'Quarterly', 'Annual', 'VIP']
const packageOptions = [{ value: 'all', label: 'All' }, ...PACKAGES.map((p) => ({ value: p, label: p }))]

// Deterministic package + expiry from the card number.
function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0x7fffffff
  return h
}

export default function PackageMemberReport() {
  const { t: tr } = useLang()
  const compute = useCallback((values) => {
    const rows = applyFilters(TRANSACTIONS.filter((t) => t.type === 'member'), values)
    const byCard = new Map()
    for (const t of rows) {
      if (!byCard.has(t.cardNo)) {
        const h = hash(t.cardNo)
        const pkg = PACKAGES[h % PACKAGES.length]
        const company = COMPANIES[h % COMPANIES.length]
        const daysLeft = (h % 400) - 60 // some expired
        const expiry = new Date()
        expiry.setDate(expiry.getDate() + daysLeft)
        byCard.set(t.cardNo, {
          _key: t.cardNo,
          site: siteShort(t.siteId),
          cardNo: t.cardNo,
          plate: t.plate,
          company: company.name,
          package: pkg,
          vehicles: 0,
          _expiry: expiry,
          status: daysLeft >= 0 ? 'Active' : 'Expired',
        })
      }
      byCard.get(t.cardNo).vehicles++
    }
    let list = [...byCard.values()]
    if (values.package && values.package !== 'all') list = list.filter((r) => r.package === values.package)
    return list
      .sort((a, b) => b.vehicles - a.vehicles)
      .map((r) => ({ ...r, vehiclesText: fmtNum(r.vehicles), expiry: fmtDate(r._expiry.toISOString(), { day: '2-digit', month: 'short', year: 'numeric' }) }))
  }, [])

  return (
    <ReportPage
      compute={compute}
      title="Package Member Report"
      subtitle="Membership packages &amp; validity"
      exportName="package-member-report"
      filters={[
        { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
        { id: 'company', label: 'Tenant', type: 'select', options: companyOptions },
        { id: 'package', label: 'Package', type: 'select', options: packageOptions },
      ]}
      columns={[
        { key: 'cardNo', label: 'Member No.', render: (r) => <strong>{r.cardNo}</strong> },
        { key: 'plate', label: 'License Plate' },
        { key: 'company', label: 'Company' },
        { key: 'package', label: 'Package', render: (r) => tr(r.package) },
        { key: 'vehiclesText', label: 'Visits', align: 'right' },
        { key: 'expiry', label: 'Expiry' },
        { key: 'status', label: 'Status', render: (r) => <span className={`pill ${r.status === 'Active' ? 'ok' : 'inside'}`}>{tr(r.status)}</span> },
      ]}
    />
  )
}
