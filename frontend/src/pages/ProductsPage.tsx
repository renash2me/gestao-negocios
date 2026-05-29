import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Modal, FormField, inputStyle, btnPrimary } from '../components/Modal'
import { page } from '../components/adminStyles'

interface RecipeItem {
  ingredient_id: number
  ingredient_name: string
  unit: string
  quantity: number
  unit_cost: number
  line_cost: number
}

interface Product {
  id: number
  name: string
  description: string | null
  sale_price: number
  prep_time_minutes: number
  is_active: boolean
  ingredient_cost: number
  recipe: RecipeItem[]
}

interface Ingredient {
  id: number
  name: string
  unit: string
  avg_price_per_unit: number
}

interface RecipeInput {
  ingredient_id: number
  quantity: string
}

export function ProductsPage() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products-admin'],
    queryFn: () => api.get('/products/?active_only=false').then((r) => r.data),
  })

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/products/', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products-admin'] }); closeForm() },
  })

  const update = useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown>) => api.put(`/products/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products-admin'] }); closeForm() },
  })

  const deactivate = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products-admin'] }),
  })

  function closeForm() { setFormOpen(false); setEditing(null) }
  function openEdit(p: Product) { setEditing(p); setFormOpen(true) }
  function openNew() { setEditing(null); setFormOpen(true) }

  function formatMoney(v: number) {
    return `R$ ${Number(v).toFixed(2).replace('.', ',')}`
  }

  function margin(p: Product) {
    if (p.sale_price === 0) return '—'
    const m = ((p.sale_price - p.ingredient_cost) / p.sale_price * 100)
    return `${m.toFixed(1)}%`
  }

  return (
    <div style={page.wrap}>
      <div style={page.header}>
        <h1 style={page.title}>Produtos</h1>
        <button style={page.addBtn} onClick={openNew}>+ Novo produto</button>
      </div>

      {isLoading ? (
        <div style={page.loading}>Carregando...</div>
      ) : products.length === 0 ? (
        <div style={page.empty}>Nenhum produto cadastrado.</div>
      ) : (
        <table style={page.table}>
          <thead>
            <tr>
              <th style={page.th}>Produto</th>
              <th style={page.th}>Preço venda</th>
              <th style={page.th}>Custo insumos</th>
              <th style={page.th}>Margem</th>
              <th style={page.th}>Tempo preparo</th>
              <th style={page.th}>Status</th>
              <th style={page.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} style={p.is_active ? {} : { opacity: 0.5 }}>
                <td style={page.td}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  {p.description && <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '2px' }}>{p.description}</div>}
                </td>
                <td style={page.td}>{formatMoney(p.sale_price)}</td>
                <td style={page.td}>{formatMoney(p.ingredient_cost)}</td>
                <td style={page.td}>{margin(p)}</td>
                <td style={page.td}>{p.prep_time_minutes} min</td>
                <td style={page.td}>
                  <span style={{ ...page.badge, ...(p.is_active ? page.badgeActive : page.badgeInactive) }}>
                    {p.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={page.td}>
                  <button style={page.actionBtn} onClick={() => openEdit(p)}>Editar</button>
                  {p.is_active && (
                    <button style={{ ...page.actionBtn, color: 'var(--danger)' }} onClick={() => deactivate.mutate(p.id)}>Desativar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {formOpen && (
        <ProductForm
          product={editing}
          onClose={closeForm}
          onSave={(data) => editing ? update.mutate({ id: editing.id, ...data }) : create.mutate(data)}
          saving={create.isPending || update.isPending}
        />
      )}
    </div>
  )
}

function ProductForm({ product, onClose, onSave, saving }: {
  product: Product | null
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  saving: boolean
}) {
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [salePrice, setSalePrice] = useState(String(product?.sale_price ?? ''))
  const [prepTime, setPrepTime] = useState(String(product?.prep_time_minutes ?? '0'))
  const [recipe, setRecipe] = useState<RecipeInput[]>(
    product?.recipe.map((r) => ({ ingredient_id: r.ingredient_id, quantity: String(r.quantity) })) ?? []
  )

  const { data: ingredients = [] } = useQuery<Ingredient[]>({
    queryKey: ['ingredients'],
    queryFn: () => api.get('/costs/ingredients').then((r) => r.data),
  })

  function addRecipeItem() {
    setRecipe([...recipe, { ingredient_id: 0, quantity: '' }])
  }

  function updateRecipeItem(idx: number, field: keyof RecipeInput, value: string | number) {
    setRecipe(recipe.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  function removeRecipeItem(idx: number) {
    setRecipe(recipe.filter((_, i) => i !== idx))
  }

  function handleSubmit() {
    onSave({
      name,
      description: description || null,
      sale_price: Number(salePrice),
      prep_time_minutes: Number(prepTime),
      recipe: recipe
        .filter((r) => r.ingredient_id > 0 && Number(r.quantity) > 0)
        .map((r) => ({ ingredient_id: Number(r.ingredient_id), quantity: Number(r.quantity) })),
    })
  }

  return (
    <Modal title={product ? 'Editar produto' : 'Novo produto'} onClose={onClose}>
      <FormField label="Nome">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Brigadeiro gourmet" />
      </FormField>
      <FormField label="Descrição">
        <input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
      </FormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <FormField label="Preço de venda (R$)">
          <input style={inputStyle} type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
        </FormField>
        <FormField label="Tempo preparo (min)">
          <input style={inputStyle} type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
        </FormField>
      </div>

      <div style={{ marginTop: '16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-soft)' }}>Ficha técnica</label>
          <button
            style={{ fontSize: '13px', fontWeight: 600, color: 'var(--berry)', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={addRecipeItem}
          >
            + Adicionar insumo
          </button>
        </div>

        {recipe.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
            <select
              style={{ ...inputStyle, flex: 2 }}
              value={item.ingredient_id}
              onChange={(e) => updateRecipeItem(idx, 'ingredient_id', Number(e.target.value))}
            >
              <option value={0}>Selecionar insumo...</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
              ))}
            </select>
            <input
              style={{ ...inputStyle, flex: 1 }}
              type="number"
              step="0.01"
              placeholder="Qtd"
              value={item.quantity}
              onChange={(e) => updateRecipeItem(idx, 'quantity', e.target.value)}
            />
            <button
              style={{ fontSize: '18px', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
              onClick={() => removeRecipeItem(idx)}
            >
              ✕
            </button>
          </div>
        ))}

        {recipe.length === 0 && (
          <div style={{ fontSize: '13px', color: 'var(--ink-soft)', fontStyle: 'italic', padding: '8px 0' }}>
            Nenhum insumo na ficha técnica. O custo será R$ 0,00.
          </div>
        )}
      </div>

      <button style={btnPrimary} onClick={handleSubmit} disabled={!name || !salePrice || saving}>
        {saving ? 'Salvando...' : 'Salvar produto'}
      </button>
    </Modal>
  )
}
