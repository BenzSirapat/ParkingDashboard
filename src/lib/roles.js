/* =========================================================================
   Dashboard roles.

   The API derives the role from PkAdminweb.admin_level_id through its `Roles`
   configuration section and returns it on the profile — this module only holds
   the labels and the permission predicates the UI branches on.
   ========================================================================= */

export const ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'operator', label: 'Operator' },
  { value: 'viewer', label: 'Viewer' },
]

export const roleLabel = (v) => ROLES.find((r) => r.value === v)?.label ?? v ?? '—'

/** May open a barrier and issue / send tax invoices. */
export const canOperate = (role) => role === 'admin' || role === 'manager' || role === 'operator'

/** May manage dashboard user accounts. */
export const canAdmin = (role) => role === 'admin'
