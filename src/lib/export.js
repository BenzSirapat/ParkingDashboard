import * as XLSX from 'xlsx'

/**
 * @param {string[]} columns  header keys (also object keys)
 * @param {object[]} rows
 * @param {string}   filename  without extension
 */
export function exportCsv(columns, rows, filename) {
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = columns.map((c) => esc(c.label ?? c.key)).join(',')
  const body = rows
    .map((r) => columns.map((c) => esc(r[c.key])).join(','))
    .join('\n')
  const csv = '﻿' + header + '\n' + body // BOM for Excel Thai support
  download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`)
}

export function exportExcel(columns, rows, filename, sheetName = 'Sheet1') {
  const data = rows.map((r) => {
    const o = {}
    for (const c of columns) o[c.label ?? c.key] = r[c.key]
    return o
  })
  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = columns.map((c) => ({ wch: Math.max(12, (c.label ?? c.key).length + 4) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/**
 * "Export PDF" — opens a clean printable window; the user picks
 * "Save as PDF" from the browser print dialog. No extra dependency.
 */
export function exportPdf(columns, rows, filename, title = 'Report') {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  const thead = columns.map((c) => `<th>${esc(c.label ?? c.key)}</th>`).join('')
  const tbody = rows
    .map((r) => `<tr>${columns.map((c) => `<td>${esc(r[c.key])}</td>`).join('')}</tr>`)
    .join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(filename)}</title>
    <style>
      body{font-family:system-ui,"Segoe UI","Noto Sans Thai",sans-serif;color:#111;padding:28px}
      h1{font-size:18px;margin:0 0 4px} .sub{color:#666;font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #ddd;padding:7px 9px;text-align:left}
      th{background:#f3f4f6;font-weight:700}
      tr:nth-child(even) td{background:#fafafa}
    </style></head><body>
    <h1>${esc(title)}</h1><div class="sub">Singha Parking · ${new Date().toLocaleString()}</div>
    <table><thead><tr>${thead}</tr></thead><tbody>${tbody || `<tr><td colspan="${columns.length}">No data</td></tr>`}</tbody></table>
    <script>window.onload=()=>{window.print()}</script>
    </body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
}

function download(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
