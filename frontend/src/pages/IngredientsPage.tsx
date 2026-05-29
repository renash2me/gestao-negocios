import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Modal, FormField, inputStyle, btnPrimary } from '../components/Modal'
import { page } from '../components/adminStyles'

interface Ingredient {
  id: number
  name: string
  unit: string
  avg_price_per_unit: number
  last_price_per_unit: number
  last_supplier: string | null
}

export function IngredientsPage() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [pricingId, setPricingId] = useState<Ingredient | null>(null)

  const { data: ingredients = [], isLoading } = useQuery<Ingredient[]>({
    queryKey: ['ingredients'],
    queryFn: () => api.get('/costs/ingredients').then((r) => r.data),
  })

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/costs/ingredients', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredients'] }); setAdding(false) },
  })

  const registerPrice = useMutation({
    mutationFn: ({ id, ...data }: { id: number; price_per_unit: number; supplier: string | null }) =>
      api.post(`/costs/ingredients/${id}/price`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredients'] }); setPricingId(null) },
  })

  function formatMoney(v: number) {
    return `R$ ${Number(v).toFixed(4).replace('.', ',')}`
  }

  return (
    <div style={page.wrap}>
      <div style={page.header}>
        <h1 style={page.title}>Insumos</h1>
        <button style={page.addBtn} onClick={() => setAdding(true)}>+ Novo insumo</button>
      </div>

      {isLoading ? (
        <div style={page.loading}>Carregando...</div>
      ) : ingredients.length === 0 ? (
        <div style={page.empty}>Nenhum insumo cadastrado.</div>
      ) : (
        <table style={page.table}>
          <thead>
            <tr>
              <th style={page.th}>Nome</th>
              <th style={page.th}>Unidade</th>
              <th style={page.th}>Preço médio</th>
              <th style={page.th}>Último preço</th>
              <th style={page.th}>Último fornecedor</th>
              <th style={page.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((i) => (
              <tr key={i.id}>
                <td style={page.td}>{i.name}</td>
                <td style={page.td}>{i.unit}</td>
                <td style={page.td}>{formatMoney(i.avg_price_per_unit)}</td>
                <td style={page.td}>{formatMoney(i.last_price_per_unit)}</td>
                <td style={page.td}>{i.last_supplier || '—'}</td>
                <td style={page.td}>
                  <button style={page.actionBtn} onClick={() => setPricingId(i)}>Registrar preço</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {adding && (
        <Modal title="Novo insumo" onClose={() => setAdding(false)}>
          <IngredientForm
            onSave={(data) => create.mutate(data)}
            saving={create.isPending}
          />
        </Modal>
      )}

      {pricingId && (
        <Modal title={`Registrar preço — ${pricingId.name}`} onClose={() => setPricingId(null)}>
          <PriceForm
            unit={pricingId.unit}
            onSave={(data) => registerPrice.mutate({ id: pricingId.id, ...data })}
            saving={registerPrice.isPending}
          />
        </Modal>
      )}
    </div>
  )
}

function IngredientForm({ onSave, saving }: {
  onSave: (data: Record<string, unknown>) => void
  saving: boolean
}) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('g')

  return (
    <>
      <FormField label="Nome">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Chocolate em pó" />
      </FormField>
      <FormField label="Unidade">
        <select style={inputStyle} value={unit} onChange={(e) => setUnit(e.target.value)}>
          <option value="g">Gramas (g)</option>
          <option value="kg">Quilos (kg)</option>
          <option value="ml">Mililitros (ml)</option>
          <option value="l">Litros (l)</option>
          <option value="un">Unidade (un)</option>
        </select>
      </FormField>
      <button style={btnPrimary} onClick={() => onSave({ name, unit })} disabled={!name || saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </>
  )
}

function PriceForm({ unit, onSave, saving }: {
  unit: string
  onSave: (data: { price_per_unit: number; supplier: string | null }) => void
  saving: boolean
}) {
  const [price, setPrice] = useState('')
  const [supplier, setSupplier] = useState('')

  return (
    <>
      <FormField label={`Preço por ${unit}`}>
        <input style={inputStyle} type="number" step="0.0001" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.0000" />
      </FormField>
      <FormField label="Fornecedor">
        <input style={inputStyle} value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Ex: Atacadão Centro" />
      </FormField>
      <button style={btnPrimary} onClick={() => onSave({ price_per_unit: Number(price), supplier: supplier || null })} disabled={!price || saving}>
        {saving ? 'Registrando...' : 'Registrar preço'}
      </button>
    </>
  )
}
