import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatDecimal } from '../lib/format'
import { Modal, FormField, inputStyle, btnPrimary } from '../components/Modal'
import { NumericInput } from '../components/NumericInput'
import { page } from '../components/adminStyles'
import type { CardMachine } from '../lib/types'

export function MachinesPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<CardMachine | null>(null)
  const [adding, setAdding] = useState(false)

  const { data: machines = [], isLoading } = useQuery<CardMachine[]>({
    queryKey: ['card-machines'],
    queryFn: () => api.get('/costs/card-machines').then((r) => r.data),
  })

  const save = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/costs/card-machines', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['card-machines'] }); setAdding(false) },
  })

  return (
    <div style={page.wrap}>
      <div style={page.header}>
        <h1 style={page.title}>Maquininhas</h1>
        <button style={page.addBtn} onClick={() => setAdding(true)}>+ Nova maquininha</button>
      </div>

      {isLoading ? (
        <div style={page.loading}>Carregando...</div>
      ) : machines.length === 0 ? (
        <div style={page.empty}>Nenhuma maquininha cadastrada.</div>
      ) : (
        <table style={page.table}>
          <thead>
            <tr>
              <th style={page.th}>Nome</th>
              <th style={page.th}>Taxa débito</th>
              <th style={page.th}>Taxa crédito</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((m) => (
              <tr key={m.id}>
                <td style={page.td}>{m.name}</td>
                <td style={page.td}>{formatDecimal(m.debit_fee_percent, 2)}%</td>
                <td style={page.td}>{formatDecimal(m.credit_fee_percent, 2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(adding || editing) && (
        <MachineForm
          machine={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSave={(data) => save.mutate(data)}
          saving={save.isPending}
        />
      )}
    </div>
  )
}

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
