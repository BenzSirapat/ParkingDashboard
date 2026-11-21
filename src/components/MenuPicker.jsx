import { useLang } from '../lib/i18n.jsx'

/**
 * Menu on/off switches, grouped like the sidebar. `menus` is the catalogue from
 * GET /permissions ({ key, group, label, adminOnly }); `value` the keys switched on.
 * Administration menus need the admin role whatever is ticked, so they are shown
 * but locked.
 */
export default function MenuPicker({ menus, value, onChange, disabled }) {
  const { t } = useLang()
  const on = new Set(value ?? [])
  const groups = []
  for (const m of menus ?? []) {
    let g = groups.find((x) => x.name === m.group)
    if (!g) groups.push((g = { name: m.group, items: [] }))
    g.items.push(m)
  }

  const set = (keys, checked) => {
    const next = new Set(on)
    for (const k of keys) (checked ? next.add(k) : next.delete(k))
    // Keep the catalogue order.
    onChange((menus ?? []).map((m) => m.key).filter((k) => next.has(k)))
  }

  return (
    <div className="perm-groups">
      {groups.map((g) => {
        const keys = g.items.filter((m) => !m.adminOnly).map((m) => m.key)
        const all = keys.length > 0 && keys.every((k) => on.has(k))
        return (
          <div className="perm-group" key={g.name}>
            <h5>
              {t(g.name)}
              {keys.length > 0 && !disabled && (
                <button type="button" className="btn tiny ghost" onClick={() => set(keys, !all)}>
                  {t(all ? 'Switch all off' : 'Switch all on')}
                </button>
              )}
            </h5>
            <div className="perm-menus">
              {g.items.map((m) => (
                <label
                  key={m.key}
                  className={`perm-menu ${on.has(m.key) || m.adminOnly ? 'on' : ''} ${m.adminOnly ? 'locked' : ''}`}
                  title={m.adminOnly ? t('Administrators only') : m.key}
                >
                  <input
                    type="checkbox"
                    checked={m.adminOnly ? false : on.has(m.key)}
                    disabled={disabled || m.adminOnly}
                    onChange={(e) => set([m.key], e.target.checked)}
                  />
                  <span>{t(m.label)}{m.adminOnly ? ` · ${t('Administrators only')}` : ''}</span>
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
