import { customBounds } from '../../lib/dateRange.js'
import { rangeParams } from '../../lib/api.js'

export const ALL = 'all'
export const OPT_ALL = { value: ALL, label: 'All' }

/* The API's shared filter set (from/to/type/status/vehicleType/tenantId/
   departmentId/stampCode/search) — these option lists mirror the values it
   accepts. Tenant and stamp lists are dynamic; see `useMasterData()`. */

export const cardTypeOptions = [OPT_ALL, { value: 'member', label: 'Member' }, { value: 'visitor', label: 'Visitor' }]
export const vehicleTypeOptions = [OPT_ALL, { value: 'car', label: 'Car' }, { value: 'motorcycle', label: 'Motorcycle' }]
export const statusOptions = [OPT_ALL, { value: 'exited', label: 'Exited' }, { value: 'inside', label: 'Inside' }]

/**
 * Turn the report form's values into the API query string parameters.
 * Filter ids are named after the API fields, so this is mostly a range
 * conversion plus dropping the "all" placeholders (`toQuery` does that).
 */
export function toApiParams(values = {}) {
  const { range, ...rest } = values
  const bounds = range?.from && range?.to ? customBounds(range.from, range.to) : null
  return rangeParams(bounds, rest)
}
