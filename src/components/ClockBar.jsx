import { useServerClock, clockTime, clockDate, driftLabel, SERVER_TZ } from '../lib/serverTime.js'
import { useLang } from '../lib/i18n.jsx'
import { IconClock } from './icons.jsx'

const localTz = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return '' }
}

/**
 * Twin clock for the top bar — parking server time next to the workstation's
 * current time, with the drift between them.
 */
export default function ClockBar() {
  const { t } = useLang()
  const { server, local, offset, synced, latency } = useServerClock()
  const drift = driftLabel(offset)
  const inSync = Math.abs(offset) < 60000

  return (
    <div
      className={`clock-bar ${synced ? '' : 'offline'}`}
      title={`${t('Server time')} (${SERVER_TZ}) · ${t('Latency')} ${latency}ms`}
    >
      <span className="clock-icon"><IconClock width={16} height={16} /></span>

      <div className="clock-col">
        <span className="clock-label">
          <i className={`clock-dot ${synced ? 'on' : 'off'}`} />
          {t('Server time')}
        </span>
        <span className="clock-time tnum">{clockTime(server, SERVER_TZ)}</span>
        <span className="clock-date">{clockDate(server, SERVER_TZ)}</span>
      </div>

      <span className="clock-sep" />

      <div className="clock-col">
        <span className="clock-label">{t('Current time')}</span>
        <span className="clock-time tnum">{clockTime(local)}</span>
        <span className="clock-date">{localTz()}</span>
      </div>

      <span className={`clock-drift ${inSync ? 'ok' : 'warn'}`}>{drift === 'in sync' ? t('in sync') : drift}</span>
    </div>
  )
}
