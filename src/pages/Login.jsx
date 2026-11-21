import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useSite } from '../lib/siteContext.jsx'
import { IconCar } from '../components/icons.jsx'
import { LangFlag } from '../components/flags.jsx'
import ParkingHeroArt from '../components/ParkingHeroArt.jsx'
import ForgotPassword from './ForgotPassword.jsx'
import './login.css'

export default function Login() {
  const { login } = useAuth()
  const { t, lang, toggle: toggleLang } = useLang()
  const { site } = useSite()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgot, setForgot] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await login(username.trim(), password)
    setLoading(false)
    if (res.ok) navigate('/', { replace: true })
    else setError(res.error)
  }

  /** The password was reset through the e-mailed OTP — carry on signing in with it. */
  async function onResetCompleted(name, newPassword) {
    const res = await login(name, newPassword)
    if (res.ok) {
      navigate('/', { replace: true })
      return
    }
    setForgot(false)
    setUsername(name)
    setPassword('')
    setError(res.error)
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
        {forgot ? (
          <ForgotPassword
            initialUsername={username.trim()}
            onCancel={() => setForgot(false)}
            onCompleted={onResetCompleted}
          />
        ) : (
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
              placeholder={t('Username')}
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
            <button type="button" className="login-link login-forgot" onClick={() => { setError(''); setForgot(true) }}>
              {t('Forgot password?')}
            </button>
          </div>

          {error && <div className="login-error">{t(error)}</div>}

          <button className="btn primary login-submit" disabled={loading || !username.trim() || !password}>
            {loading ? t('Signing in…') : t('Sign in')}
          </button>

          <div className="login-hint">
            {t('Sign in with your parking system account.')}
          </div>
        </form>
        )}
      </div>
    </div>
  )
}
