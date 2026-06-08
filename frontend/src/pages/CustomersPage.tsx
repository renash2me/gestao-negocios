import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatPhone, maskPhone, cleanPhone } from '../lib/format'
import { Modal, FormField, inputStyle, btnPrimary } from '../components/Modal'
import { page, card } from '../components/adminStyles'
import { TableScroll } from '../components/TableScroll'
import { LocationAutocomplete } from '../components/LocationAutocomplete'
import { useIsMobile } from '../hooks/useIsMobile'
import type { Customer } from '../lib/types'

export function CustomersPage() {
  const qc = useQueryClient()
  const mobile = useIsMobile()
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

  function renderCards() {
    return (
      <div style={card.list}>
        {customers.map((c) => (
          <div key={c.id} style={card.wrap}>
            <div style={card.header}>
              <div style={card.name}>{c.name}</div>
            </div>
            <div style={card.grid}>
              <div>
                <div style={card.label}>Telefone</div>
                <div style={{ ...card.value, fontWeight: 500 }}>{formatPhone(c.phone)}</div>
              </div>
              <div>
                <div style={card.label}>Local / Prédio</div>
                <div style={{ ...card.value, fontWeight: 500 }}>{c.location || '—'}</div>
              </div>
            </div>
            <div style={card.actions}>
              <button style={page.actionBtn} onClick={() => setEditing(c)}>Editar</button>
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
            <th style={page.th}>Telefone</th>
            <th style={page.th}>Local / Prédio</th>
            <th style={page.th}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <td style={page.td}>{c.name}</td>
              <td style={page.td}>{formatPhone(c.phone)}</td>
              <td style={page.td}>{c.location || '—'}</td>
              <td style={page.td}>
                <button style={page.actionBtn} onClick={() => setEditing(c)}>Editar</button>
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
        <h1 style={page.title}>Clientes</h1>
        <button style={page.addBtn} onClick={() => setAdding(true)}>+ Novo cliente</button>
      </div>

      {isLoading ? (
        <div style={page.loading}>Carregando...</div>
      ) : customers.length === 0 ? (
        <div style={page.empty}>Nenhum cliente cadastrado.</div>
      ) : mobile ? renderCards() : renderTable()}

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
  const [phoneDisplay, setPhoneDisplay] = useState(
    customer?.phone ? maskPhone(customer.phone) : '(11) '
  )
  const [location, setLocation] = useState(customer?.location ?? '')
  const [notes, setNotes] = useState('')

  function handlePhoneChange(val: string) {
    setPhoneDisplay(maskPhone(val))
  }

  function handleSave() {
    const rawPhone = cleanPhone(phoneDisplay)
    onSave({
      name,
      phone: rawPhone.length >= 10 ? rawPhone : null,
      location: location || null,
      notes: notes || null,
    })
  }

  return (
    <Modal title={customer ? 'Editar cliente' : 'Novo cliente'} onClose={onClose}>
      <FormField label="Nome">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" />
      </FormField>
      <FormField label="Telefone">
        <input
          style={inputStyle}
          value={phoneDisplay}
          onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder="(11) 94040-4040"
          inputMode="tel"
        />
      </FormField>
      <FormField label="Local / Prédio (opcional)">
        <LocationAutocomplete value={location} onChange={setLocation} />
      </FormField>
      <FormField label="Observações">
        <input style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
      </FormField>
      <button style={btnPrimary} onClick={handleSave} disabled={!name || saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </Modal>
  )
}
