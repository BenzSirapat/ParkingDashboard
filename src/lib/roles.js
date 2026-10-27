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

/**
 * Member request approval follows PkAdminsystem.approvelevel, not the role:
 *   2 = CRM             approves rights within the contract (CIR) and proposes the rest
 *   3 = High authority  approves TEMP, Excel imports and anything outside the contract
 * Everyone else (e.g. Parking) can open both pages but only views. The API
 * enforces the same rule and refuses one person approving both steps.
 */
export const APPROVE_LEVEL = { CRM: 2, AUTHORITY: 3 }

export const APPROVE_LEVELS = [
  { value: 0, label: 'View only' },
  { value: APPROVE_LEVEL.CRM, label: 'CRM' },
  { value: APPROVE_LEVEL.AUTHORITY, label: 'High authority' },
]

export const approveLevelLabel = (v) => APPROVE_LEVELS.find((l) => l.value === v)?.label ?? 'View only'

export const canApproveBuilding = (approveLevel) => approveLevel === APPROVE_LEVEL.CRM
export const canApproveAuthority = (approveLevel) => approveLevel === APPROVE_LEVEL.AUTHORITY
