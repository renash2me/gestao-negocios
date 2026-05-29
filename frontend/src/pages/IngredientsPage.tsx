import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatDecimal } from '../lib/format'
import { Modal, FormField, inputStyle, btnPrimary } from '../components/Modal'
import { page } from '../components/adminStyles'

interface Ingredient {
  id: number
  name: string
  unit: string
  avg_price_per_unit: number
  last_price_per_unit: number
  last_supplier: string | null
  is_active: boolean
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
    mutationFn: ({ id, ...data }: { id: number; package_price: number; package_weight: number; supplier: string | null }) =>
      api.post(`/costs/ingredients/${id}/price`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredients'] }); setPricingId(null) },
  })

  const toggle = useMutation({
    mutationFn: (id: number) => api.patch(`/costs/ingredients/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ingredients'] }),
  })

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
              <th style={page.th}>Preço médio/un.</th>
              <th style={page.th}>Último preço/un.</th>
              <th style={page.th}>Último fornecedor</th>
              <th style={page.th}>Status</th>
              <th style={page.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((i) => (
              <tr key={i.id} style={i.is_active ? {} : { opacity: 0.5 }}>
                <td style={page.td}>{i.name}</td>
                <td style={page.td}>{i.unit}</td>
                <td style={page.td}>R$ {formatDecimal(i.avg_price_per_unit)}</td>
                <td style={page.td}>R$ {formatDecimal(i.last_price_per_unit)}</td>
                <td style={page.td}>{i.last_supplier || '—'}</td>
                <td style={page.td}>
                  <button
                    style={{ ...page.badge, ...(i.is_active ? page.badgeActive : page.badgeInactive), cursor: 'pointer', border: 'none' }}
                    onClick={() => toggle.mutate(i.id)}
                  >
                    {i.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
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
          <IngredientForm onSave={(data) => create.mutate(data)} saving={create.isPending} />
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
  onSave: (data: { package_price: number; package_weight: number; supplier: string | null }) => void
  saving: boolean
}) {
  const [price, setPrice] = useState('')
  const [weight, setWeight] = useState('')
  const [supplier, setSupplier] = useState('')

  const pricePerUnit = price && weight && Number(weight) > 0
    ? (Number(price) / Number(weight))
    : null

  return (
    <>
      <FormField label="Preço pago na embalagem (R$)">
        <input style={inputStyle} type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ex: 15,90" />
      </FormField>
      <FormField label={`Peso/quantidade da embalagem (${unit})`}>
        <input style={inputStyle} type="number" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={`Ex: 500`} />
      </FormField>

      {pricePerUnit !== null && (
        <div style={{ padding: '10px 14px', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '14px' }}>
          Preço por {unit}: <strong>R$ {pricePerUnit.toFixed(4).replace('.', ',')}</strong>
        </div>
      )}

      <FormField label="Fornecedor">
        <input style={inputStyle} value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Ex: Atacadão Centro" />
      </FormField>
      <button style={btnPrimary} onClick={() => onSave({
        package_price: Number(price),
        package_weight: Number(weight),
        supplier: supplier || null,
      })} disabled={!price || !weight || Number(weight) <= 0 || saving}>
        {saving ? 'Registrando...' : 'Registrar preço'}
      </button>
    </>
  )
}
