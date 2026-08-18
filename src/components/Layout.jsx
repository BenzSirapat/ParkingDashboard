import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { useTheme } from '../lib/useTheme.js'
import { useLang } from '../lib/i18n.jsx'
import { NAV_GROUPS, ALL_NAV } from '../nav.js'
import { IconLogout, IconSun, IconMoon, IconCar, IconMenu } from './icons.jsx'
import { LangFlag } from './flags.jsx'
import SiteSwitcher from './SiteSwitcher.jsx'
import { useSite } from '../lib/siteContext.jsx'
import './layout.css'

export default function Layout() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const { t, lang, toggle: toggleLang } = useLang()
  const { isAll, site } = useSite()
  const location = useLocation()
  const [open, setOpen] = useState(false) // mobile drawer

  const current = ALL_NAV.find((n) => location.pathname.startsWith(n.to))

  return (
    <div className={`shell ${open ? 'nav-open' : ''}`}>
      <div className="scrim" onClick={() => setOpen(false)} />

      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><IconCar width={22} height={22} /></span>
          <span className="brand-name">Singha<strong>Parking</strong></span>
        </div>

        <nav className="nav">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-group-label">{t(group.label)}</div>
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={`nav-item ${group.kind}`}
                  onClick={() => setOpen(false)}
                >
                  <Icon width={18} height={18} />
                  <span>{t(label)}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <span className="dot" /> {t('Live · demo dataset')}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn only-mobile" onClick={() => setOpen((v) => !v)} aria-label="Menu">
              <IconMenu />
            </button>
            <div>
              <h1 className="page-title">{t(current?.label ?? 'Dashboard')}</h1>
              <p className="page-sub">
                {isAll ? t('All sites consolidated · executive overview') : `${site.name} · ${t('site overview')}`}
              </p>
            </div>
          </div>

          <div className="topbar-actions">
            <SiteSwitcher />
            <button className="icon-btn lang-btn" title={t('Language')} onClick={toggleLang} aria-label={t('Language')}>
              <LangFlag lang={lang} />
              <span className="lang-code">{lang === 'en' ? 'EN' : 'ไทย'}</span>
            </button>
            <button className="icon-btn" onClick={toggle} title={t('Toggle theme')} aria-label={t('Toggle theme')}>
              {theme === 'light' ? <IconMoon /> : <IconSun />}
            </button>
            <div className="user-chip">
              <span className="avatar">{user?.name?.[0] ?? 'A'}</span>
              <span className="user-meta">
                <strong>{user?.name}</strong>
                <small>{t(user?.role)}</small>
              </span>
            </div>
            <button className="icon-btn" onClick={logout} title={t('Sign out')} aria-label={t('Sign out')}>
              <IconLogout />
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>

        <footer className="footer">
          © {new Date().getFullYear()} <strong>Singha Parking</strong> · {t('All rights reserved.')}
          <span className="footer-links">{t('Terms & Conditions · Privacy & Policy')}</span>
        </footer>
      </div>
    </div>
  )
}
