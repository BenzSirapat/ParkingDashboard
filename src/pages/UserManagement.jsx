import { useEffect, useMemo, useState } from 'react'
import { Panel, DataTable } from '../components/ui.jsx'
import Modal, { ConfirmDialog } from '../components/Modal.jsx'
import StatCard from '../components/StatCard.jsx'
import { AsyncState } from '../components/AsyncState.jsx'
import { IconUsers, IconUser, IconSearch } from '../components/icons.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useApi } from '../lib/useApi.js'
import { usersApi } from '../lib/api.js'
import { useMasterData } from '../lib/masterData.jsx'
import { ROLES, roleLabel } from '../lib/roles.js'
import { fmtDateTime } from '../lib/format.js'
import './dashboard.css'

const OPERATOR_TENANT = '0'

const EMPTY = { username: '', name: '', password: '', role: 'operator', email: '', ternCode: OPERATOR_TENANT, active: true }

/**
 * Dashboard accounts, backed by PkAdminweb through /api/users.
 * The role comes from `admin_level_id` via the API's `Roles` configuration —
 * see `src/lib/roles.js`.
 */
export default function UserManagement() {
  const { t } = useLang()
  const { user: me, canAdmin, refresh } = useAuth()
  const { tenants } = useMasterData()

  const query = useApi((signal) => usersApi.list(signal), [], { enabled: canAdmin })
  const users = query.data ?? []

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editing, setEditing] = useState(null)   // { mode: 'create' | 'edit', values }
  const [confirm, setConfirm] = useState(null)   // account pending deletion
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!notice) return undefined
    const id = setTimeout(() => setNotice(''), 3200)
    return () => clearTimeout(id)
  }, [notice])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users
      .filter((u) => (roleFilter === 'all' ? true : u.role === roleFilter))
      .filter((u) => !q || [u.username, u.name, u.email, u.tenantName].some((v) => (v || '').toLowerCase().includes(q)))
      .map((u) => ({ ...u, _key: u.id }))
  }, [users, search, roleFilter])

  const activeCount = users.filter((u) => u.active).length
  const adminCount = users.filter((u) => u.role === 'admin').length

  const openCreate = () => { setError(''); setEditing({ mode: 'create', values: { ...EMPTY } }) }
  const openEdit = (u) => {
    setError('')
    setEditing({ mode: 'edit', values: { ...u, password: '', ternCode: u.ternCode || OPERATOR_TENANT } })
  }

  /** Run a mutation, then re-read the list so the table matches the server. */
  const run = async (fn, message) => {
    setBusy(true)
    try {
      await fn()
      query.reload()
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
    const { mode, values } = editing
    const payload = {
      username: values.username?.trim(),
      name: values.name?.trim(),
      email: values.email?.trim() || null,
      role: values.role,
      ternCode: values.ternCode,
      active: values.active,
    }
    if (values.password) payload.password = values.password

    const ok = await run(
      () => (mode === 'create' ? usersApi.create(payload) : usersApi.update(values.id, payload)),
      mode === 'create' ? `${t('User created')} · ${payload.username}` : `${t('User updated')} · ${payload.username}`
    )
    if (ok) {
      setEditing(null)
      // An administrator can edit their own account — keep the session in step.
      if (mode === 'edit' && values.id === me?.adminId) refresh()
    }
  }

  const remove = async () => {
    const target = confirm
    setConfirm(null)
    await run(() => usersApi.remove(target.id), `${t('User deleted')} · ${target.username}`)
  }

  const toggleActive = (u) =>
    run(
      () => usersApi.update(u.id, { active: !u.active }),
      `${u.username} · ${t(u.active ? 'Disabled' : 'Enabled')}`
    )

  if (!canAdmin) {
    return (
      <Panel title="User Management" sub="Administrator access required">
        <div className="empty">{t('Your role does not allow managing user accounts.')}</div>
      </Panel>
    )
  }

  return (
    <>
      <div className="page-toolbar">
        <div>
          <div className="hint-label">{t('Dashboard user accounts')}</div>
          <div className="chips"><span className="chip">{users.length} {t('users')}</span><span className="chip">{activeCount} {t('active')}</span></div>
        </div>
        <button className="btn primary" onClick={openCreate} disabled={busy}>+ {t('Add user')}</button>
      </div>

      {notice && <div className="banner ok">{notice}</div>}
      {error && !editing && <div className="banner danger">{t(error)}</div>}

      <div className="stat-grid cols-3">
        <StatCard icon={IconUsers} tone="blue" label="Total Users" value={users.length} sub="Accounts on file" />
        <StatCard icon={IconUser} tone="green" label="Active Users" value={activeCount} sub="Can sign in" />
        <StatCard icon={IconUser} tone="amber" label="Administrators" value={adminCount} sub="Full access" />
      </div>

      <Panel
        title="Users"
        sub="Edit or delete a dashboard account"
        right={
          <div className="panel-filters">
            <label className="search-box">
              <IconSearch width={15} height={15} />
              <input
                className="input"
                placeholder={t('Search name, username, email')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select className="select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">{t('All roles')}</option>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{t(r.label)}</option>)}
            </select>
          </div>
        }
      >
        <AsyncState query={query} height={280} empty="No users match the search.">
          {() => (
            <DataTable
              rows={rows}
              empty="No users match the search."
              columns={[
                { key: 'name', label: 'Name', render: (r) => (<><strong>{r.name || r.username}</strong>{r.id === me?.adminId && <span className="pill ok" style={{ marginLeft: 8 }}>{t('You')}</span>}</>) },
                { key: 'username', label: 'Username' },
                { key: 'role', label: 'Role', render: (r) => <span className={`pill role-${r.role}`}>{t(roleLabel(r.role))}</span> },
                { key: 'tenantName', label: 'Tenant', render: (r) => r.tenantName || (r.ternCode && r.ternCode !== OPERATOR_TENANT ? r.ternCode : t('Whole property')) },
                { key: 'email', label: 'Email', render: (r) => r.email || '—' },
                { key: 'active', label: 'Status', render: (r) => <span className={`pill ${r.active ? 'ok' : 'inside'}`}>{t(r.active ? 'Active' : 'Disabled')}</span> },
                { key: 'updatedAt', label: 'Last change', render: (r) => (r.updatedAt ? fmtDateTime(r.updatedAt) : '—') },
                {
                  key: 'actions',
                  label: 'Actions',
                  align: 'right',
                  render: (r) => (
                    <div className="row-actions">
                      <button className="btn tiny" onClick={() => openEdit(r)} disabled={busy}>{t('Edit')}</button>
                      <button className="btn tiny" onClick={() => toggleActive(r)} disabled={busy}>{t(r.active ? 'Disable' : 'Enable')}</button>
                      <button
                        className="btn tiny danger"
                        onClick={() => setConfirm(r)}
                        disabled={busy || r.id === me?.adminId}
                        title={r.id === me?.adminId ? t('You cannot delete your own account.') : t('Delete')}
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
        title={editing?.mode === 'create' ? 'Add user' : 'Edit user'}
        sub={editing?.mode === 'edit' ? 'Leave the password blank to keep the current one' : 'Create a new dashboard account'}
        onClose={() => { if (!busy) { setEditing(null); setError('') } }}
        width={620}
        footer={
          <>
            <button className="btn" onClick={() => { setEditing(null); setError('') }} disabled={busy}>{t('Cancel')}</button>
            <button className="btn primary" onClick={save} disabled={busy}>{busy ? t('Saving…') : t('Save')}</button>
          </>
        }
      >
        {editing && (
          <UserForm
            values={editing.values}
            mode={editing.mode}
            error={error}
            tenants={tenants}
            onChange={(patch) => setEditing((e) => ({ ...e, values: { ...e.values, ...patch } }))}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title="Delete user"
        danger
        confirmLabel="Delete"
        message={confirm ? `${t('Delete the account')} “${confirm.name || confirm.username}” (${confirm.username})? ${t('This cannot be undone.')}` : ''}
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />
    </>
  )
}

function UserForm({ values, mode, error, tenants, onChange }) {
  const { t } = useLang()
  return (
    <div className="form-grid">
      {error && <div className="banner danger span-2">{t(error)}</div>}

      <div className="field">
        <label>{t('Full name')}</label>
        <input className="input" value={values.name ?? ''} onChange={(e) => onChange({ name: e.target.value })} />
      </div>
      <div className="field">
        <label>{t('Username')}</label>
        <input className="input" value={values.username ?? ''} onChange={(e) => onChange({ username: e.target.value })} />
      </div>

      <div className="field">
        <label>{mode === 'create' ? t('Password') : t('New password')}</label>
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          placeholder={mode === 'edit' ? t('Unchanged') : ''}
          value={values.password ?? ''}
          onChange={(e) => onChange({ password: e.target.value })}
        />
      </div>
      <div className="field">
        <label>{t('Role')}</label>
        <select className="select" value={values.role} onChange={(e) => onChange({ role: e.target.value })}>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{t(r.label)}</option>)}
        </select>
      </div>

      <div className="field span-2">
        <label>{t('Email')}</label>
        <input className="input" type="email" value={values.email ?? ''} onChange={(e) => onChange({ email: e.target.value })} />
      </div>

      <div className="field">
        <label>{t('Tenant')}</label>
        <select className="select" value={values.ternCode ?? OPERATOR_TENANT} onChange={(e) => onChange({ ternCode: e.target.value })}>
          <option value={OPERATOR_TENANT}>{t('Whole property (operator)')}</option>
          {tenants.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <small className="muted">{t('A tenant account only ever sees its own transactions.')}</small>
      </div>
      <div className="field">
        <label>{t('Status')}</label>
        <label className="check-row">
          <input type="checkbox" checked={values.active !== false} onChange={(e) => onChange({ active: e.target.checked })} />
          <span>{t('Account is active (can sign in)')}</span>
        </label>
      </div>
    </div>
  )
}
