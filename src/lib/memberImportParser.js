/* =========================================================================
   Reads the CRM member template ("Template import member.xlsx").

   Works on either sheet of the template:
     "Template ลูกค้ากรอก"  what the tenant fills (1 car + 1 motorcycle, no fee)
     "Template Up ระบบ"     what CRM uploads (3 cars + 1 motorcycle + monthly fee)
   and on any copy with the columns moved, because the columns are found by
   their header text, not their position:

     รหัสบริษัท | ชื่อบริษัท | รหัสสมาชิก | เพิ่ม | เปลี่ยนแปลง | ยกเลิก |
     ชื่อ | นามสกุล | เบอร์โทร | Email |
     ยี่ห้อ / ทะเบียน / สี / จังหวัด  รถยนต์คันที่ N  and  รถจักรยานยนต์คันที่ N |
     ประเภทสมาชิกรถยนต์ | ประเภทเรียกเก็บ | ค่าบริการ / เดือน | วันเริ่มต้นสัญญา… | วันหมดอายุสัญญา… |
     ประเภทสมาชิก จยย.  | ประเภทเรียกเก็บ | ค่าบริการ / เดือน | วันเริ่มต้นสัญญา… | วันหมดอายุสัญญา…

   The two "ประเภทเรียกเก็บ" / fee columns belong to whichever member type
   column comes before them. Rows with no name, member code or plate (the
   template's own example ticks and drop-down list) are skipped. The server
   interprets the cells; this only lifts them out of the sheet.
   ========================================================================= */

import * as XLSX from 'xlsx'

const MAX_ROWS = 500

const norm = (v) => String(v ?? '').replace(/\s+/g, '').toLowerCase()
const text = (v) => (v == null ? '' : String(v).trim())

const isMoto = (h) => h.includes('จักรยาน') || h.includes('จยย')

/** Header text → { field, section?, vehicle? }. */
function classify(header, section) {
  const h = norm(header)
  if (!h) return null

  const vehicle = h.match(/^(ยี่ห้อ|ทะเบียน|สี|จังหวัด)(.*?)คันที่(\d)$/)
  if (vehicle) {
    const part = { 'ยี่ห้อ': 'brand', 'ทะเบียน': 'plate', 'สี': 'color', 'จังหวัด': 'province' }[vehicle[1]]
    return { field: 'vehicle', kind: isMoto(vehicle[2]) ? 'moto' : 'car', index: Number(vehicle[3]) - 1, part }
  }

  if (h === 'รหัสบริษัท' || h === 'companycode') return { field: 'companyCode' }
  if (h === 'ชื่อบริษัท' || h === 'companyname') return { field: 'companyName' }
  if (h.startsWith('รหัสสมาชิก') || h === 'membercode' || h === 'รหัสลูกค้า') return { field: 'memberCode' }
  if (h === 'เพิ่ม' || h === 'add') return { field: 'add' }
  if (h === 'เปลี่ยนแปลง' || h === 'แก้ไข' || h === 'change') return { field: 'change' }
  if (h === 'ยกเลิก' || h === 'cancel') return { field: 'cancel' }
  if (h === 'ชื่อ' || h === 'firstname') return { field: 'firstName' }
  if (h === 'นามสกุล' || h === 'lastname') return { field: 'lastName' }
  if (h.startsWith('เบอร์โทร') || h.startsWith('โทรศัพท์') || h === 'mobile') return { field: 'mobile' }
  if (h === 'email' || h === 'อีเมล' || h === 'e-mail') return { field: 'email' }

  if (h.startsWith('ประเภทสมาชิก')) return { field: 'type', section: isMoto(h) ? 'motor' : 'car' }
  if (h.startsWith('ประเภทเรียกเก็บ')) return { field: 'billing', section }
  if (h.startsWith('ค่าบริการ')) return { field: 'fee', section }
  if (h.startsWith('วันเริ่มต้น')) return { field: 'start', section: isMoto(h) ? 'motor' : h.includes('รถยนต์') ? 'car' : section }
  if (h.startsWith('วันหมดอายุ') || h.startsWith('วันสิ้นสุด')) return { field: 'expire', section: isMoto(h) ? 'motor' : h.includes('รถยนต์') ? 'car' : section }
  return null
}

/** Where the header row is and what each column holds; null when the sheet is not the template. */
function findLayout(rows) {
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const cells = rows[r].map(norm)
    if (!cells.some((c) => c === 'เพิ่ม' || c === 'add')) continue
    if (!cells.some((c) => c === 'รหัสบริษัท' || c.startsWith('รหัสสมาชิก') || c === 'ชื่อ')) continue

    let section = 'car'
    const columns = []
    rows[r].forEach((header, col) => {
      const info = classify(header, section)
      if (!info) return
      if (info.field === 'type') section = info.section
      columns.push({ col, ...info })
    })
    return { headerRow: r, columns }
  }
  return null
}

const pad2 = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

/** Excel date, or dd/mm/yyyy text in B.E. or A.D. → yyyy-mm-dd. */
function dateOf(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    // A B.E. year typed into a date cell.
    if (v.getFullYear() > 2400) return ymd(new Date(v.getFullYear() - 543, v.getMonth(), v.getDate()))
    return ymd(v)
  }
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const p = XLSX.SSF.parse_date_code(v)
    return p ? `${p.y > 2400 ? p.y - 543 : p.y}-${pad2(p.m)}-${pad2(p.d)}` : null
  }
  const t = text(v)
  const m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
  if (!m) return null
  let year = Number(m[3])
  if (year < 100) year += year > 60 ? 2500 : 2000
  if (year > 2400) year -= 543
  const d = new Date(year, Number(m[2]) - 1, Number(m[1]))
  return Number.isNaN(d.getTime()) ? null : ymd(d)
}

function feeOf(v) {
  if (typeof v === 'number') return v
  const t = text(v).replace(/,/g, '')
  return t && !Number.isNaN(Number(t)) ? Number(t) : null
}

/** A tick in เพิ่ม / เปลี่ยนแปลง / ยกเลิก: ✓, x, 1, yes… (not 0 / no / -). */
const ticked = (v) => {
  const t = norm(v)
  return !!t && !['0', 'no', 'n', '-', 'false', 'ไม่'].includes(t)
}

/** The sheets of a workbook that look like the template, the system-upload sheet first. */
export function readWorkbook(buffer) {
  const book = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheets = []
  for (const name of book.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, defval: '', raw: true, blankrows: true })
    const layout = findLayout(rows)
    if (layout) sheets.push({ name, rows, layout })
  }
  // Prefer the sheet CRM uploads ("Up ระบบ"), then the one with the most columns.
  sheets.sort((a, b) =>
    (/up/i.test(b.name) ? 1 : 0) - (/up/i.test(a.name) ? 1 : 0)
    || b.layout.columns.length - a.layout.columns.length)
  return sheets
}

/** The rows of one template sheet, as the API's ImportRowDto. */
export function sheetRows(sheet) {
  const { rows, layout } = sheet
  const out = []
  for (let r = layout.headerRow + 1; r < rows.length; r++) {
    const cells = rows[r]
    const row = { rowNumber: r + 1, cars: [], motorcycles: [] }
    const car = {}
    const motor = {}

    for (const c of layout.columns) {
      const v = cells[c.col]
      if (c.field === 'vehicle') {
        const list = c.kind === 'moto' ? row.motorcycles : row.cars
        list[c.index] = list[c.index] || {}
        list[c.index][c.part] = text(v)
        continue
      }
      const into = c.section === 'motor' ? motor : c.section === 'car' ? car : row
      switch (c.field) {
        case 'add': case 'change': case 'cancel': row[c.field] = ticked(v); break
        case 'fee': into.fee = feeOf(v); break
        case 'start': case 'expire': into[c.field] = dateOf(v); break
        default: into[c.field] = text(v)
      }
    }

    row.cars = row.cars.filter((v) => v && text(v.plate))
    row.motorcycles = row.motorcycles.filter((v) => v && text(v.plate))
    row.carType = car.type || ''
    row.carBilling = car.billing || ''
    row.carFee = car.fee ?? null
    row.carStart = car.start ?? null
    row.carExpire = car.expire ?? null
    row.motorType = motor.type || ''
    row.motorBilling = motor.billing || ''
    row.motorFee = motor.fee ?? null
    row.motorStart = motor.start ?? null
    row.motorExpire = motor.expire ?? null

    // Skip the template's own legend rows: no person, no member, no plate.
    const hasData = text(row.firstName) || text(row.lastName) || text(row.memberCode)
      || row.cars.length || row.motorcycles.length
    if (!hasData) continue
    out.push(row)
  }
  if (out.length > MAX_ROWS) throw new Error(`Import at most ${MAX_ROWS} rows at a time.`)
  return out
}
