import { RANGE_PRESETS } from '../lib/dateRange.js'
import { useLang } from '../lib/i18n.jsx'

/** Segmented preset picker for time ranges. */
export default function RangePicker({ value, onChange }) {
  const { t } = useLang()
  const active = typeof value === 'string' ? value : null
  return (
    <div className="segmented" role="tablist" aria-label="Time range">
      {RANGE_PRESETS.map((p) => (
        <button
          key={p.key}
          role="tab"
          aria-selected={active === p.key}
          className={active === p.key ? 'active' : ''}
          onClick={() => onChange(p.key)}
        >
          {t(p.label)}
        </button>
      ))}
    </div>
  )
}
