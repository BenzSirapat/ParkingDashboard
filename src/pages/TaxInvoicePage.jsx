import { useCallback, useMemo, useState } from 'react'
import { Panel, DataTable } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import StatCard from '../components/StatCard.jsx'
import RangePicker from '../components/RangePicker.jsx'
import { IconReceipt, IconFile, IconCoins, IconSearch, IconPrinter } from '../components/icons.jsx'
import { resolveRange, DEFAULT_RANGE, rangeLabel } from '../lib/dateRange.js'
import { filterByRange, abbStats, abbByDay } from '../lib/selectors.js'
import { fmtBaht, fmtBaht2, fmtNum, fmtDate, fmtDateTime } from '../lib/format.js'
import { useLang } from '../lib/i18n.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useSite, useSiteTransactions } from '../lib/siteContext.jsx'
import { siteShort } from '../data/mockData.js'
import { exportCsv, exportExcel } from '../lib/export.js'
import {
  listInvoices, issueFullInvoice, submitEtax, issuedAbbNos, printInvoice, ETAX_STATUS,
} from '../lib/invoiceStore.js'
import './dashboard.css'

const EMPTY_CUSTOMER = { name: '', taxId: '', branch: 'สำนักงานใหญ่ (00000)', address: '', email: '' }

/**
 * ABB summary (สรุป ABB) + issuing a full tax invoice (ใบกำกับภาษีเต็มรูป)
 * and delivering it to the customer through e-Tax.
 */
export default function TaxInvoicePage() {
  const { t } = useLang()
  const { user, canOperate } = useAuth()
  const { label: siteLabel } = useSite()
  const siteTxns = useSiteTransactions()

  const [range, setRange] = useState(DEFAULT_RANGE)
  const bounds = useMemo(() => resolveRange(range), [range])
  const txns = useMemo(() => filterByRange(siteTxns, bounds), [siteTxns, bounds])

  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [invoices, setInvoices] = useState(() => listInvoices())
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER)
  const [issuing, setIssuing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [sending, setSending] = useState(null)

  const stats = useMemo(() => abbStats(txns), [txns])
  const daily = useMemo(() => abbByDay(txns), [txns])
  const converted = useMemo(() => issuedAbbNos(), [invoices])

  // The ABB receipts a customer can ask to be turned into a full invoice.
  const abbRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return txns
      .filter((tx) => tx.abbNo)
      .filter((tx) => !q || tx.abbNo.toLowerCase().includes(q) || tx.plate.toLowerCase().includes(q) || tx.cardNo.includes(q))
      .sort((a, b) => (a.exitTime < b.exitTime ? 1 : -1))
      .slice(0, 300)
  }, [txns, query])

  const selectedTxns = useMemo(
    () => txns.filter((tx) => tx.abbNo && selected.has(tx.abbNo)),
    [txns, selected]
  )
  const selectedTotal = selectedTxns.reduce((a, tx) => a + tx.total, 0)

  const toggle = (abbNo) => setSelected((s) => {
    const next = new Set(s)
    if (next.has(abbNo)) next.delete(abbNo)
    else next.add(abbNo)
    return next
  })

  const flash = useCallback((msg) => {
    setNotice(msg)
    setTimeout(() => setNotice(''), 4000)
  }, [])

  const issue = () => {
    const res = issueFullInvoice(selectedTxns, customer, user)
    if (!res.ok) { setError(t(res.error)); return }
    setInvoices(listInvoices())
    setSelected(new Set())
    setCustomer(EMPTY_CUSTOMER)
    setIssuing(false)
    setError('')
    flash(`${t('Full tax invoice issued')} · ${res.invoice.invoiceNo}`)
  }

  const send = async (invoice) => {
    setSending(invoice.invoiceNo)
    const res = await submitEtax(invoice.invoiceNo)
    setInvoices(listInvoices())
    setSending(null)
    if (!res.ok) { setError(t(res.error)); return }
    setError('')
    flash(`${t('Delivered to customer via e-Tax')} · ${res.invoice.invoiceNo} → ${res.invoice.customer.email}`)
  }

  const dailyExport = daily.map((d) => ({
    day: fmtDate(d.day, { day: '2-digit', month: 'short', year: 'numeric' }),
    count: d.count,
    firstNo: d.firstNo,
    lastNo: d.lastNo,
    net: d.net.toFixed(2),
    vat: d.vat.toFixed(2),
    amount: d.amount.toFixed(2),
    cash: d.cash,
    online: d.online,
  }))
  const dailyCols = [
    { key: 'day', label: 'Date' }, { key: 'count', label: 'ABB Count' },
    { key: 'firstNo', label: 'First No.' }, { key: 'lastNo', label: 'Last No.' },
    { key: 'net', label: 'Net' }, { key: 'vat', label: 'VAT' }, { key: 'amount', label: 'Total' },
    { key: 'cash', label: 'Cash' }, { key: 'online', label: 'Online' },
  ]

  const deliveredCount = invoices.filter((i) => i.etax.status === 'delivered').length

  return (
    <>
      <div className="page-toolbar">
        <div>
          <div className="hint-label">{t('Abbreviated (ABB) & Full Tax Invoices')}</div>
          <div className="chips"><span className="chip">{t(siteLabel)}</span><span className="chip">{t(rangeLabel(range))}</span></div>
        </div>
        <RangePicker value={range} onChange={setRange} />
      </div>

      {notice && <div className="banner ok">{notice}</div>}
      {error && <div className="banner danger">{error}</div>}

      <div className="stat-grid">
        <StatCard icon={IconReceipt} tone="blue" label="ABB Issued" value={fmtNum(stats.count)} sub="Abbreviated tax invoices" />
        <StatCard icon={IconCoins} tone="green" valueClass="money-green" label="ABB Total" value={fmtBaht(stats.amount)} sub="VAT included" />
        <StatCard icon={IconFile} tone="amber" label="ABB VAT" value={fmtBaht(stats.vat)} sub="7% included" />
        <StatCard icon={IconReceipt} tone="violet" label="Average per ABB" value={fmtBaht2(stats.avg)} sub="Per receipt" />
      </div>

      <div className="stat-grid cols-3">
        <StatCard icon={IconFile} tone="blue" label="Full Tax Invoices" value={fmtNum(invoices.length)} sub="Issued from ABB" />
        <StatCard icon={IconFile} tone="green" valueClass="money-green" label="Delivered via e-Tax" value={fmtNum(deliveredCount)} sub="Sent to customers" />
        <StatCard icon={IconReceipt} tone="amber" label="Cash / Online ABB" value={`${fmtNum(stats.byChannel.cash)} / ${fmtNum(stats.byChannel.online)}`} sub="By payment channel" />
      </div>

      <Panel
        title="ABB Daily Summary"
        sub="Abbreviated tax invoices per day, with running numbers"
        right={
          <div className="panel-filters">
            <button className="btn" onClick={() => exportCsv(dailyCols, dailyExport, 'abb-summary')}>{t('CSV')}</button>
            <button className="btn" onClick={() => exportExcel(dailyCols, dailyExport, 'abb-summary', 'ABB')}>{t('Excel')}</button>
          </div>
        }
      >
        <DataTable
          maxHeight={360}
          empty="No ABB receipts in this range."
          rows={daily.map((d) => ({ ...d, _key: d.day }))}
          columns={[
            { key: 'day', label: 'Date', render: (r) => fmtDate(r.day, { day: '2-digit', month: 'short', year: 'numeric' }) },
            { key: 'count', label: 'ABB Count', align: 'right', render: (r) => fmtNum(r.count) },
            { key: 'firstNo', label: 'First No.' },
            { key: 'lastNo', label: 'Last No.' },
            { key: 'net', label: 'Net', align: 'right', render: (r) => fmtBaht2(r.net) },
            { key: 'vat', label: 'VAT', align: 'right', render: (r) => fmtBaht2(r.vat) },
            { key: 'amount', label: 'Total', align: 'right', render: (r) => <strong>{fmtBaht2(r.amount)}</strong> },
            { key: 'cash', label: 'Cash', align: 'right', render: (r) => fmtNum(r.cash) },
            { key: 'online', label: 'Online', align: 'right', render: (r) => fmtNum(r.online) },
          ]}
        />
      </Panel>

      <Panel
        title="ABB Receipts"
        sub="Tick the receipts a customer wants as a full tax invoice"
        right={
          <div className="panel-filters">
            <label className="search-box">
              <IconSearch width={15} height={15} />
              <input className="input" placeholder={t('ABB no., plate or card')} value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <button
              className="btn primary"
              disabled={!canOperate || !selected.size}
              onClick={() => { setError(''); setIssuing(true) }}
            >
              {t('Issue full tax invoice')} {selected.size ? `(${selected.size})` : ''}
            </button>
          </div>
        }
      >
        {!!selected.size && (
          <div className="selection-bar">
            {selected.size} {t('receipts selected')} · <strong>{fmtBaht2(selectedTotal)}</strong>
            <button className="btn tiny" onClick={() => setSelected(new Set())}>{t('Clear')}</button>
          </div>
        )}
        <DataTable
          maxHeight={420}
          empty="No ABB receipts match."
          rows={abbRows.map((tx) => ({ ...tx, _key: tx.abbNo }))}
          columns={[
            {
              key: 'pick',
              label: '',
              render: (r) => (
                <input
                  type="checkbox"
                  checked={selected.has(r.abbNo)}
                  disabled={converted.has(r.abbNo)}
                  onChange={() => toggle(r.abbNo)}
                  aria-label={r.abbNo}
                />
              ),
            },
            { key: 'abbNo', label: 'ABB No.', render: (r) => <strong>{r.abbNo}</strong> },
            { key: 'siteId', label: 'Site', render: (r) => siteShort(r.siteId) },
            { key: 'exitTime', label: 'Paid at', render: (r) => fmtDateTime(r.exitTime) },
            { key: 'plate', label: 'License Plate' },
            { key: 'payment', label: 'Payment', render: (r) => r.payment || '—' },
            { key: 'vat', label: 'VAT', align: 'right', render: (r) => fmtBaht2(r.vat) },
            { key: 'total', label: 'Total', align: 'right', render: (r) => fmtBaht2(r.total) },
            {
              key: 'state',
              label: 'Full invoice',
              render: (r) => (converted.has(r.abbNo)
                ? <span className="pill ok">{t('Issued')}</span>
                : <span className="pill inside">{t('Not issued')}</span>),
            },
          ]}
        />
      </Panel>

      <Panel title="Full Tax Invoices" sub="Issue, print and deliver through e-Tax">
        <DataTable
          maxHeight={440}
          empty="No full tax invoices issued yet."
          rows={invoices.map((i) => ({ ...i, _key: i.invoiceNo }))}
          columns={[
            { key: 'invoiceNo', label: 'Invoice No.', render: (r) => <strong>{r.invoiceNo}</strong> },
            { key: 'issuedAt', label: 'Issued', render: (r) => fmtDateTime(r.issuedAt) },
            { key: 'customer', label: 'Customer', render: (r) => (<><strong>{r.customer.name}</strong><br /><small className="muted">{t('Tax ID')} {r.customer.taxId}</small></>) },
            { key: 'abbNos', label: 'ABB', align: 'right', render: (r) => fmtNum(r.abbNos.length) },
            { key: 'net', label: 'Net', align: 'right', render: (r) => fmtBaht2(r.net) },
            { key: 'vat', label: 'VAT', align: 'right', render: (r) => fmtBaht2(r.vat) },
            { key: 'gross', label: 'Total', align: 'right', render: (r) => <strong>{fmtBaht2(r.gross)}</strong> },
            {
              key: 'etax',
              label: 'e-Tax',
              render: (r) => (
                <span className={`pill ${ETAX_STATUS[r.etax.status].tone}`}>
                  {t(ETAX_STATUS[r.etax.status].label)}
                  {r.etax.ref ? <><br /><small>{r.etax.ref}</small></> : null}
                </span>
              ),
            },
            {
              key: 'actions',
              label: 'Actions',
              align: 'right',
              render: (r) => (
                <div className="row-actions">
                  <button className="btn tiny" onClick={() => printInvoice(r)}><IconPrinter width={13} height={13} /> {t('Print')}</button>
                  <button
                    className="btn tiny primary"
                    disabled={!canOperate || r.etax.status === 'delivered' || sending === r.invoiceNo}
                    onClick={() => send(r)}
                  >
                    {sending === r.invoiceNo ? t('Sending…') : r.etax.status === 'delivered' ? t('Delivered') : t('Send e-Tax')}
                  </button>
                </div>
              ),
            },
          ]}
        />
      </Panel>

      <Modal
        open={issuing}
        title="Issue full tax invoice"
        sub="Customer details printed on the ใบกำกับภาษีเต็มรูป"
        width={640}
        onClose={() => { setIssuing(false); setError('') }}
        footer={
          <>
            <button className="btn" onClick={() => { setIssuing(false); setError('') }}>{t('Cancel')}</button>
            <button className="btn primary" onClick={issue}>{t('Issue invoice')}</button>
          </>
        }
      >
        <div className="form-grid">
          {error && <div className="banner danger span-2">{error}</div>}

          <div className="invoice-summary span-2">
            <span>{selected.size} {t('ABB receipts')}</span>
            <strong>{fmtBaht2(selectedTotal)}</strong>
          </div>

          <div className="field span-2">
            <label>{t('Customer name')}</label>
            <input className="input" value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} placeholder="บริษัท ตัวอย่าง จำกัด" />
          </div>
          <div className="field">
            <label>{t('Tax ID')} (13)</label>
            <input className="input" value={customer.taxId} onChange={(e) => setCustomer((c) => ({ ...c, taxId: e.target.value }))} placeholder="0105561000001" />
          </div>
          <div className="field">
            <label>{t('Branch')}</label>
            <input className="input" value={customer.branch} onChange={(e) => setCustomer((c) => ({ ...c, branch: e.target.value }))} />
          </div>
          <div className="field span-2">
            <label>{t('Address')}</label>
            <input className="input" value={customer.address} onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))} />
          </div>
          <div className="field span-2">
            <label>{t('E-mail for e-Tax delivery')}</label>
            <input className="input" type="email" value={customer.email} onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))} placeholder="accounting@customer.co.th" />
          </div>
        </div>
      </Modal>
    </>
  )
}
