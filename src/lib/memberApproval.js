/* =========================================================================
   Member request approval (อนุมัติคำขอเพิ่มสมาชิกจอดรถ).

     tenant (ParkingStamp) submits → building admin grants the right and approves
                                   → top authority approves (ผู้มีอำนาจสูงสุด)
                                   → USERINFO / User_vehicle / PkCard are created

   Requests live in dbo.PkMemberRequest until the final approval. The building
   admin picks the contract (Pkcar_contact) per vehicle type, the contract type,
   fee, billing and dates — the tenant only asks for CIR or TEMP, without price.

   Endpoints (ParkingDashboardAPI):
     GET  /member-requests?keyword=&status=
     GET  /member-requests/summary                    top-bar notification
     GET  /member-requests/{id}
     GET  /member-requests/{id}/contracts             the tenant's Pkcar_contact
     GET  /member-requests/{id}/vehicles/{vid}/image  registration copy
     POST /member-requests/{id}/approve   { remark, grant }   grant at the building step
     POST /member-requests/{id}/reject    { remark }          remark required

   The server decides which step an approve belongs to from the request status
   and the caller's role, and refuses one person approving both steps.
   ========================================================================= */

import { api, toQuery } from './api.js'

export const STATUS = {
  PENDING_BUILDING: 'PENDING_OPERATOR',
  PENDING_AUTHORITY: 'PENDING_AUTHORITY',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
}

export const STATUS_META = {
  [STATUS.PENDING_BUILDING]: { label: 'Awaiting building admin', pill: 'warn' },
  [STATUS.PENDING_AUTHORITY]: { label: 'Awaiting top authority', pill: 'visitor' },
  [STATUS.APPROVED]: { label: 'Approved', pill: 'ok' },
  [STATUS.REJECTED]: { label: 'Rejected', pill: 'danger' },
  [STATUS.CANCELLED]: { label: 'Cancelled by tenant', pill: '' },
}

export const STEP = { SUBMIT: 'SUBMIT', BUILDING: 'OPERATOR', AUTHORITY: 'AUTHORITY' }

export const STEP_LABEL = {
  [STEP.SUBMIT]: 'Tenant submitted',
  [STEP.BUILDING]: 'Building admin',
  [STEP.AUTHORITY]: 'Top authority',
}

/** USERINFO.Cardcontact_Cartype — the contract types of the desktop program. */
export const CONTACT_TYPES = [
  { value: 0, label: '0 - Temp' },
  { value: 1, label: '1 - Fix' },
  { value: 2, label: '2 - Cir' },
  { value: 3, label: '3 - Fix - Pay More' },
  { value: 4, label: '4 - Cir up Fix' },
]

export const contactTypeLabel = (v) => CONTACT_TYPES.find((c) => c.value === v)?.label ?? '—'

export const BILLING = [
  { value: 1, label: 'Company' },
  { value: 2, label: 'Personal' },
]

/** CIR = free with the lease, TEMP = rented on top (paid). */
export const RIGHT_LABEL = {
  CIR: 'CIR — right with the lease',
  TEMP: 'TEMP — extra rental',
}

/** The two approval pages, one per step. */
export const STAGES = {
  building: {
    step: STEP.BUILDING,
    status: STATUS.PENDING_BUILDING,
    title: 'Building Admin Approval',
    sub: 'First check of member requests sent by tenants',
  },
  authority: {
    step: STEP.AUTHORITY,
    status: STATUS.PENDING_AUTHORITY,
    title: 'Top Authority Approval',
    sub: 'Final approval — the member is created on approve',
  },
}

export const fullName = (m) => [m?.firstNameTH, m?.lastNameTH].filter(Boolean).join(' ') || '—'

export const vehiclesOf = (req) => [...(req.member?.cars || []), ...(req.member?.motorcycles || [])]

export const plates = (req) => vehiclesOf(req).map((v) => v.licensePlate).filter(Boolean)

/** The contracts granted at the building step, as one line. */
export const grantedRight = (req) =>
  [req.grant?.carContactName, req.grant?.motorContactName].filter(Boolean).join(' / ')

/** Who did this step last (approvals are append-only). */
export const stepRecord = (req, step) =>
  [...(req?.approvals || [])].reverse().find((a) => a.step === step && a.action !== 'SUBMIT' && a.action !== 'CANCEL') ?? null

/* ---------------------------------------------------------------- endpoints */

export const memberApprovalApi = {
  list: (params, signal) => api.get(`/member-requests${toQuery(params)}`, { signal }),
  summary: (signal) => api.get('/member-requests/summary', { signal }),
  get: (id, signal) => api.get(`/member-requests/${id}`, { signal }),
  contracts: (id, signal) => api.get(`/member-requests/${id}/contracts`, { signal }),
  vehicleImage: (id, vehicleId, signal) => api.get(`/member-requests/${id}/vehicles/${vehicleId}/image`, { signal }),
  approve: (id, { remark, grant }) => api.post(`/member-requests/${id}/approve`, { remark, grant }),
  reject: (id, { remark }) => api.post(`/member-requests/${id}/reject`, { remark }),
}

/**
 * Fired after an approve / reject so the top-bar bell refreshes straight away
 * instead of waiting for its next poll.
 */
export const MEMBER_REQUESTS_CHANGED = 'member-requests-changed'
export const notifyMemberRequestsChanged = () => window.dispatchEvent(new Event(MEMBER_REQUESTS_CHANGED))
