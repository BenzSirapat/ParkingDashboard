import {
  IconChartBar, IconArrowIn, IconTag, IconCar, IconWarning,
  IconReceipt, IconDoc, IconGlobe, IconUsers, IconWallet, IconUser, IconBuilding, IconShield, IconUpload,
} from './components/icons.jsx'

// Dashboards (grid marker) + Reports (dot marker) + Administration (admin only).
//
// Every item's `to` is also its permission key: administrators switch menus on and
// off per permission group (Administration → Permissions) and per user. The API
// keeps the same list in ParkingDashboardAPI/Security/DashboardMenus.cs — add a new
// page to both.
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
      { to: '/gates', label: 'Emergency Barrier', icon: IconWarning },
    ],
  },
  {
    label: 'Reports',
    kind: 'report',
    items: [
      { to: '/reports/sales-tax', label: 'Detailed Sales Tax Report', icon: IconReceipt },
      { to: '/reports/sales-tax-daily', label: 'Sales Tax Daily Summary', icon: IconChartBar },
      { to: '/reports/vehicle-transaction', label: 'Vehicle Transaction Report', icon: IconDoc },
      { to: '/reports/stamp', label: 'Stamp Usage Summary', icon: IconTag },
      { to: '/reports/license-plate', label: 'License Plate Reading Issue', icon: IconGlobe },
      { to: '/reports/opportunity-loss', label: 'Opportunity Loss Summary', icon: IconWarning },
      { to: '/reports/vehicle-volume', label: 'Vehicle Volume Time Period', icon: IconCar },
      { to: '/reports/member-visitor', label: 'Dashboard Member Visitor', icon: IconUsers },
      { to: '/reports/emergency-barrier', label: 'Emergency Barrier Report', icon: IconWarning },
      { to: '/tax-invoices', label: 'ABB & Tax Invoices', icon: IconReceipt },
      // { to: '/reports/discount', label: 'Discount Report', icon: IconTag },
      // { to: '/reports/package-member', label: 'Package Member Report', icon: IconUsers },
      // { to: '/reports/cash-online', label: 'Cash or Online Payment', icon: IconWallet },
    ],
  },
  {
    // Tenant member requests: CRM (approvelevel 2) first, then the high authority (3)
    // for TEMP / Excel / outside the contract. Everyone else views only.
    label: 'Member Approval',
    kind: 'report',
    items: [
      // CRM uploads the Excel the tenant filled in (add / change / cancel).
      { to: '/member-import', label: 'Member Import (Excel)', icon: IconUpload },
      { to: '/member-approval/building', label: 'CRM Approval', icon: IconBuilding },
      { to: '/member-approval/authority', label: 'High Authority Approval', icon: IconUser },
    ],
  },
  {
    // Only rendered for users whose role allows account management.
    label: 'Administration',
    kind: 'report',
    adminOnly: true,
    items: [
      { to: '/users', label: 'User Management', icon: IconUser },
      { to: '/permissions', label: 'Permissions', icon: IconShield },
    ],
  },
]

export const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items)

/**
 * The menus a signed-in account may open. The API sends `menus` on the profile
 * (administrators get every menu). An older API without the field → the menus as
 * before: everything but administration, which needs the admin role.
 */
export function allowedMenus(user, isAdmin) {
  if (isAdmin) return new Set(ALL_NAV.map((n) => n.to))
  if (Array.isArray(user?.menus)) return new Set(user.menus)
  return new Set(NAV_GROUPS.filter((g) => !g.adminOnly).flatMap((g) => g.items.map((i) => i.to)))
}

/** The nav groups with only the items this account may open (empty groups dropped). */
export function visibleGroups(allowed) {
  return NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => allowed.has(i.to)) }))
    .filter((g) => g.items.length > 0)
}
