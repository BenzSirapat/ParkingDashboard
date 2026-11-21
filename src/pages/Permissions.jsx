import { useEffect, useState } from 'react'
import { Panel, DataTable } from '../components/ui.jsx'
import Modal, { ConfirmDialog } from '../components/Modal.jsx'
import { AsyncState } from '../components/AsyncState.jsx'
import MenuPicker from '../components/MenuPicker.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useApi } from '../lib/useApi.js'
import { permissionsApi } from '../lib/api.js'
import { fmtDateTime } from '../lib/format.js'
import './dashboard.css'
import './memberApproval.css'

const EMPTY = { name: '', description: '', menus: [], active: true }

/**
 * Permission groups — which menus each group of dashboard accounts may open.
 * Accounts are put into a group (or given their own menu list) in User
 * Management. Accounts without a group keep every menu but Administration;
 * administrators always see everything. The API enforces the same list on the
 * reports, barriers and member approval / import endpoints.
 */
export default function Permissions() {
  const { t } = useLang()
  const { canAdmin, refresh } = useAuth()
  const query = useApi((signal) => permissionsApi.overview(signal), [], { enabled: canAdmin })
  const data = query.data
  const menuLabel = (key) => data?.menus?.find((m) => m.key === key)?.label ?? key

  const [editing, setEditing] = useState(null)   // { id?, values }
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!notice) return undefined
    const id = setTimeout(() => setNotice(''), 3200)
    return () => clearTimeout(id)
  }, [notice])

  const run = async (fn, message) => {
    setBusy(true)
    try {
      await fn()
      query.reload()
      refresh() // your own menus may have changed
      setError('')
      setNotice(message)
      return true
    } catch (err) {
      setError(err?.message || 'The request failed.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    const { id, values } = editing
    const body = { name: values.name.trim(), description: values.description?.trim() || null, menus: values.menus, active: values.active }
    const ok = await run(
      () => (id ? permissionsApi.updateGroup(id, body) : permissionsApi.createGroup(body)),
      `${t(id ? 'Group updated' : 'Group created')} · ${body.name}`
    )
    if (ok) setEditing(null)
  }

  if (!canAdmin) {
    return (
      <Panel title="Permissions" sub="Administrator access required">
        <div className="empty">{t('Your role does not allow managing permissions.')}</div>
      </Panel>
    )
  }

  return (
    <>
      <div className="page-toolbar">
        <div>
          <div className="hint-label">{t('Switch menus on or off per permission group, then put accounts into a group in User Management.')}</div>
          <div className="chips">
            <span className="chip">{t('No group = every menu but Administration')}</span>
            <span className="chip">{t('Administrators always see every menu')}</span>
            <span className="chip">{t('A user can also get their own menu list')}</span>
          </div>
        </div>
        <button
          className="btn primary"
          disabled={busy || data?.ready === false}
          onClick={() => { setError(''); setEditing({ values: { ...EMPTY, menus: [...(data?.defaultMenus ?? [])] } }) }}
        >
          + {t('Add group')}
        </button>
      </div>

      {notice && <div className="banner ok">{notice}</div>}
      {error && !editing && <div className="banner danger">{t(error)}</div>}
      {data?.ready === false && (
        <div className="banner warn">
          {t('The permission tables are missing — run StampAPI/Scripts/2026-11-21_MemberExcelImportAndDashboardPermission.sql first.')}
        </div>
      )}

      <Panel title="Permission groups" sub="Menus each group may open">
        <AsyncState query={query} height={240} empty="No permission groups yet.">
          {() => (
            <DataTable
              rows={(data?.groups ?? []).map((g) => ({ ...g, _key: g.id }))}
              empty="No permission groups yet."
              columns={[
                {
                  key: 'name',
                  label: 'Group',
                  render: (g) => (
                    <>
                      <strong>{g.name}</strong>
                      {g.description && <small className="muted ma-granted">{g.description}</small>}
                    </>
                  ),
                },
                {
                  key: 'menus',
                  label: 'Menus switched on',
                  render: (g) => (
                    <div className="perm-chips">
                      {g.menus.length ? g.menus.map((k) => <span key={k} className="pill">{t(menuLabel(k))}</span>) : <span className="muted">{t('None')}</span>}
                    </div>
                  ),
                },
                { key: 'userCount', label: 'Users', align: 'right' },
                { key: 'active', label: 'Status', render: (g) => <span className={`pill ${g.active ? 'ok' : 'inside'}`}>{t(g.active ? 'Active' : 'Disabled')}</span> },
                { key: 'updatedAt', label: 'Last change', render: (g) => (g.updatedAt ? `${fmtDateTime(g.updatedAt)}${g.updatedBy ? ` · ${g.updatedBy}` : ''}` : '—') },
                {
                  key: 'actions',
                  label: 'Actions',
                  align: 'right',
                  render: (g) => (
                    <div className="row-actions">
                      <button className="btn tiny" disabled={busy} onClick={() => { setError(''); setEditing({ id: g.id, values: { name: g.name, description: g.description ?? '', menus: [...g.menus], active: g.active } }) }}>
                        {t('Edit')}
                      </button>
                      <button
                        className="btn tiny danger"
                        disabled={busy || g.userCount > 0}
                        title={g.userCount > 0 ? t('Move its users to another group first.') : t('Delete')}
                        onClick={() => setConfirm(g)}
                      >
                        {t('Delete')}
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </AsyncState>
      </Panel>

      <Modal
        open={!!editing}
        title={editing?.id ? 'Edit permission group' : 'Add permission group'}
        sub="Tick the menus this group may open"
        width={860}
        onClose={() => { if (!busy) { setEditing(null); setError('') } }}
        footer={
          <>
            <button className="btn" onClick={() => { setEditing(null); setError('') }} disabled={busy}>{t('Cancel')}</button>
            <button className="btn primary" onClick={save} disabled={busy || !editing?.values.name.trim()}>{busy ? t('Saving…') : t('Save')}</button>
          </>
        }
      >
        {editing && (
          <div className="form-grid">
            {error && <div className="banner danger span-2">{t(error)}</div>}
            <div className="field">
              <label>{t('Group name')}</label>
              <input className="input" value={editing.values.name} onChange={(e) => setEditing((x) => ({ ...x, values: { ...x.values, name: e.target.value } }))} />
            </div>
            <div className="field">
              <label>{t('Status')}</label>
              <select
                className="select"
                value={editing.values.active ? '1' : '0'}
                onChange={(e) => setEditing((x) => ({ ...x, values: { ...x.values, active: e.target.value === '1' } }))}
              >
                <option value="1">{t('Active')}</option>
                <option value="0">{t('Disabled — its users see no menu')}</option>
              </select>
            </div>
            <div className="field span-2">
              <label>{t('Description')}</label>
              <input className="input" value={editing.values.description} onChange={(e) => setEditing((x) => ({ ...x, values: { ...x.values, description: e.target.value } }))} />
            </div>
            <div className="field span-2">
              <label>{t('Menus')} ({editing.values.menus.length})</label>
              <MenuPicker
                menus={data?.menus}
                value={editing.values.menus}
                onChange={(menus) => setEditing((x) => ({ ...x, values: { ...x.values, menus } }))}
              />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title="Delete permission group"
        danger
        confirmLabel="Delete"
        busy={busy}
        message={confirm ? `${t('Delete the group')} “${confirm.name}”?` : ''}
        onConfirm={async () => { const g = confirm; setConfirm(null); await run(() => permissionsApi.removeGroup(g.id), `${t('Group deleted')} · ${g.name}`) }}
        onClose={() => setConfirm(null)}
      />
    </>
  )
}
