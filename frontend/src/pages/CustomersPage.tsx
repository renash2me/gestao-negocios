import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Modal, FormField, inputStyle, btnPrimary } from '../components/Modal'
import { page } from '../components/adminStyles'
import type { Customer } from '../lib/types'

export function CustomersPage() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers/').then((r) => r.data),
  })

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/customers/', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setAdding(false) },
  })

  const update = useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown>) => api.put(`/customers/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setEditing(null) },
  })

  return (
    <div style={page.wrap}>
      <div style={page.header}>
        <h1 style={page.title}>Clientes</h1>
        <button style={page.addBtn} onClick={() => setAdding(true)}>+ Novo cliente</button>
      </div>

      {isLoading ? (
        <div style={page.loading}>Carregando...</div>
      ) : customers.length === 0 ? (
        <div style={page.empty}>Nenhum cliente cadastrado.</div>
      ) : (
        <table style={page.table}>
          <thead>
            <tr>
              <th style={page.th}>Nome</th>
              <th style={page.th}>Telefone</th>
              <th style={page.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td style={page.td}>{c.name}</td>
                <td style={page.td}>{c.phone || '—'}</td>
                <td style={page.td}>
                  <button style={page.actionBtn} onClick={() => setEditing(c)}>Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(adding || editing) && (
        <CustomerForm
          customer={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSave={(data) => editing ? update.mutate({ id: editing.id, ...data }) : create.mutate(data)}
          saving={create.isPending || update.isPending}
        />
      )}
    </div>
  )
}

function CustomerForm({ customer, onClose, onSave, saving }: {
  customer: Customer | null
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  saving: boolean
}) {
  const [name, setName] = useState(customer?.name ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')

  return (
    <Modal title={customer ? 'Editar cliente' : 'Novo cliente'} onClose={onClose}>
      <FormField label="Nome">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" />
      </FormField>
      <FormField label="Telefone">
        <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
      </FormField>
      <button style={btnPrimary} onClick={() => onSave({ name, phone: phone || null })} disabled={!name || saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </Modal>
  )
}
