import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatDecimal } from '../lib/format'
import { Modal, FormField, inputStyle, btnPrimary } from '../components/Modal'
import { NumericInput } from '../components/NumericInput'
import { page, card } from '../components/adminStyles'
import { TableScroll } from '../components/TableScroll'
import { useIsMobile } from '../hooks/useIsMobile'
import type { CardMachine } from '../lib/types'

export function MachinesPage() {
  const qc = useQueryClient()
  const mobile = useIsMobile()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<CardMachine | null>(null)
  const [kebabOpen, setKebabOpen] = useState<number | null>(null)

  const { data: machines = [], isLoading } = useQuery<CardMachine[]>({
    queryKey: ['card-machines-admin'],
    queryFn: () => api.get('/costs/card-machines').then((r) => r.data),
  })

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ['card-machines-admin'] })
    qc.invalidateQueries({ queryKey: ['card-machines'] })
  }

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/costs/card-machines', data),
    onSuccess: () => { invalidateAll(); setAdding(false) },
  })

  const update = useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown>) => api.put(`/costs/card-machines/${id}`, data),
    onSuccess: () => { invalidateAll(); setEditing(null) },
  })

  const toggle = useMutation({
    mutationFn: (id: number) => api.patch(`/costs/card-machines/${id}/toggle`),
    onSuccess: () => invalidateAll(),
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/costs/card-machines/${id}`),
    onSuccess: () => invalidateAll(),
    onError: (err: any) => alert(err.response?.data?.detail || 'Erro ao excluir'),
  })

  function renderCards() {
    return (
      <div style={card.list}>
        {machines.map((m) => (
          <div key={m.id} style={{ ...card.wrap, ...(m.is_active ? {} : { opacity: 0.55 }) }}>
            <div style={card.header}>
              <div style={card.name}>{m.name}</div>
              <button
                style={{ ...page.badge, ...(m.is_active ? page.badgeActive : page.badgeInactive), cursor: 'pointer', border: 'none', flexShrink: 0 }}
                onClick={() => toggle.mutate(m.id)}
              >
                {m.is_active ? 'Ativa' : 'Inativa'}
              </button>
            </div>
            <div style={card.grid}>
              <div>
                <div style={card.label}>Taxa débito</div>
                <div style={card.value}>{formatDecimal(m.debit_fee_percent, 2)}%</div>
              </div>
              <div>
                <div style={card.label}>Taxa crédito</div>
                <div style={card.value}>{formatDecimal(m.credit_fee_percent, 2)}%</div>
              </div>
            </div>
            <div style={card.actions}>
              <button style={page.actionBtn} onClick={() => setEditing(m)}>Editar</button>
              <div style={{ position: 'relative', marginLeft: 'auto' }}>
                <button style={card.kebab} onClick={() => setKebabOpen(kebabOpen === m.id ? null : m.id)}>⋯</button>
                {kebabOpen === m.id && (
                  <div style={kebabMenu}>
                    <button
                      style={kebabItem}
                      onClick={() => { setKebabOpen(null); if (confirm(`Excluir "${m.name}"?`)) remove.mutate(m.id) }}
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>
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
            <th style={page.th}>Taxa débito</th>
            <th style={page.th}>Taxa crédito</th>
            <th style={page.th}>Status</th>
            <th style={page.th}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {machines.map((m) => (
            <tr key={m.id} style={m.is_active ? {} : { opacity: 0.5 }}>
              <td style={page.td}>{m.name}</td>
              <td style={page.td}>{formatDecimal(m.debit_fee_percent, 2)}%</td>
              <td style={page.td}>{formatDecimal(m.credit_fee_percent, 2)}%</td>
              <td style={page.td}>
                <button
                  style={{ ...page.badge, ...(m.is_active ? page.badgeActive : page.badgeInactive), cursor: 'pointer', border: 'none' }}
                  onClick={() => toggle.mutate(m.id)}
                >
                  {m.is_active ? 'Ativa' : 'Inativa'}
                </button>
              </td>
              <td style={page.td}>
                <button style={page.actionBtn} onClick={() => setEditing(m)}>Editar</button>
                <button
                  style={{ ...page.actionBtn, color: 'var(--danger)' }}
                  onClick={() => { if (confirm(`Excluir "${m.name}"?`)) remove.mutate(m.id) }}
                >
                  Excluir
                </button>
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
        <h1 style={page.title}>Maquininhas</h1>
        <button style={page.addBtn} onClick={() => setAdding(true)}>+ Nova maquininha</button>
      </div>

      {isLoading ? (
        <div style={page.loading}>Carregando...</div>
      ) : machines.length === 0 ? (
        <div style={page.empty}>Nenhuma maquininha cadastrada.</div>
      ) : mobile ? renderCards() : renderTable()}

      {(adding || editing) && (
        <MachineForm
          machine={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSave={(data) => editing ? update.mutate({ id: editing.id, ...data }) : create.mutate(data)}
          saving={create.isPending || update.isPending}
        />
      )}
    </div>
  )
}

/* ── Kebab dropdown styles ───────────────────────────── */

const kebabMenu: React.CSSProperties = {
  position: 'absolute', right: 0, top: '100%',
  background: 'var(--white)', borderRadius: 'var(--radius-sm)',
  boxShadow: 'var(--shadow-md)', padding: '4px', zIndex: 10, minWidth: '120px',
}
const kebabItem: React.CSSProperties = {
  display: 'block', width: '100%', padding: '10px 14px',
  fontSize: '13px', fontWeight: 500, color: 'var(--danger)',
  background: 'none', border: 'none', cursor: 'pointer',
  textAlign: 'left', borderRadius: '6px',
}

/* ── Machine Form (unchanged) ───────────────────────────── */

function MachineForm({ machine, onClose, onSave, saving }: {
  machine: CardMachine | null
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  saving: boolean
}) {
  const [name, setName] = useState(machine?.name ?? '')
  const [debit, setDebit] = useState(String(machine?.debit_fee_percent ?? '1.5'))
  const [credit, setCredit] = useState(String(machine?.credit_fee_percent ?? '3.0'))

  function handleSubmit() {
    onSave({ name, debit_fee_percent: Number(debit), credit_fee_percent: Number(credit) })
  }

  return (
    <Modal title={machine ? 'Editar maquininha' : 'Nova maquininha'} onClose={onClose}>
      <FormField label="Nome">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Cielo D150" />
      </FormField>
      <FormField label="Taxa débito (%)">
        <NumericInput value={debit} onChange={setDebit} placeholder="1,5" decimals={2} />
      </FormField>
      <FormField label="Taxa crédito (%)">
        <NumericInput value={credit} onChange={setCredit} placeholder="3,0" decimals={2} />
      </FormField>
      <button style={btnPrimary} onClick={handleSubmit} disabled={!name || saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </Modal>
  )
}
