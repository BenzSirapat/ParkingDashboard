import { useCallback, useEffect, useMemo, useState } from 'react'
import { Panel, DataTable } from '../components/ui.jsx'
import Modal, { ConfirmDialog } from '../components/Modal.jsx'
import StatCard from '../components/StatCard.jsx'
import { IconUsers, IconUser, IconSearch } from '../components/icons.jsx'
import { useLang } from '../lib/i18n.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import {
  listUsers, createUser, updateUser, deleteUser, ROLES, roleLabel,
} from '../lib/usersStore.js'
import { SITES } from '../data/mockData.js'
import { fmtDateTime } from '../lib/format.js'
import './dashboard.css'

const EMPTY = { username: '', name: '', password: '', role: 'operator', email: '', phone: '', siteId: 'all', active: true }

export default function UserManagement() {
  const { t } = useLang()
  const { user: me, canAdmin, refresh } = useAuth()

  const [users, setUsers] = useState(() => listUsers())
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editing, setEditing] = useState(null)   // { mode: 'create' | 'edit', values }
  const [confirm, setConfirm] = useState(null)   // user pending deletion
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const reload = useCallback(() => {
    setUsers(listUsers())
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!notice) return undefined
    const id = setTimeout(() => setNotice(''), 3200)
    return () => clearTimeout(id)
  }, [notice])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users
      .filter((u) => (roleFilter === 'all' ? true : u.role === roleFilter))
      .filter((u) => !q || [u.username, u.name, u.email, u.phone].some((v) => (v || '').toLowerCase().includes(q)))
      .map((u) => ({ ...u, _key: u.id }))
  }, [users, query, roleFilter])

  const activeCount = users.filter((u) => u.active).length
  const adminCount = users.filter((u) => u.role === 'admin').length

  const openCreate = () => { setError(''); setEditing({ mode: 'create', values: { ...EMPTY } }) }
  const openEdit = (u) => { setError(''); setEditing({ mode: 'edit', values: { ...u, password: '' } }) }

  const save = () => {
    const { mode, values } = editing
    const res = mode === 'create' ? createUser(values) : updateUser(values.id, values)
    if (!res.ok) { setError(res.error); return }
    setEditing(null)
    setError('')
    reload()
    setNotice(mode === 'create' ? `${t('User created')} · ${values.username}` : `${t('User updated')} · ${values.username}`)
  }

  const remove = () => {
    const res = deleteUser(confirm.id)
    if (!res.ok) { setError(res.error); setConfirm(null); return }
    setConfirm(null)
    reload()
    setNotice(`${t('User deleted')} · ${confirm.username}`)
  }

  const toggleActive = (u) => {
    const res = updateUser(u.id, { active: !u.active })
    if (!res.ok) { setError(res.error); return }
    reload()
    setNotice(`${u.username} · ${t(u.active ? 'Disabled' : 'Enabled')}`)
  }

  if (!canAdmin) {
    return (
      <Panel title="User Management" sub="Administrator access required">
        <div className="empty">{t('Your role does not allow managing user accounts.')}</div>
      </Panel>
    )
  }

  const siteLabel = (id) => (id === 'all' ? t('All Sites') : SITES.find((s) => s.id === id)?.name ?? '—')

  return (
    <>
      <div className="page-toolbar">
        <div>
          <div className="hint-label">{t('Dashboard user accounts')}</div>
          <div className="chips"><span className="chip">{users.length} {t('users')}</span><span className="chip">{activeCount} {t('active')}</span></div>
        </div>
        <button className="btn primary" onClick={openCreate}>+ {t('Add user')}</button>
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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select className="select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">{t('All roles')}</option>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{t(r.label)}</option>)}
            </select>
          </div>
        }
      >
        <DataTable
          rows={rows}
          empty="No users match the search."
          columns={[
            { key: 'name', label: 'Name', render: (r) => (<><strong>{r.name}</strong>{r.id === me?.id && <span className="pill ok" style={{ marginLeft: 8 }}>{t('You')}</span>}</>) },
            { key: 'username', label: 'Username' },
            { key: 'role', label: 'Role', render: (r) => <span className={`pill role-${r.role}`}>{t(roleLabel(r.role))}</span> },
            { key: 'siteId', label: 'Site', render: (r) => siteLabel(r.siteId) },
            { key: 'email', label: 'Email', render: (r) => r.email || '—' },
            { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
            { key: 'active', label: 'Status', render: (r) => <span className={`pill ${r.active ? 'ok' : 'inside'}`}>{t(r.active ? 'Active' : 'Disabled')}</span> },
            { key: 'updatedAt', label: 'Last change', render: (r) => (r.updatedAt ? fmtDateTime(r.updatedAt) : '—') },
            {
              key: 'actions',
              label: 'Actions',
              align: 'right',
              render: (r) => (
                <div className="row-actions">
                  <button className="btn tiny" onClick={() => openEdit(r)}>{t('Edit')}</button>
                  <button className="btn tiny" onClick={() => toggleActive(r)}>{t(r.active ? 'Disable' : 'Enable')}</button>
                  <button
                    className="btn tiny danger"
                    onClick={() => setConfirm(r)}
                    disabled={r.id === me?.id}
                    title={r.id === me?.id ? t('You cannot delete your own account.') : t('Delete')}
                  >
                    {t('Delete')}
                  </button>
                </div>
              ),
            },
          ]}
        />
      </Panel>

      <Modal
        open={!!editing}
        title={editing?.mode === 'create' ? 'Add user' : 'Edit user'}
        sub={editing?.mode === 'edit' ? 'Leave the password blank to keep the current one' : 'Create a new dashboard account'}
        onClose={() => { setEditing(null); setError('') }}
        width={620}
        footer={
          <>
            <button className="btn" onClick={() => { setEditing(null); setError('') }}>{t('Cancel')}</button>
            <button className="btn primary" onClick={save}>{t('Save')}</button>
          </>
        }
      >
        {editing && (
          <UserForm
            values={editing.values}
            mode={editing.mode}
            error={error}
            onChange={(patch) => setEditing((e) => ({ ...e, values: { ...e.values, ...patch } }))}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title="Delete user"
        danger
        confirmLabel="Delete"
        message={confirm ? `${t('Delete the account')} “${confirm.name}” (${confirm.username})? ${t('This cannot be undone.')}` : ''}
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />
    </>
  )
}

function UserForm({ values, mode, error, onChange }) {
  const { t } = useLang()
  return (
    <div className="form-grid">
      {error && <div className="banner danger span-2">{t(error)}</div>}

      <div className="field">
        <label>{t('Full name')}</label>
        <input className="input" value={values.name} onChange={(e) => onChange({ name: e.target.value })} />
      </div>
      <div className="field">
        <label>{t('Username')}</label>
        <input className="input" value={values.username} onChange={(e) => onChange({ username: e.target.value })} />
      </div>

      <div className="field">
        <label>{mode === 'create' ? t('Password') : t('New password')}</label>
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          placeholder={mode === 'edit' ? t('Unchanged') : ''}
          value={values.password}
          onChange={(e) => onChange({ password: e.target.value })}
        />
      </div>
      <div className="field">
        <label>{t('Role')}</label>
        <select className="select" value={values.role} onChange={(e) => onChange({ role: e.target.value })}>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{t(r.label)}</option>)}
        </select>
      </div>

      <div className="field">
        <label>{t('Email')}</label>
        <input className="input" type="email" value={values.email} onChange={(e) => onChange({ email: e.target.value })} />
      </div>
      <div className="field">
        <label>{t('Phone')}</label>
        <input className="input" value={values.phone} onChange={(e) => onChange({ phone: e.target.value })} />
      </div>

      <div className="field">
        <label>{t('Assigned site')}</label>
        <select className="select" value={values.siteId} onChange={(e) => onChange({ siteId: e.target.value })}>
          <option value="all">{t('All Sites')}</option>
          {SITES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="field">
        <label>{t('Status')}</label>
        <label className="check-row">
          <input type="checkbox" checked={values.active} onChange={(e) => onChange({ active: e.target.checked })} />
          <span>{t('Account is active (can sign in)')}</span>
        </label>
      </div>
    </div>
  )
}
