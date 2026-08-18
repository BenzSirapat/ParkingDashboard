import { useSite, ALL_SITES } from '../lib/siteContext.jsx'
import { useLang } from '../lib/i18n.jsx'
import { IconBuilding } from './icons.jsx'

/**
 * Executive site picker (top bar). "All Sites" consolidates every site into a
 * single roll-up; picking one site narrows every dashboard, report and export.
 */
export default function SiteSwitcher() {
  const { siteId, setSiteId, sites, isAll } = useSite()
  const { t } = useLang()

  return (
    <label className={`site-switcher ${isAll ? 'all' : ''}`} title={t('Site')}>
      <IconBuilding width={16} height={16} />
      <select
        value={siteId}
        onChange={(e) => setSiteId(e.target.value)}
        aria-label={t('Site')}
      >
        <option value={ALL_SITES}>{t('All Sites')} ({sites.length})</option>
        {sites.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </label>
  )
}
