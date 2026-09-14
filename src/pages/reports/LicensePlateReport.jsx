import { useCallback, useEffect, useRef, useState } from 'react'
import ReportPage from '../../components/ReportPage.jsx'
import Modal from '../../components/Modal.jsx'
import { reportsApi } from '../../lib/api.js'
import { useLang } from '../../lib/i18n.jsx'
import { fmtDateTime } from '../../lib/format.js'
import { OPT_ALL } from './reportHelpers.js'

/**
 * Plate reads from dbo.LPR_Log — every capture the cameras logged, with the
 * gate resolved from DoorList and the photo behind each row.
 *
 * The photo is not part of the report: LPR_Log stores only the path on the LPR
 * FTP server, so it is fetched one row at a time when the operator clicks.
 */
const readOptions = [
  OPT_ALL,
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
]

export default function LicensePlateReport() {
  const { t } = useLang()
  const [row, setRow] = useState(null)
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // A slow FTP fetch must not paint over a row the operator has since left.
  const abortRef = useRef(null)

  const close = useCallback(() => {
    abortRef.current?.abort()
    setRow(null)
    setImage(null)
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => () => abortRef.current?.abort(), [])

  const openRow = useCallback((clicked) => {
    abortRef.current?.abort()
    setRow(clicked)
    setImage(null)
    setError(null)

    if (!clicked.hasImage) {
      setError('This read has no capture on file.')
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)

    reportsApi.lprImage(clicked.id, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setImage(data?.image ?? null) })
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(err?.status === 404
          ? 'The capture is no longer on the image server.'
          : 'Could not load the capture from the image server.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
  }, [])

  return (
    <>
      <ReportPage
        reportKey="license-plate"
        title="License Plate Reading Issue"
        subtitle="Camera plate reads — click a row to see the capture"
        exportName="license-plate-reading-issue"
        onRowClick={openRow}
        filters={[
          { id: 'range', label: 'Date range', type: 'daterange', colSpan: 2 },
          { id: 'status', label: 'Reading', type: 'select', options: readOptions },
          { id: 'search', label: 'Search', type: 'text', placeholder: 'Plate, gate or camera IP' },
        ]}
      />

      <Modal
        open={!!row}
        title={row?.plate ? `${t('License plate')} ${row.plate}` : t('Unread plate')}
        sub={row ? [row.door, row.dateCome ? fmtDateTime(row.dateCome) : null].filter(Boolean).join(' · ') : undefined}
        onClose={close}
        width={720}
        footer={<button className="btn" onClick={close}>{t('Close')}</button>}
      >
        <div className="lpr-capture">
          {loading && <p className="muted">{t('Loading the capture…')}</p>}
          {!loading && error && <p className="muted">{t(error)}</p>}
          {!loading && !error && image && (
            <img src={image} alt={t('LPR capture')} className="lpr-capture-img" />
          )}
          {row?.fileName && <p className="lpr-capture-path">{row.fileName}</p>}
        </div>
      </Modal>
    </>
  )
}
