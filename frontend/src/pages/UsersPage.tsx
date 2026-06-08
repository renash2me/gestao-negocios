import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Modal, FormField, inputStyle, btnPrimary } from '../components/Modal'
import { page, card } from '../components/adminStyles'
import { TableScroll } from '../components/TableScroll'
import { useIsMobile } from '../hooks/useIsMobile'

interface UserOut {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'admin'
  return (
    <span style={{
      ...page.badge,
      background: isAdmin ? '#eeedfe' : 'var(--cream)',
      color: isAdmin ? '#534ab7' : 'var(--ink-soft)',
    }}>
      {isAdmin ? 'Admin' : 'Operador'}
    </span>
  )
}

export function UsersPage() {
  const qc = useQueryClient()
  const mobile = useIsMobile()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<UserOut | null>(null)

  const { data: users = [], isLoading } = useQuery<UserOut[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users/').then((r) => r.data),
  })

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/users/', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setAdding(false) },
  })

  const update = useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown>) => api.put(`/users/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditing(null) },
  })

  function renderCards() {
    return (
      <div style={card.list}>
        {users.map((u) => (
          <div key={u.id} style={{ ...card.wrap, ...(u.is_active ? {} : { opacity: 0.55 }) }}>
            <div style={card.header}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={card.name}>{u.name}</div>
                <div style={card.subtitle}>{u.email}</div>
              </div>
              <span style={{ ...page.badge, ...(u.is_active ? page.badgeActive : page.badgeInactive), flexShrink: 0 }}>
                {u.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <RoleBadge role={u.role} />
            </div>
            <div style={card.actions}>
              <button style={page.actionBtn} onClick={() => setEditing(u)}>Editar</button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  function renderTable() {
    return (
      <TableScroll><table style={page.table}>
        <thead>
          <tr>
            <th style={page.th}>Nome</th>
            <th style={page.th}>Email</th>
            <th style={page.th}>Perfil</th>
            <th style={page.th}>Status</th>
            <th style={page.th}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={u.is_active ? {} : { opacity: 0.5 }}>
              <td style={page.td}>{u.name}</td>
              <td style={page.td}>{u.email}</td>
              <td style={page.td}><RoleBadge role={u.role} /></td>
              <td style={page.td}>
                <span style={{ ...page.badge, ...(u.is_active ? page.badgeActive : page.badgeInactive) }}>
                  {u.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td style={page.td}>
                <button style={page.actionBtn} onClick={() => setEditing(u)}>Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table></TableScroll>
    )
  }

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <h1 style={page.title}>Usuários</h1>
        <button style={page.addBtn} onClick={() => setAdding(true)}>+ Novo usuário</button>
      </div>

      {isLoading ? (
        <div style={page.loading}>Carregando...</div>
      ) : users.length === 0 ? (
        <div style={page.empty}>Nenhum usuário cadastrado.</div>
      ) : mobile ? renderCards() : renderTable()}

      {adding && (
        <Modal title="Novo usuário" onClose={() => setAdding(false)}>
          <CreateUserForm onSave={(data) => create.mutate(data)} saving={create.isPending} />
        </Modal>
      )}

      {editing && (
        <Modal title="Editar usuário" onClose={() => setEditing(null)}>
          <EditUserForm user={editing} onSave={(data) => update.mutate({ id: editing.id, ...data })} saving={update.isPending} />
        </Modal>
      )}
    </div>
  )
}

function CreateUserForm({ onSave, saving }: {
  onSave: (data: Record<string, unknown>) => void
  saving: boolean
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('operador')

  return (
    <>
      <FormField label="Nome">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
      </FormField>
      <FormField label="Email">
        <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
      </FormField>
      <FormField label="Senha">
        <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha do usuário" />
      </FormField>
      <FormField label="Perfil">
        <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="operador">Operador (PDV)</option>
          <option value="admin">Administrador</option>
        </select>
      </FormField>
      <button style={btnPrimary} onClick={() => onSave({ name, email, password, role })} disabled={!name || !email || !password || saving}>
        {saving ? 'Criando...' : 'Criar usuário'}
      </button>
    </>
  )
}

function EditUserForm({ user, onSave, saving }: {
  user: UserOut
  onSave: (data: Record<string, unknown>) => void
  saving: boolean
}) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState(user.role)
  const [isActive, setIsActive] = useState(user.is_active)

  return (
    <>
      <FormField label="Nome">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField label="Email">
        <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </FormField>
      <FormField label="Perfil">
        <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="operador">Operador (PDV)</option>
          <option value="admin">Administrador</option>
        </select>
      </FormField>
      <FormField label="Status">
        <select style={inputStyle} value={isActive ? 'true' : 'false'} onChange={(e) => setIsActive(e.target.value === 'true')}>
          <option value="true">Ativo</option>
          <option value="false">Inativo</option>
        </select>
      </FormField>
      <button style={btnPrimary} onClick={() => onSave({ name, email, role, is_active: isActive })} disabled={!name || !email || saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </>
  )
}
