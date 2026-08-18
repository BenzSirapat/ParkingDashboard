import { useLang } from '../lib/i18n.jsx'

export default function StatCard({ icon: Icon, label, value, sub, tone = 'blue', valueClass = '', delta }) {
  const { t } = useLang()
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-icon"><Icon width={22} height={22} /></div>
      <div className="stat-body">
        <span className="stat-label">{t(label)}</span>
        <span className={`stat-value tnum ${valueClass}`}>{value}</span>
        <div className="stat-foot">
          {delta != null && (
            <span className={`badge ${delta >= 0 ? 'up' : 'down'}`}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
            </span>
          )}
          {sub && <span className="stat-sub">{t(sub)}</span>}
        </div>
      </div>
    </div>
  )
}
