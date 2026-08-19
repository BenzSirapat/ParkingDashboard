import { useState } from 'react'
import { QUICK_PRESETS, LONG_PRESETS } from '../lib/dateRange.js'
import { useLang } from '../lib/i18n.jsx'
import { IconClock } from './icons.jsx'

const iso = (d) => {
  const x = new Date(d)
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset())
  return x.toISOString().slice(0, 10)
}

/**
 * Time-range picker: quick segments, a dropdown for the longer accumulated
 * ranges (month / year to date / 12 months) and a free custom range.
 */
export default function RangePicker({ value, onChange }) {
  const { t } = useLang()
  const isCustom = value && typeof value === 'object' && value.custom
  const active = typeof value === 'string' ? value : null
  const [showCustom, setShowCustom] = useState(!!isCustom)
  const [from, setFrom] = useState(isCustom ? value.from : iso(Date.now() - 6 * 86400000))
  const [to, setTo] = useState(isCustom ? value.to : iso(Date.now()))

  const applyCustom = (f, tt) => {
    setFrom(f); setTo(tt)
    if (f && tt) onChange({ custom: true, from: f, to: tt })
  }

  const longActive = LONG_PRESETS.some((p) => p.key === active)

  return (
    <div className="range-picker">
      <div className="segmented" role="tablist" aria-label="Time range">
        {QUICK_PRESETS.map((p) => (
          <button
            key={p.key}
            role="tab"
            aria-selected={active === p.key}
            className={active === p.key ? 'active' : ''}
            onClick={() => { setShowCustom(false); onChange(p.key) }}
          >
            {t(p.label)}
          </button>
        ))}
      </div>

      <select
        className="select range-more"
        value={longActive ? active : ''}
        onChange={(e) => { if (e.target.value) { setShowCustom(false); onChange(e.target.value) } }}
        aria-label={t('Accumulated range')}
      >
        <option value="">{t('Accumulated…')}</option>
        {LONG_PRESETS.map((p) => (
          <option key={p.key} value={p.key}>{t(p.label)}</option>
        ))}
      </select>

      <button
        className={`btn range-custom-btn ${isCustom ? 'primary' : ''}`}
        onClick={() => {
          const next = !showCustom
          setShowCustom(next)
          if (next) applyCustom(from, to)
        }}
        title={t('Custom range')}
      >
        <IconClock width={15} height={15} /> {t('Custom')}
      </button>

      {showCustom && (
        <div className="range-custom">
          <input type="date" className="input" value={from} max={to} onChange={(e) => applyCustom(e.target.value, to)} />
          <span className="muted">→</span>
          <input type="date" className="input" value={to} min={from} onChange={(e) => applyCustom(from, e.target.value)} />
        </div>
      )}
    </div>
  )
}
