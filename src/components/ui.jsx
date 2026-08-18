import { IconInbox } from './icons.jsx'
import { useLang } from '../lib/i18n.jsx'

export function Panel({ title, sub, right, children, className = '', ...rest }) {
  const { t } = useLang()
  return (
    <section className={`panel ${className}`} {...rest}>
      {(title || right) && (
        <div className="panel-head">
          <div>
            {title && <h3 className="panel-title">{t(title)}</h3>}
            {sub && <p className="panel-sub">{t(sub)}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

export function EmptyState({ label = 'No data' }) {
  const { t } = useLang()
  return (
    <div className="empty">
      <IconInbox width={40} height={40} />
      <span>{t(label)}</span>
    </div>
  )
}

/**
 * SVG donut chart. `segments` = [{ label, value, color }].
 */
export function Donut({ segments, size = 168, thickness = 20, centerTop, centerSub }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut chart">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-inset)" strokeWidth={thickness} />
      {segments.map((s, i) => {
        const frac = s.value / total
        const dash = frac * c
        const el = (
          <circle
            key={i}
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={s.color} strokeWidth={thickness}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dasharray .5s ease' }}
          />
        )
        offset += dash
        return el
      })}
      {centerTop && (
        <text x="50%" y="47%" textAnchor="middle" className="donut-num" style={{ fontSize: 24, fontWeight: 800, fill: 'var(--ink)' }}>{centerTop}</text>
      )}
      {centerSub && (
        <text x="50%" y="60%" textAnchor="middle" style={{ fontSize: 11, fill: 'var(--ink-muted)' }}>{centerSub}</text>
      )}
    </svg>
  )
}

export function DonutLegend({ items }) {
  const { t } = useLang()
  return (
    <div className="donut-legend">
      {items.map((it) => (
        <div className="donut-legend-row" key={it.label}>
          <span className="dl-key"><i style={{ background: it.color }} />{t(it.label)}</span>
          <span className="dl-val tnum">{it.value}</span>
        </div>
      ))}
    </div>
  )
}

/** Horizontal progress row (company usage, status breakdown). */
export function ProgressRow({ label, sub, value, pct, color = 'var(--brand)', right }) {
  return (
    <div className="prog-row">
      <div className="prog-top">
        <span className="prog-label" title={label}>{label}</span>
        <span className="prog-value tnum">{right ?? value}</span>
      </div>
      <div className="prog-bar"><span style={{ width: `${Math.min(100, pct)}%`, background: color }} /></div>
      {sub && <div className="prog-sub">{sub}</div>}
    </div>
  )
}

/**
 * Generic data table. `columns` = [{ key, label, align, render }].
 */
export function DataTable({ columns, rows, footer, empty = 'No data', maxHeight, onRowClick }) {
  const { t } = useLang()
  return (
    <div className="table-wrap" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
      {rows.length ? (
        <table className="data">
          <thead>
            <tr>{columns.map((c) => <th key={c.key} className={c.align === 'right' ? 'num' : ''}>{t(c.label)}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r._key ?? i}
                className={onRowClick ? 'clickable' : undefined}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={c.align === 'right' ? 'num tnum' : ''}>
                    {c.render ? c.render(r, i) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && <tfoot><tr>{footer}</tr></tfoot>}
        </table>
      ) : (
        <EmptyState label={empty} />
      )}
    </div>
  )
}
