import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useLang } from '../lib/i18n.jsx'
import { roleLabel } from '../lib/roles.js'
import '../pages/dashboard.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The signed-in user's own account — lets any role change their e-mail. */
export default function AccountDialog({ open, onClose }) {
  const { user, updateEmail } = useAuth()
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) { setEmail(user?.email ?? ''); setError('') }
  }, [open, user?.email])

  const value = email.trim()
  const unchanged = value === (user?.email ?? '').trim()

  const close = () => { if (!saving) onClose() }

  async function save() {
    if (!EMAIL_RE.test(value) || value.length > 100) {
      setError('Please enter a valid e-mail address.')
      return
    }
    setSaving(true)
    const res = await updateEmail(value)
    setSaving(false)
    if (res.ok) onClose()
    else setError(res.error)
  }

  return (
    <Modal
      open={open}
      title="My account"
      sub="Member request notifications are sent to this e-mail"
      onClose={close}
      width={480}
      footer={
        <>
          <button className="btn" onClick={close} disabled={saving}>{t('Cancel')}</button>
          <button className="btn primary" onClick={save} disabled={saving || !value || unchanged}>
            {saving ? t('Saving…') : t('Save')}
          </button>
        </>
      }
    >
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); if (!unchanged) save() }}>
        {error && <div className="banner danger span-2">{t(error)}</div>}
        <div className="field">
          <label>{t('Username')}</label>
          <input className="input" value={user?.username ?? ''} disabled />
        </div>
        <div className="field">
          <label>{t('Role')}</label>
          <input className="input" value={t(roleLabel(user?.role))} disabled />
        </div>
        <div className="field span-2">
          <label htmlFor="account-email">{t('Email')}</label>
          <input
            id="account-email"
            className="input"
            type="email"
            autoComplete="email"
            maxLength={100}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>
      </form>
    </Modal>
  )
}
