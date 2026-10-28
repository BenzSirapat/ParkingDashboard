import { useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useSite } from '../lib/siteContext.jsx'
import { IconCar } from '../components/icons.jsx'
import { LangFlag } from '../components/flags.jsx'
import ParkingHeroArt from '../components/ParkingHeroArt.jsx'
import './login.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Shown in place of the dashboard while the signed-in account has no e-mail
 * (PkAdminsystem.Email) — member request notifications go to that address.
 */
export default function RequireEmail() {
  const { user, updateEmail, logout } = useAuth()
  const { t, lang, toggle: toggleLang } = useLang()
  const { site } = useSite()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const value = email.trim()

  async function onSubmit(e) {
    e.preventDefault()
    if (!EMAIL_RE.test(value) || value.length > 100) {
      setError('Please enter a valid e-mail address.')
      return
    }
    setError('')
    setSaving(true)
    const res = await updateEmail(value)
    setSaving(false)
    if (!res.ok) setError(res.error)
  }

  return (
    <div className="login-page">
      <aside className="login-hero">
        <div className="hero-top">
          <span className="hero-mark"><IconCar width={26} height={26} /></span>
          <span className="hero-brand">Singha<strong>Parking</strong></span>
        </div>
        <div className="hero-body">
          <ParkingHeroArt className="hero-art" />
        </div>
        <div className="hero-foot">{site.name} · © {new Date().getFullYear()} Singha Parking Systems</div>
        <div className="hero-glow" />
      </aside>

      <div className="login-panel">
        <button type="button" className="login-lang" onClick={toggleLang}>
          <LangFlag lang={lang} /> {lang === 'en' ? 'EN' : 'ไทย'}
        </button>
        <form className="login-card" onSubmit={onSubmit}>
          <h1>{t('Add your e-mail')}</h1>
          <p className="login-lead">
            {t('Your account has no e-mail yet. Please add one to continue to the dashboard.')}
          </p>

          <div className="field">
            <label>{t('Username')}</label>
            <input className="input" value={user?.username ?? ''} disabled />
          </div>

          <div className="field">
            <label htmlFor="email">{t('Email')}</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="name@example.com"
              maxLength={100}
              autoFocus
            />
          </div>

          {error && <div className="login-error">{t(error)}</div>}

          <button className="btn primary login-submit" disabled={saving || !value}>
            {saving ? t('Saving…') : t('Save and continue')}
          </button>

          <button type="button" className="btn login-submit" onClick={logout} disabled={saving}>
            {t('Sign out')}
          </button>
        </form>
      </div>
    </div>
  )
}
