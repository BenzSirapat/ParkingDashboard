import { useEffect, useState } from 'react'
import { ApiError, authApi } from '../lib/api.js'
import { useLang } from '../lib/i18n.jsx'

const fill = (text, values) =>
  Object.entries(values).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), text)

const MIN_PASSWORD = 6

/**
 * Forgot password, shown in place of the sign-in card:
 *   1. username → an 8-digit OTP is e-mailed to the account
 *   2. OTP      → the API hands back a one-time reset token
 *   3. new password → `onCompleted(username, password)` signs in with it
 */
export default function ForgotPassword({ initialUsername = '', onCancel, onCompleted }) {
  const { t } = useLang()
  const [step, setStep] = useState('username') // username | code | password
  const [username, setUsername] = useState(initialUsername)
  const [code, setCode] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  /** Translates the API's message and adds the numbers it sent alongside. */
  function describe(err, fallback) {
    if (!(err instanceof ApiError)) return t(fallback)
    const data = err.body?.data
    if (data?.resendInSeconds) setResendIn(data.resendInSeconds)
    let message = t(err.message || fallback)
    if (data?.attemptsLeft) message += ' ' + fill(t('{n} tries left.'), { n: data.attemptsLeft })
    return message
  }

  async function sendCode(e) {
    e?.preventDefault()
    const name = username.trim()
    if (!name) return
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const res = await authApi.forgotPassword(name)
      setMaskedEmail(res.maskedEmail)
      setResendIn(res.resendInSeconds || 60)
      setInfo(fill(t('An OTP code was sent to {email}. It is valid for {min} minutes.'), {
        email: res.maskedEmail,
        min: Math.round((res.expiresInSeconds || 600) / 60),
      }))
      setCode('')
      setStep('code')
    } catch (err) {
      setError(describe(err, 'Could not send the OTP code.'))
    } finally {
      setLoading(false)
    }
  }

  async function verify(e) {
    e.preventDefault()
    if (!/^\d{8}$/.test(code.trim())) {
      setError(t('Please enter the 8-digit OTP code.'))
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await authApi.verifyResetCode(username.trim(), code.trim())
      setResetToken(res.resetToken)
      setInfo('')
      setPassword('')
      setConfirm('')
      setStep('password')
    } catch (err) {
      setError(describe(err, 'Could not verify the OTP code.'))
    } finally {
      setLoading(false)
    }
  }

  async function reset(e) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD) {
      setError(fill(t('The password must be at least {n} characters.'), { n: MIN_PASSWORD }))
      return
    }
    if (password !== confirm) {
      setError(t('The two passwords do not match.'))
      return
    }
    setError('')
    setLoading(true)
    try {
      await authApi.resetPassword(username.trim(), resetToken, password)
      // Keeps the spinner on while the sign-in finishes.
      await onCompleted(username.trim(), password)
    } catch (err) {
      setError(describe(err, 'Could not update the password.'))
      setLoading(false)
    }
  }

  const back = (
    <button type="button" className="login-link login-back" onClick={onCancel}>
      ← {t('Back to sign in')}
    </button>
  )

  if (step === 'password') {
    return (
      <form className="login-card" onSubmit={reset}>
        <h1>{t('Update password')}</h1>
        <p className="login-lead">{t('Set a new password for your account. You will be signed in right after.')}</p>

        <div className="field">
          <label>{t('Username')}</label>
          <input className="input" value={username} disabled />
        </div>
        <div className="field">
          <label htmlFor="np">{t('New password')}</label>
          <input
            id="np"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            autoFocus
            maxLength={100}
          />
        </div>
        <div className="field">
          <label htmlFor="cp">{t('Confirm new password')}</label>
          <input
            id="cp"
            type="password"
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            maxLength={100}
          />
        </div>

        {error && <div className="login-error">{error}</div>}

        <button className="btn primary login-submit" disabled={loading || !password || !confirm}>
          {loading ? t('Saving…') : t('Update password and sign in')}
        </button>
        {back}
      </form>
    )
  }

  if (step === 'code') {
    return (
      <form className="login-card" onSubmit={verify}>
        <h1>{t('Enter OTP code')}</h1>
        {info && <div className="login-info">{info}</div>}

        <div className="field">
          <label htmlFor="otp">{fill(t('8-digit OTP code (sent to {email})'), { email: maskedEmail })}</label>
          <input
            id="otp"
            className="input login-otp"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="________"
            maxLength={8}
            autoFocus
          />
        </div>

        {error && <div className="login-error">{error}</div>}

        <button className="btn primary login-submit" disabled={loading || code.length !== 8}>
          {loading ? t('Checking…') : t('Verify OTP code')}
        </button>
        <div className="login-links">
          <button type="button" className="login-link" disabled={loading || resendIn > 0} onClick={() => sendCode()}>
            {resendIn > 0 ? fill(t('Resend code in {n} s'), { n: resendIn }) : t('Resend code')}
          </button>
          <button type="button" className="login-link" onClick={() => { setStep('username'); setError(''); setInfo(''); setResendIn(0) }}>
            {t('Change username')}
          </button>
        </div>
        {back}
      </form>
    )
  }

  return (
    <form className="login-card" onSubmit={sendCode}>
      <h1>{t('Forgot password')}</h1>
      <p className="login-lead">{t('Enter your username. We will e-mail an 8-digit OTP code to the address on your account.')}</p>

      <div className="field">
        <label htmlFor="fu">{t('Username')}</label>
        <input
          id="fu"
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          placeholder={t('Username')}
          maxLength={50}
          autoFocus
        />
      </div>

      {error && <div className="login-error">{error}</div>}

      <button className="btn primary login-submit" disabled={loading || !username.trim() || resendIn > 0}>
        {loading
          ? t('Sending…')
          : resendIn > 0 ? fill(t('Request again in {n} s'), { n: resendIn }) : t('Send OTP code')}
      </button>
      {back}
    </form>
  )
}
