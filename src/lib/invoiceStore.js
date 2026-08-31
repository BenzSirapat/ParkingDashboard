/* =========================================================================
   Tax documents.

   The pay stations issue an ABBREVIATED tax invoice (ใบกำกับภาษีอย่างย่อ, the
   "ABB") on every paid exit — that number already lives on the transaction
   (PkInoutTran's invoice id, read through the API). On request, one or more
   ABBs are converted into a FULL tax invoice (ใบกำกับภาษีแบบเต็มรูป) carrying
   the customer's tax id, which is then submitted to the Revenue Department's
   e-Tax service and delivered to the customer by e-mail.

   The ABBs are real API data. The full invoices are NOT: the parking database
   has no table for them and the API has no e-Tax endpoint, so they are kept
   per browser in localStorage. `issueFullInvoice()` / `submitEtax()` are the
   seams to point at that service once it exists.
   ========================================================================= */

const KEY = 'singha-parking-invoices'

export const SELLER = {
  name: 'บริษัท สิงห์ พาร์กกิ้ง จำกัด',
  nameEn: 'Singha Parking Co., Ltd.',
  taxId: '0105561000001',
  branch: 'สำนักงานใหญ่ (00000)',
  address: '123 ถนนอโศกมนตรี แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพฯ 10110',
}

/** e-Tax lifecycle: draft → submitted → delivered (or failed). */
export const ETAX_STATUS = {
  draft: { label: 'Not submitted', tone: 'inside' },
  submitted: { label: 'Submitted to e-Tax', tone: 'warn' },
  delivered: { label: 'Delivered to customer', tone: 'ok' },
  failed: { label: 'Submission failed', tone: 'danger' },
}

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* ignore */ }
  return list
}

export function listInvoices() {
  return read()
}

export function findInvoice(invoiceNo) {
  return read().find((i) => i.invoiceNo === invoiceNo) ?? null
}

/** ABB numbers already converted into a full invoice — they can't be reused. */
export function issuedAbbNos() {
  const set = new Set()
  for (const inv of read()) {
    if (inv.status === 'void') continue
    for (const a of inv.abbNos) set.add(a)
  }
  return set
}

function nextInvoiceNo(list) {
  const now = new Date()
  const prefix = `TIV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const used = list
    .filter((i) => i.invoiceNo.startsWith(prefix))
    .map((i) => Number(i.invoiceNo.slice(prefix.length + 1)) || 0)
  return `${prefix}-${String(Math.max(0, ...used) + 1).padStart(4, '0')}`
}

/**
 * Convert paid transactions (their ABBs) into one full tax invoice.
 *
 * @param {object[]} txns     transactions carrying an `abbNo`
 * @param {object} customer   { name, taxId, branch, address, email }
 * @param {object} user       who issued it
 */
export function issueFullInvoice(txns, customer, user) {
  if (!txns.length) return { ok: false, error: 'Select at least one ABB receipt.' }
  if (!customer.name?.trim()) return { ok: false, error: 'Customer name is required.' }
  if (!/^\d{13}$/.test((customer.taxId || '').replace(/\D/g, ''))) {
    return { ok: false, error: 'Tax ID must be 13 digits.' }
  }

  const list = read()
  const already = issuedAbbNos()
  const clash = txns.find((t) => already.has(t.abbNo))
  if (clash) return { ok: false, error: `${clash.abbNo} is already on a full tax invoice.` }

  // The API already carries the VAT amount per transaction; summing it keeps
  // the invoice consistent with the ABB receipts it replaces.
  const gross = txns.reduce((a, t) => a + t.total, 0)
  const vat = +txns.reduce((a, t) => a + (t.vat || 0), 0).toFixed(2)
  const net = +(gross - vat).toFixed(2)

  const invoice = {
    invoiceNo: nextInvoiceNo(list),
    issuedAt: new Date().toISOString(),
    issuedBy: user?.name || user?.username || 'system',
    customer: {
      name: customer.name.trim(),
      taxId: (customer.taxId || '').replace(/\D/g, ''),
      branch: customer.branch?.trim() || 'สำนักงานใหญ่ (00000)',
      address: customer.address?.trim() || '',
      email: customer.email?.trim() || '',
    },
    abbNos: txns.map((t) => t.abbNo),
    lines: txns.map((t) => ({
      abbNo: t.abbNo,
      plate: t.plate,
      entryTime: t.entryTime,
      exitTime: t.exitTime,
      durationMin: t.durationMin,
      amount: t.total,
    })),
    net,
    vat,
    gross: +gross.toFixed(2),
    status: 'issued',
    etax: { status: 'draft', submittedAt: null, deliveredAt: null, ref: null, error: null },
  }

  write([invoice, ...list])
  return { ok: true, invoice }
}

/**
 * Submit a full tax invoice to the e-Tax service and deliver it to the
 * customer. Resolves once the service acknowledges delivery.
 */
export async function submitEtax(invoiceNo) {
  const list = read()
  const idx = list.findIndex((i) => i.invoiceNo === invoiceNo)
  if (idx < 0) return { ok: false, error: 'Invoice not found.' }
  const invoice = list[idx]
  if (!invoice.customer.email) return { ok: false, error: 'Customer e-mail is required for e-Tax delivery.' }
  if (invoice.etax.status === 'delivered') return { ok: false, error: 'Already delivered.' }

  // Mark as submitted straight away so the UI can show the in-flight state.
  invoice.etax = { ...invoice.etax, status: 'submitted', submittedAt: new Date().toISOString(), error: null }
  list[idx] = invoice
  write(list)

  // --- replace with: await fetch('/api/etax/submit', { … }) ---
  await new Promise((r) => setTimeout(r, 1100))
  const ref = `ETAX-${Date.now().toString(36).toUpperCase()}`
  // -------------------------------------------------------------

  const fresh = read()
  const j = fresh.findIndex((i) => i.invoiceNo === invoiceNo)
  if (j < 0) return { ok: false, error: 'Invoice not found.' }
  fresh[j] = {
    ...fresh[j],
    etax: { status: 'delivered', submittedAt: fresh[j].etax.submittedAt, deliveredAt: new Date().toISOString(), ref, error: null },
  }
  write(fresh)
  return { ok: true, invoice: fresh[j] }
}

/** Void an invoice — the ABBs on it become available again. */
export function voidInvoice(invoiceNo) {
  const list = read()
  const idx = list.findIndex((i) => i.invoiceNo === invoiceNo)
  if (idx < 0) return { ok: false, error: 'Invoice not found.' }
  if (list[idx].etax.status === 'delivered') {
    return { ok: false, error: 'A delivered e-Tax invoice cannot be voided here.' }
  }
  list[idx] = { ...list[idx], status: 'void', voidedAt: new Date().toISOString() }
  write(list)
  return { ok: true }
}

/** Printable HTML for a full tax invoice (opens the browser print dialog). */
export function printInvoice(invoice) {
  const esc = (v) => String(v ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  const money = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const dt = (iso) => (iso ? new Date(iso).toLocaleString('en-GB') : '—')

  const lines = invoice.lines
    .map((l, i) => `<tr><td>${i + 1}</td><td>${esc(l.abbNo)}</td><td>${esc(l.plate)}</td>
      <td>${dt(l.entryTime)}</td><td>${dt(l.exitTime)}</td><td class="r">${money(l.amount)}</td></tr>`)
    .join('')

  const etax = invoice.etax.status === 'delivered'
    ? `<div class="etax">e-Tax: ${esc(invoice.etax.ref)} · delivered ${dt(invoice.etax.deliveredAt)} → ${esc(invoice.customer.email)}</div>`
    : ''

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(invoice.invoiceNo)}</title>
  <style>
    body{font-family:system-ui,"Segoe UI","Noto Sans Thai",sans-serif;color:#111;padding:32px;font-size:13px}
    h1{font-size:20px;margin:0 0 2px}.muted{color:#666}
    .top{display:flex;justify-content:space-between;gap:24px;margin-bottom:20px}
    .box{border:1px solid #ddd;border-radius:8px;padding:12px 14px;flex:1}
    .box h3{margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#666}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{border:1px solid #ddd;padding:7px 9px;text-align:left}
    th{background:#f3f4f6}.r{text-align:right}
    tfoot td{font-weight:700;background:#fafafa}
    .etax{margin-top:14px;padding:9px 12px;border:1px solid #b7e0c2;background:#f2fbf5;border-radius:8px;color:#176034}
    .sign{margin-top:44px;display:flex;justify-content:space-between;gap:40px}
    .sign div{flex:1;border-top:1px solid #999;padding-top:6px;text-align:center;color:#666}
  </style></head><body>
  <h1>ใบกำกับภาษี / TAX INVOICE (เต็มรูป)</h1>
  <div class="muted">${esc(invoice.invoiceNo)} · ${dt(invoice.issuedAt)} · issued by ${esc(invoice.issuedBy)}</div>
  <div class="top" style="margin-top:16px">
    <div class="box"><h3>ผู้ขาย / Seller</h3>
      <strong>${esc(SELLER.name)}</strong><br>${esc(SELLER.address)}<br>
      เลขประจำตัวผู้เสียภาษี ${esc(SELLER.taxId)} · ${esc(SELLER.branch)}</div>
    <div class="box"><h3>ผู้ซื้อ / Customer</h3>
      <strong>${esc(invoice.customer.name)}</strong><br>${esc(invoice.customer.address)}<br>
      เลขประจำตัวผู้เสียภาษี ${esc(invoice.customer.taxId)} · ${esc(invoice.customer.branch)}<br>
      ${esc(invoice.customer.email)}</div>
  </div>
  <table>
    <thead><tr><th>#</th><th>ABB No.</th><th>ทะเบียน</th><th>เวลาเข้า</th><th>เวลาออก</th><th class="r">จำนวนเงิน</th></tr></thead>
    <tbody>${lines}</tbody>
    <tfoot>
      <tr><td colspan="5" class="r">มูลค่าก่อนภาษี / Net</td><td class="r">${money(invoice.net)}</td></tr>
      <tr><td colspan="5" class="r">ภาษีมูลค่าเพิ่ม / VAT</td><td class="r">${money(invoice.vat)}</td></tr>
      <tr><td colspan="5" class="r">รวมทั้งสิ้น / Total</td><td class="r">${money(invoice.gross)}</td></tr>
    </tfoot>
  </table>
  ${etax}
  <div class="sign"><div>ผู้รับเงิน / Collector</div><div>ผู้รับใบกำกับภาษี / Received by</div></div>
  <script>window.onload=()=>window.print()</script>
  </body></html>`

  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
}
