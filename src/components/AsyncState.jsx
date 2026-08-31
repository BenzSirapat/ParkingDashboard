import { EmptyState } from './ui.jsx'
import { useLang } from '../lib/i18n.jsx'

/** Inline spinner + message, used while a page waits for the API. */
export function Loading({ label = 'Loading…', height }) {
  const { t } = useLang()
  return (
    <div className="async-state" style={height ? { minHeight: height } : undefined}>
      <span className="spinner" aria-hidden="true" />
      <span>{t(label)}</span>
    </div>
  )
}

/** Error box with a retry, so a hiccup does not need a page reload. */
export function ErrorState({ error, onRetry, height }) {
  const { t } = useLang()
  return (
    <div className="async-state error" style={height ? { minHeight: height } : undefined} role="alert">
      <strong>{t('Could not load data')}</strong>
      <span>{error?.message || t('Unexpected error')}</span>
      {onRetry && <button className="btn" onClick={onRetry}>{t('Try again')}</button>}
    </div>
  )
}

/**
 * Wraps the loading / error / empty states around one API result so pages read
 * as "render the data" instead of a ladder of guards.
 */
export function AsyncState({ query, children, height = 220, empty = 'No data in this range.' }) {
  if (query.loading && query.data == null) return <Loading height={height} />
  if (query.error) return <ErrorState error={query.error} onRetry={query.reload} height={height} />
  if (query.data == null) return <EmptyState label={empty} />
  return children(query.data)
}
