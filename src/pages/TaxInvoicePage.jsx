import { useEffect, useMemo, useState } from 'react'
import { Panel, DataTable } from '../components/ui.jsx'
import StatCard from '../components/StatCard.jsx'
import RangePicker from '../components/RangePicker.jsx'
import { AsyncState, ErrorState, Loading } from '../components/AsyncState.jsx'
import { IconReceipt, IconFile, IconCoins, IconSearch } from '../components/icons.jsx'
import { resolveRange, DEFAULT_RANGE, rangeLabel } from '../lib/dateRange.js'
import { dashboardApi, transactionsApi, rangeParams } from '../lib/api.js'
import { useApi } from '../lib/useApi.js'
import { fmtBaht, fmtBaht2, fmtNum, fmtDate, fmtDateTime } from '../lib/format.js'
import { useLang } from '../lib/i18n.jsx'
import { useSite } from '../lib/siteContext.jsx'
import { exportCsv, exportExcel } from '../lib/export.js'
import './dashboard.css'

const EMPTY_ABB = { count: 0, amount: 0, vat: 0, net: 0, avg: 0, cash: 0, online: 0 }

/**
 * ABB summary (สรุป ABB) — the abbreviated tax invoices the pay stations
 * printed, per day and per receipt.
 *
 * A full tax invoice (ใบกำกับภาษีเต็มรูป) is NOT issued here: the parking
 * system raises it at the booth and records the request on the document as
 * dbo.PkInvoicetemp.inv_full = 1. This page only reports that flag, which the
 * API serves as `fullTaxInvoice` on each transaction.
 */
export default function TaxInvoicePage() {
  const { t } = useLang()
  const { label: siteLabel, short: siteShort } = useSite()

  const [range, setRange] = useState(DEFAULT_RANGE)
  const bounds = useMemo(() => resolveRange(range), [range])
  const params = useMemo(() => rangeParams(bounds), [bounds])

  // The sales dashboard already aggregates the ABB totals for a range.
  const summary = useApi((signal) => dashboardApi.sales(params, signal), [JSON.stringify(params)])
  const stats = summary.data?.abb ?? EMPTY_ABB
  const daily = summary.data?.abbDaily ?? []

  const [query, setQuery] = useState('')
  const [term, setTerm] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setTerm(query.trim()), 350)
    return () => clearTimeout(id)
  }, [query])

  // The individual receipts, each with the full-tax-invoice flag off its document.
  const receiptParams = useMemo(
    () => rangeParams(bounds, { status: 'exited', search: term, pageSize: 300, sortBy: 'exitTime', desc: true }),
    [bounds, term]
  )
  const receipts = useApi(
    (signal) => transactionsApi.list(receiptParams, signal),
    [JSON.stringify(receiptParams)]
  )

  // The ABB number is the transaction's invoice number.
  const abbRows = useMemo(
    () => (receipts.data?.items ?? [])
      .filter((tx) => tx.invoiceNo)
      .map((tx) => ({ ...tx, abbNo: tx.invoiceNo })),
    [receipts.data]
  )

  const fullRequested = abbRows.filter((tx) => tx.fullTaxInvoice).length

  const dailyExport = daily.map((d) => ({
    day: fmtDate(`${d.day}T00:00:00`, { day: '2-digit', month: 'short', year: 'numeric' }),
    count: d.count,
    firstNo: d.firstNo,
    lastNo: d.lastNo,
    net: Number(d.net).toFixed(2),
    vat: Number(d.vat).toFixed(2),
    amount: Number(d.amount).toFixed(2),
    cash: d.cash,
    online: d.online,
  }))
  const dailyCols = [
    { key: 'day', label: 'Date' }, { key: 'count', label: 'ABB Count' },
    { key: 'firstNo', label: 'First No.' }, { key: 'lastNo', label: 'Last No.' },
    { key: 'net', label: 'Net' }, { key: 'vat', label: 'VAT' }, { key: 'amount', label: 'Total' },
    { key: 'cash', label: 'Cash' }, { key: 'online', label: 'Online' },
  ]

  return (
    <>
      <div className="page-toolbar">
        <div>
          <div className="hint-label">{t('Abbreviated (ABB) & Full Tax Invoices')}</div>
          <div className="chips"><span className="chip">{siteLabel}</span><span className="chip">{t(rangeLabel(range))}</span></div>
        </div>
        <RangePicker value={range} onChange={setRange} />
      </div>

      {summary.error && <ErrorState error={summary.error} onRetry={summary.reload} />}
      {summary.loading && !summary.data && <Loading />}

      <div className="stat-grid">
        <StatCard icon={IconReceipt} tone="blue" label="ABB Issued" value={fmtNum(stats.count)} sub="Abbreviated tax invoices" />
        <StatCard icon={IconCoins} tone="green" valueClass="money-green" label="ABB Total" value={fmtBaht(stats.amount)} sub="VAT included" />
        <StatCard icon={IconFile} tone="amber" label="ABB VAT" value={fmtBaht(stats.vat)} sub="Included in the total" />
        <StatCard icon={IconReceipt} tone="violet" label="Average per ABB" value={fmtBaht2(stats.avg)} sub="Per receipt" />
      </div>

      <div className="stat-grid cols-3">
        <StatCard icon={IconFile} tone="blue" label="Full Tax Invoices" value={fmtNum(fullRequested)} sub="Requested at the booth" />
        <StatCard icon={IconReceipt} tone="amber" label="Cash / Online ABB" value={`${fmtNum(stats.cash)} / ${fmtNum(stats.online)}`} sub="By payment channel" />
      </div>

      <Panel
        title="ABB Daily Summary"
        sub="Abbreviated tax invoices per day, with running numbers"
        right={
          <div className="panel-filters">
            <button className="btn" disabled={!daily.length} onClick={() => exportCsv(dailyCols, dailyExport, `abb-summary-${siteShort}`)}>{t('CSV')}</button>
            <button className="btn" disabled={!daily.length} onClick={() => exportExcel(dailyCols, dailyExport, `abb-summary-${siteShort}`, 'ABB')}>{t('Excel')}</button>
          </div>
        }
      >
        <AsyncState query={summary} height={280} empty="No ABB receipts in this range.">
          {() => (
            <DataTable
              maxHeight={360}
              empty="No ABB receipts in this range."
              rows={daily.map((d) => ({ ...d, _key: d.day }))}
              columns={[
                { key: 'day', label: 'Date', render: (r) => fmtDate(`${r.day}T00:00:00`, { day: '2-digit', month: 'short', year: 'numeric' }) },
                { key: 'count', label: 'ABB Count', align: 'right', render: (r) => fmtNum(r.count) },
                { key: 'firstNo', label: 'First No.', render: (r) => r.firstNo || '—' },
                { key: 'lastNo', label: 'Last No.', render: (r) => r.lastNo || '—' },
                { key: 'net', label: 'Net', align: 'right', render: (r) => fmtBaht2(r.net) },
                { key: 'vat', label: 'VAT', align: 'right', render: (r) => fmtBaht2(r.vat) },
                { key: 'amount', label: 'Total', align: 'right', render: (r) => <strong>{fmtBaht2(r.amount)}</strong> },
                { key: 'cash', label: 'Cash', align: 'right', render: (r) => fmtNum(r.cash) },
                { key: 'online', label: 'Online', align: 'right', render: (r) => fmtNum(r.online) },
              ]}
            />
          )}
        </AsyncState>
      </Panel>

      <Panel
        title="ABB Receipts"
        sub="Every ABB receipt, and whether a full tax invoice was asked for"
        right={
          <div className="panel-filters">
            <label className="search-box">
              <IconSearch width={15} height={15} />
              <input className="input" placeholder={t('ABB no., plate or card')} value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          </div>
        }
      >
        <AsyncState query={receipts} height={280} empty="No ABB receipts match.">
          {() => (
            <DataTable
              maxHeight={420}
              empty="No ABB receipts match."
              rows={abbRows.map((tx) => ({ ...tx, _key: tx.abbNo }))}
              columns={[
                { key: 'abbNo', label: 'ABB No.', render: (r) => <strong>{r.abbNo}</strong> },
                { key: 'exitTime', label: 'Paid at', render: (r) => (r.exitTime ? fmtDateTime(r.exitTime) : '—') },
                { key: 'plate', label: 'License Plate', render: (r) => r.plate || '—' },
                { key: 'payment', label: 'Payment', render: (r) => r.payment || '—' },
                { key: 'vat', label: 'VAT', align: 'right', render: (r) => fmtBaht2(r.vat) },
                { key: 'total', label: 'Total', align: 'right', render: (r) => fmtBaht2(r.total) },
                {
                  // PkInvoicetemp.inv_full = 1 → the customer asked for a full
                  // tax invoice; the parking system issues it, not this page.
                  key: 'fullTaxInvoice',
                  label: 'Full invoice',
                  render: (r) => (r.fullTaxInvoice
                    ? <span className="pill ok">{t('Requested')}</span>
                    : <span className="pill inside">{t('Not requested')}</span>),
                },
              ]}
            />
          )}
        </AsyncState>
      </Panel>
    </>
  )
}
