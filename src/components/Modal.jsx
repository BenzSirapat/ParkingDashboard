import { useEffect } from 'react'
import { useLang } from '../lib/i18n.jsx'

/** Centred dialog with a scrim. Escape and the scrim both close it. */
export default function Modal({ open, title, sub, onClose, footer, width = 520, children }) {
  const { t } = useLang()

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-scrim" onClick={onClose} role="presentation">
      <div
        className="modal"
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        aria-label={t(title || 'Dialog')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h3 className="modal-title">{t(title)}</h3>
            {sub && <p className="modal-sub">{t(sub)}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label={t('Close')}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

/** Small confirm dialog for destructive actions. */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onClose, busy }) {
  const { t } = useLang()
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      width={420}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>{t('Cancel')}</button>
          <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm} disabled={busy}>
            {t(confirmLabel)}
          </button>
        </>
      }
    >
      <p className="modal-message">{message}</p>
    </Modal>
  )
}
