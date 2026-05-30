import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatBRL } from '../lib/format'
import { Modal, FormField, inputStyle, btnPrimary } from '../components/Modal'
import { NumericInput } from '../components/NumericInput'
import { page } from '../components/adminStyles'

interface ElectricityBill {
  id: number
  reference_month: string
  kwh_consumed: number
  kwh_rate: number
  total_cost: number
  notes: string | null
}

export function ElectricityPage() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)

  const { data: bills = [], isLoading } = useQuery<ElectricityBill[]>({
    queryKey: ['electricity'],
    queryFn: () => api.get('/costs/electricity').then((r) => r.data),
  })

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/costs/electricity', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['electricity'] }); setAdding(false) },
  })

  function formatMonth(m: string) {
    const [year, month] = m.split('-')
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return `${months[Number(month) - 1]} ${year}`
  }

  return (
    <div style={page.wrap}>
      <div style={page.header}>
        <h1 style={page.title}>Conta de Luz</h1>
        <button style={page.addBtn} onClick={() => setAdding(true)}>+ Registrar conta</button>
      </div>

      {isLoading ? (
        <div style={page.loading}>Carregando...</div>
      ) : bills.length === 0 ? (
        <div style={page.empty}>Nenhuma conta registrada.</div>
      ) : (
        <table style={page.table}>
          <thead>
            <tr>
              <th style={page.th}>Mês</th>
              <th style={page.th}>Consumo (kWh)</th>
              <th style={page.th}>Tarifa (R$/kWh)</th>
              <th style={page.th}>Total</th>
              <th style={page.th}>Observações</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.id}>
                <td style={page.td}>{formatMonth(b.reference_month)}</td>
                <td style={page.td}>{Number(b.kwh_consumed).toFixed(0)}</td>
                <td style={page.td}>{formatBRL(b.kwh_rate)}</td>
                <td style={{ ...page.td, fontWeight: 600 }}>{formatBRL(b.total_cost)}</td>
                <td style={page.td}>{b.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {adding && (
        <Modal title="Registrar conta de luz" onClose={() => setAdding(false)}>
          <ElectricityForm onSave={(data) => create.mutate(data)} saving={create.isPending} />
        </Modal>
      )}
    </div>
  )
}

function ElectricityForm({ onSave, saving }: {
  onSave: (data: Record<string, unknown>) => void
  saving: boolean
}) {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [month, setMonth] = useState(defaultMonth)
  const [kwh, setKwh] = useState('')
  const [rate, setRate] = useState('0.75')
  const [notes, setNotes] = useState('')

  return (
    <>
      <FormField label="Mês de referência">
        <input style={inputStyle} type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </FormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <FormField label="Consumo (kWh)">
          <NumericInput value={kwh} onChange={setKwh} placeholder="320" decimals={2} />
        </FormField>
        <FormField label="Tarifa (R$/kWh)">
          <NumericInput value={rate} onChange={setRate} placeholder="0,75" decimals={4} />
        </FormField>
      </div>
      <FormField label="Observações">
        <input style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
      </FormField>
      <button style={btnPrimary} onClick={() => onSave({
        reference_month: month,
        kwh_consumed: Number(kwh),
        kwh_rate: Number(rate),
        notes: notes || null,
      })} disabled={!kwh || saving}>
        {saving ? 'Salvando...' : 'Registrar'}
      </button>
    </>
  )
}
