import {
  IconChartBar, IconArrowIn, IconTag, IconCar, IconWarning,
  IconReceipt, IconDoc, IconGlobe, IconUsers, IconWallet,
} from './components/icons.jsx'

// Two groups mirror the reference: Dashboards (grid marker) + Reports (dot marker).
export const NAV_GROUPS = [
  {
    label: 'Dashboards',
    kind: 'dashboard',
    items: [
      { to: '/sales', label: 'Sales Dashboard', icon: IconChartBar },
      { to: '/transactions', label: 'Transaction Dashboard', icon: IconArrowIn },
      { to: '/stamps', label: 'Stamp Dashboard', icon: IconTag },
      { to: '/vehicles', label: 'Vehicle Dashboard', icon: IconCar },
      { to: '/opportunity', label: 'Opportunity Loss Dashboard', icon: IconWarning },
    ],
  },
  {
    label: 'Reports',
    kind: 'report',
    items: [
      { to: '/reports/sales-tax', label: 'Detailed Sales Tax Report', icon: IconReceipt },
      { to: '/reports/vehicle-transaction', label: 'Vehicle Transaction Report', icon: IconDoc },
      { to: '/reports/stamp', label: 'Stamp Report', icon: IconTag },
      { to: '/reports/license-plate', label: 'License Plate Reading Issue', icon: IconGlobe },
      { to: '/reports/opportunity-loss', label: 'Opportunity Loss Summary', icon: IconWarning },
      { to: '/reports/vehicle-volume', label: 'Vehicle Volume Time Period', icon: IconCar },
      { to: '/reports/member-visitor', label: 'Dashboard Member Visitor', icon: IconUsers },
      // { to: '/reports/discount', label: 'Discount Report', icon: IconTag },
      // { to: '/reports/package-member', label: 'Package Member Report', icon: IconUsers },
      // { to: '/reports/cash-online', label: 'Cash or Online Payment', icon: IconWallet },
    ],
  },
]

export const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items)
