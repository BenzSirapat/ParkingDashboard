import { useLang } from '../lib/i18n.jsx'

// Shared Recharts tooltip styled to the design system.
export default function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter }) {
  const { t } = useLang()
  if (!active || !payload || !payload.length) return null
  return (
    <div className="viz-tooltip">
      <div className="tt-title">{labelFormatter ? labelFormatter(label) : label}</div>
      {payload.map((p) => (
        <div className="tt-row" key={p.dataKey}>
          <span className="tt-key">
            <i style={{ background: p.color || p.stroke || p.fill }} />
            {t(p.name)}
          </span>
          <span className="tt-val">
            {valueFormatter ? valueFormatter(p.value, p.dataKey) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}
