/* =========================================================================
   Member request approval (อนุมัติคำขอเพิ่มสมาชิกจอดรถ).

     tenant (ParkingStamp) submits → building admin approves (ผู้ดูแลอาคาร)
                                   → top authority approves (ผู้มีอำนาจสูงสุด)
                                   → the member is created

   Endpoints (ParkingDashboardAPI — not built yet):
     GET  /member-requests?keyword=&status=
     GET  /member-requests/{id}
     POST /member-requests/{id}/approve   { remark }
     POST /member-requests/{id}/reject    { remark }   remark required

   The server decides which step an approve belongs to from the caller's role
   and must refuse one person approving both steps. Until the endpoints exist,
   VITE_MEMBER_APPROVAL_MOCK=1 serves the data below from localStorage.

   Status values stay as the original contract had them (PENDING_OPERATOR is
   the building-admin step) so the backend does not have to change.
   ========================================================================= */

import { api, toQuery } from './api.js'

export const USE_MOCK = import.meta.env.VITE_MEMBER_APPROVAL_MOCK === '1'

export const STATUS = {
  PENDING_BUILDING: 'PENDING_OPERATOR',
  PENDING_AUTHORITY: 'PENDING_AUTHORITY',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
}

export const STATUS_META = {
  [STATUS.PENDING_BUILDING]: { label: 'Awaiting building admin', pill: 'warn' },
  [STATUS.PENDING_AUTHORITY]: { label: 'Awaiting top authority', pill: 'visitor' },
  [STATUS.APPROVED]: { label: 'Approved', pill: 'ok' },
  [STATUS.REJECTED]: { label: 'Rejected', pill: 'danger' },
}

export const STEP = { SUBMIT: 'SUBMIT', BUILDING: 'OPERATOR', AUTHORITY: 'AUTHORITY' }

export const STEP_LABEL = {
  [STEP.SUBMIT]: 'Tenant submitted',
  [STEP.BUILDING]: 'Building admin',
  [STEP.AUTHORITY]: 'Top authority',
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

export const plates = (req) =>
  [...(req.member?.cars || []), ...(req.member?.motorcycles || [])].map((v) => v.licensePlate).filter(Boolean)

export const monthlyFee = (req) =>
  Number(req.member?.carRight?.monthlyFee || 0) + Number(req.member?.motorcycleRight?.monthlyFee || 0)

/** Who did this step last (approvals are append-only). */
export const stepRecord = (req, step) =>
  [...(req?.approvals || [])].reverse().find((a) => a.step === step) ?? null

/* ---------------------------------------------------------------- endpoints */

export const memberApprovalApi = {
  list: (params, signal) =>
    USE_MOCK ? mock.list(params) : api.get(`/member-requests${toQuery(params)}`, { signal }),
  get: (id, signal) =>
    USE_MOCK ? mock.get(id) : api.get(`/member-requests/${id}`, { signal }),
  approve: (id, { remark, step, user }) =>
    USE_MOCK ? mock.act(id, { action: 'APPROVE', remark, step, user }) : api.post(`/member-requests/${id}/approve`, { remark }),
  reject: (id, { remark, step, user }) =>
    USE_MOCK ? mock.act(id, { action: 'REJECT', remark, step, user }) : api.post(`/member-requests/${id}/reject`, { remark }),
}

/* --------------------------------------------------------------------- mock */

const STORAGE_KEY = 'singha-parking-member-requests'
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms))
const ago = (min) => new Date(Date.now() - min * 60000).toISOString()
const ymd = (iso) => iso.slice(0, 10).replace(/-/g, '')

function seed() {
  const today = new Date()
  const nextYear = new Date(today); nextYear.setFullYear(today.getFullYear() + 1)
  const right = (o = {}) => ({
    memberType: 'สมาชิก', isCompanyCar: false, location: 'SMetro', billingType: 'บริษัท',
    contractType: '0 - Temp', contractSubType: 'Temp 2500', monthlyFee: 2500,
    cardGroup: 'Czarnikow (Thailand) Ltd.(Head office)', parkingPlace: '', parkingLane: '',
    startDate: today.toISOString(), expireDate: nextYear.toISOString(), status: 'ใช้งานอยู่', paid: true,
    ...o,
  })
  const submitter = { byId: 101, byUsername: 'cza.admin', byName: 'ฝ่ายบุคคล ซีซาร์นิโคว' }
  const member = (th, en, mobile, plate, extra = {}) => ({
    firstNameTH: th[0], lastNameTH: th[1], firstNameEN: en[0], lastNameEN: en[1],
    mobile, idCard: '', gateGroup: 'All Gate', remark: '',
    carRight: right(), motorcycleRight: null,
    cars: [{ licensePlate: plate, brand: 'Toyota', color: 'ขาว', province: 'กรุงเทพมหานคร', remark: '' }],
    motorcycles: [],
    ...extra,
  })
  const base = (id, minAgo) => ({
    requestId: id, requestNo: `MR-${ymd(ago(minAgo))}-000${id}`, requestType: 'ADD',
    companyCode: 'CZA', companyName: 'บริษัท ซีซาร์นิโคว (ประเทศไทย) จำกัด',
    departmentName: 'บริษัท ซีซาร์นิโคว (ประเทศไทย) จำกัด',
    submittedAt: ago(minAgo), submittedBy: submitter, customerCode: null,
  })
  const submitted = (minAgo) => ({ step: STEP.SUBMIT, action: 'SUBMIT', ...submitter, at: ago(minAgo), remark: '' })
  const building = (minAgo, action = 'APPROVE', remark = '') => ({
    step: STEP.BUILDING, action, byId: 7, byUsername: 'building01', byName: 'สมศักดิ์ (ผู้ดูแลอาคาร)', at: ago(minAgo), remark,
  })

  return [
    {
      ...base(5, 20), status: STATUS.PENDING_BUILDING,
      member: member(['กนกพร', 'ศรีสุข'], ['Kanokporn', 'Srisuk'], '0891112222', '2กค 4521', {
        motorcycleRight: right({ contractType: '1 - Monthly', contractSubType: 'Monthly 3000', monthlyFee: 500 }),
        motorcycles: [{ licensePlate: '1กษ 889', brand: 'Honda', color: 'แดง', province: 'นนทบุรี', remark: '' }],
      }),
      approvals: [submitted(20)],
    },
    {
      ...base(4, 120), status: STATUS.PENDING_BUILDING,
      member: member(['ธนากร', 'วงศ์ใหญ่'], ['Thanakorn', 'Wongyai'], '0815556666', '8กข 1200'),
      approvals: [submitted(120)],
    },
    {
      ...base(3, 1440), status: STATUS.PENDING_AUTHORITY,
      member: member(['วิภาวี', 'แก้วมณี'], ['Wipawee', 'Kaewmanee'], '0867778888', 'ฎฐ 7788', {
        carRight: right({ isCompanyCar: true, contractType: '1 - Monthly', contractSubType: 'Monthly 3500', monthlyFee: 3500 }),
      }),
      approvals: [submitted(1440), building(1200, 'APPROVE', 'ตรวจสอบเอกสารครบ')],
    },
    {
      ...base(2, 4320), status: STATUS.APPROVED, customerCode: 'CZA-00012',
      member: member(['สมชาย', 'ใจดี'], ['Somchai', 'Jaidee'], '0812345678', '1กข 1234'),
      approvals: [
        submitted(4320), building(4260),
        { step: STEP.AUTHORITY, action: 'APPROVE', byId: 1, byUsername: 'manager', byName: 'ผู้จัดการอาคาร', at: ago(2880), remark: 'อนุมัติ' },
      ],
    },
    {
      ...base(1, 7200), status: STATUS.REJECTED,
      member: member(['ปิยะ', 'มั่นคง'], ['Piya', 'Mankong'], '0823334444', '3กก 5555'),
      approvals: [submitted(7200), building(7080, 'REJECT', 'ทะเบียนรถซ้ำกับสมาชิกเดิม')],
    },
  ]
}

function readAll() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (Array.isArray(saved)) return saved
  } catch { /* corrupt → reseed */ }
  const rows = seed()
  writeAll(rows)
  return rows
}

function writeAll(rows) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)) } catch { /* private mode */ }
}

const mock = {
  async list({ keyword, status } = {}) {
    await delay()
    const kw = (keyword || '').trim().toLowerCase()
    const matched = readAll().filter((r) => {
      if (!kw) return true
      const m = r.member || {}
      return [r.requestNo, r.companyName, r.customerCode, m.firstNameTH, m.lastNameTH, m.firstNameEN, m.lastNameEN, m.mobile, ...plates(r)]
        .join(' ').toLowerCase().includes(kw)
    })
    const counts = Object.values(STATUS).reduce((acc, s) => ({ ...acc, [s]: matched.filter((r) => r.status === s).length }), {})
    const items = (status ? matched.filter((r) => r.status === status) : matched)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    return { items, counts, total: matched.length }
  },

  async get(id) {
    await delay(150)
    const row = readAll().find((r) => r.requestId === Number(id))
    if (!row) throw new Error('Request not found.')
    return row
  },

  // The real API reads the step from the JWT role; the mock is told it.
  async act(id, { action, remark, step, user }) {
    await delay()
    const rows = readAll()
    const row = rows.find((r) => r.requestId === Number(id))
    if (!row) throw new Error('Request not found.')
    const expected = step === STEP.AUTHORITY ? STATUS.PENDING_AUTHORITY : STATUS.PENDING_BUILDING
    if (row.status !== expected) throw new Error('This request is no longer at your step.')
    if (action === 'REJECT' && !remark?.trim()) throw new Error('A reason is required to reject.')

    const byUsername = user?.username ?? user?.name
    if (step === STEP.AUTHORITY && action === 'APPROVE' && stepRecord(row, STEP.BUILDING)?.byUsername === byUsername) {
      throw new Error('The same person cannot approve both steps.')
    }

    row.approvals = [...(row.approvals || []), {
      step, action, byId: user?.id ?? null, byUsername, byName: user?.name || byUsername,
      at: new Date().toISOString(), remark: remark || '',
    }]

    if (action === 'REJECT') row.status = STATUS.REJECTED
    else if (step === STEP.BUILDING) row.status = STATUS.PENDING_AUTHORITY
    else {
      row.status = STATUS.APPROVED
      const max = rows.reduce((m, r) => Math.max(m, Number(String(r.customerCode || '').split('-')[1]) || 0), 12)
      row.customerCode = `${row.companyCode}-${String(max + 1).padStart(5, '0')}`
    }

    writeAll(rows)
    return row
  },
}
