import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { useLang } from '../lib/i18n.jsx'
import { IconCar } from '../components/icons.jsx'
import { LangFlag } from '../components/flags.jsx'
import './login.css'

export default function Login() {
  const { login } = useAuth()
  const { t, lang, toggle: toggleLang } = useLang()
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('parking123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await login(username.trim(), password)
    setLoading(false)
    if (res.ok) navigate('/', { replace: true })
    else setError(res.error)
  }

  return (
    <div className="login-page">
      <aside className="login-hero">
        <div className="hero-top">
          <span className="hero-mark"><IconCar width={26} height={26} /></span>
          <span className="hero-brand">Singha<strong>Parking</strong></span>
        </div>
        <div className="hero-body">
          <h2>{t('Welcome back')} 👋</h2>
          <p>
            {t('Monitor traffic, revenue and tenant validations across your parking complex — all in one friendly dashboard.')}
          </p>
          <ul className="hero-points">
            <li>{t('Real-time In / Out summary')}</li>
            <li>{t('Revenue & stamp-discount tracking')}</li>
            <li>{t('Per-tenant reports with CSV / Excel export')}</li>
          </ul>
        </div>
        <div className="hero-foot">© {new Date().getFullYear()} Singha Parking Systems</div>
        <div className="hero-glow" />
      </aside>

      <div className="login-panel">
        <button type="button" className="login-lang" onClick={toggleLang}>
          <LangFlag lang={lang} /> {lang === 'en' ? 'EN' : 'ไทย'}
        </button>
        <form className="login-card" onSubmit={onSubmit}>
          <h1>{t('Sign in')}</h1>
          <p className="login-lead">{t('Please sign in to access the dashboard.')}</p>

          <div className="field">
            <label htmlFor="u">{t('Username')}</label>
            <input
              id="u"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="admin"
            />
          </div>

          <div className="field">
            <label htmlFor="p">{t('Password')}</label>
            <input
              id="p"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="login-error">{t(error)}</div>}

          <button className="btn primary login-submit" disabled={loading}>
            {loading ? t('Signing in…') : t('Sign in')}
          </button>

          <div className="login-hint">
            {t('Demo credentials —')} <code>admin</code> / <code>parking123</code>
          </div>
        </form>
      </div>
    </div>
  )
}
