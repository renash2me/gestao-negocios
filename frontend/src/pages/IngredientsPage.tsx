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

interface PriceEntry {
  id: number
  price_per_unit: number
  package_price: number | null
  package_weight: number | null
  supplier: string | null
  recorded_at: string
}

export function IngredientsPage() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [pricingId, setPricingId] = useState<Ingredient | null>(null)
  const [historyId, setHistoryId] = useState<Ingredient | null>(null)

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

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/costs/ingredients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ingredients'] }),
    onError: (err: any) => alert(err.response?.data?.detail || 'Erro ao excluir'),
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
                  <button style={page.actionBtn} onClick={() => setPricingId(i)}>+ Preço</button>
                  <button style={page.actionBtn} onClick={() => setHistoryId(i)}>Histórico</button>
                  <button
                    style={{ ...page.actionBtn, color: 'var(--danger)' }}
                    onClick={() => { if (confirm(`Excluir "${i.name}"?`)) remove.mutate(i.id) }}
                  >
                    Excluir
                  </button>
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

      {historyId && (
        <PriceHistoryModal
          ingredient={historyId}
          onClose={() => setHistoryId(null)}
        />
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
        <input style={inputStyle} type="number" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Ex: 500" />
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

function PriceHistoryModal({ ingredient, onClose }: { ingredient: Ingredient; onClose: () => void }) {
  const qc = useQueryClient()

  const { data: history = [], isLoading } = useQuery<PriceEntry[]>({
    queryKey: ['price-history', ingredient.id],
    queryFn: () => api.get(`/costs/ingredients/${ingredient.id}/prices`).then((r) => r.data),
  })

  const remove = useMutation({
    mutationFn: (priceId: number) => api.delete(`/costs/ingredients/${ingredient.id}/price/${priceId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-history', ingredient.id] })
      qc.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <Modal title={`Histórico — ${ingredient.name}`} onClose={onClose}>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ink-soft)' }}>Carregando...</div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ink-soft)' }}>Nenhum preço registrado.</div>
      ) : (
        <div>
          {history.map((h) => (
            <div key={h.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0', borderBottom: '1px solid var(--cream)',
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>
                  R$ {formatDecimal(h.price_per_unit)} / {ingredient.unit}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
                  {h.package_price && h.package_weight
                    ? `Embalagem: R$ ${Number(h.package_price).toFixed(2).replace('.', ',')} / ${Number(h.package_weight).toFixed(0)} ${ingredient.unit}`
                    : ''
                  }
                  {h.supplier ? ` — ${h.supplier}` : ''}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '2px' }}>{formatDate(h.recorded_at)}</div>
              </div>
              <button
                style={{ fontSize: '13px', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
                onClick={() => { if (confirm('Excluir este registro?')) remove.mutate(h.id) }}
              >
                Excluir
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
