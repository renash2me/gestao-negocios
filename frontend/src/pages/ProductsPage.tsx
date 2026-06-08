import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatBRL } from '../lib/format'
import { Modal, FormField, inputStyle, btnPrimary } from '../components/Modal'
import { NumericInput } from '../components/NumericInput'
import { page, card } from '../components/adminStyles'
import { TableScroll } from '../components/TableScroll'
import { useIsMobile } from '../hooks/useIsMobile'

interface Product {
  id: number
  name: string
  description: string | null
  sale_price: number
  recipe_id: number | null
  recipe_name: string | null
  units_per_batch: number
  unit_cost: number
  margin_percent: number
  is_active: boolean
}

interface RecipeOption {
  id: number
  name: string
  yield_units: number
  cost_per_unit: number
}

function MarginText({ value }: { value: number }) {
  const color = value >= 40 ? 'var(--success)' : value >= 20 ? 'var(--caramel-dark)' : 'var(--danger)'
  return <span style={{ fontWeight: 600, color }}>{Number(value).toFixed(1).replace('.', ',')}%</span>
}

export function ProductsPage() {
  const qc = useQueryClient()
  const mobile = useIsMobile()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [kebabOpen, setKebabOpen] = useState<number | null>(null)

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products-admin'],
    queryFn: () => api.get('/products/?active_only=false').then((r) => r.data),
  })

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ['products-admin'] })
    qc.invalidateQueries({ queryKey: ['products'] })
  }

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/products/', data),
    onSuccess: () => { invalidateAll(); closeForm() },
  })
  const update = useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown>) => api.put(`/products/${id}`, data),
    onSuccess: () => { invalidateAll(); closeForm() },
  })
  const toggle = useMutation({
    mutationFn: (id: number) => api.patch(`/products/${id}/toggle`),
    onSuccess: () => invalidateAll(),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => invalidateAll(),
    onError: (err: any) => alert(err.response?.data?.detail || 'Erro ao excluir'),
  })

  function closeForm() { setFormOpen(false); setEditing(null) }

  function renderCards() {
    return (
      <div style={card.list}>
        {products.map((p) => (
          <div key={p.id} style={{ ...card.wrap, ...(p.is_active ? {} : { opacity: 0.55 }) }}>
            <div style={card.header}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={card.name}>{p.name}</div>
                {p.description && <div style={card.subtitle}>{p.description}</div>}
              </div>
              <button
                style={{ ...page.badge, ...(p.is_active ? page.badgeActive : page.badgeInactive), cursor: 'pointer', border: 'none', flexShrink: 0 }}
                onClick={() => toggle.mutate(p.id)}
              >
                {p.is_active ? 'Ativo' : 'Inativo'}
              </button>
            </div>
            <div style={card.grid}>
              <div>
                <div style={card.label}>Preço venda</div>
                <div style={card.valueLarge}>{formatBRL(p.sale_price)}</div>
              </div>
              <div>
                <div style={card.label}>Custo</div>
                <div style={card.value}>{formatBRL(p.unit_cost)}</div>
              </div>
              <div>
                <div style={card.label}>Margem</div>
                <div style={card.value}><MarginText value={p.margin_percent} /></div>
              </div>
              <div>
                <div style={card.label}>Receita</div>
                <div style={{ ...card.value, fontWeight: 500 }}>{p.recipe_name || '—'}</div>
              </div>
            </div>
            <div style={card.actions}>
              <button style={page.actionBtn} onClick={() => { setEditing(p); setFormOpen(true) }}>Editar</button>
              <div style={{ position: 'relative', marginLeft: 'auto' }}>
                <button style={card.kebab} onClick={() => setKebabOpen(kebabOpen === p.id ? null : p.id)}>⋯</button>
                {kebabOpen === p.id && (
                  <div style={kebabMenu}>
                    <button
                      style={kebabItem}
                      onClick={() => { setKebabOpen(null); if (confirm(`Excluir "${p.name}"?`)) remove.mutate(p.id) }}
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
            <th style={page.th}>Produto</th>
            <th style={page.th}>Receita</th>
            <th style={page.th}>Un./batelada</th>
            <th style={page.th}>Preço venda</th>
            <th style={page.th}>Custo</th>
            <th style={page.th}>Margem</th>
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
              <td style={page.td}>{p.recipe_name || '—'}</td>
              <td style={page.td}>{p.units_per_batch}</td>
              <td style={page.td}>{formatBRL(p.sale_price)}</td>
              <td style={page.td}>{formatBRL(p.unit_cost)}</td>
              <td style={page.td}><MarginText value={p.margin_percent} /></td>
              <td style={page.td}>
                <button
                  style={{ ...page.badge, ...(p.is_active ? page.badgeActive : page.badgeInactive), cursor: 'pointer', border: 'none' }}
                  onClick={() => toggle.mutate(p.id)}
                >
                  {p.is_active ? 'Ativo' : 'Inativo'}
                </button>
              </td>
              <td style={page.td}>
                <button style={page.actionBtn} onClick={() => { setEditing(p); setFormOpen(true) }}>Editar</button>
                <button
                  style={{ ...page.actionBtn, color: 'var(--danger)' }}
                  onClick={() => { if (confirm(`Excluir "${p.name}"?`)) remove.mutate(p.id) }}
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
        <h1 style={page.title}>Produtos</h1>
        <button style={page.addBtn} onClick={() => { setEditing(null); setFormOpen(true) }}>+ Novo produto</button>
      </div>

      {isLoading ? (
        <div style={page.loading}>Carregando...</div>
      ) : products.length === 0 ? (
        <div style={page.empty}>Nenhum produto cadastrado. Cadastre uma receita primeiro.</div>
      ) : mobile ? renderCards() : renderTable()}

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

/* ── Product Form (unchanged) ───────────────────────────── */

function ProductForm({ product, onClose, onSave, saving }: {
  product: Product | null
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  saving: boolean
}) {
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [price, setPrice] = useState(
    product ? String(product.sale_price) : ''
  )
  const [recipeId, setRecipeId] = useState<number | null>(product?.recipe_id ?? null)
  const [units, setUnits] = useState(String(product?.units_per_batch ?? '1'))

  const { data: recipes = [] } = useQuery<RecipeOption[]>({
    queryKey: ['recipes'],
    queryFn: () => api.get('/recipes/').then((r) => r.data),
  })

  const selectedRecipe = recipes.find((r) => r.id === recipeId)

  const priceNum = Number(price) || 0
  const unitCost = selectedRecipe ? selectedRecipe.cost_per_unit * Number(units) : 0
  const margin = priceNum > 0 ? ((priceNum - unitCost) / priceNum * 100) : 0

  function handleSubmit() {
    onSave({
      name,
      description: description || null,
      sale_price: priceNum,
      recipe_id: recipeId,
      units_per_batch: Number(units),
    })
  }

  return (
    <Modal title={product ? 'Editar produto' : 'Novo produto'} onClose={onClose}>
      <FormField label="Nome do produto">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Brigadeiro Gourmet - Unitário" />
      </FormField>
      <FormField label="Descrição">
        <input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
      </FormField>
      <FormField label="Preço de venda (R$)">
        <NumericInput value={price} onChange={setPrice} placeholder="4,50" decimals={2} />
      </FormField>
      <FormField label="Receita / Batelada">
        <select
          style={inputStyle}
          value={recipeId ?? ''}
          onChange={(e) => setRecipeId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Sem receita (sem custo)</option>
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>{r.name} — rende {r.yield_units} un. ({formatBRL(r.cost_per_unit)}/un.)</option>
          ))}
        </select>
      </FormField>
      {recipeId && (
        <FormField label="Unidades da batelada neste produto">
          <input style={inputStyle} type="number" min="1" value={units} onChange={(e) => setUnits(e.target.value)} />
          <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '4px' }}>
            Ex: 1 para unitário, 4 para kit com 4
          </div>
        </FormField>
      )}

      {priceNum > 0 && (
        <div style={{ padding: '12px 16px', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '14px' }}>
          <div>Custo: <strong>{formatBRL(unitCost)}</strong></div>
          <div>Margem: <strong style={{
            color: margin >= 40 ? 'var(--success)' : margin >= 20 ? 'var(--caramel-dark)' : 'var(--danger)',
          }}>{margin.toFixed(1).replace('.', ',')}%</strong></div>
        </div>
      )}

      <button style={btnPrimary} onClick={handleSubmit} disabled={!name || !priceNum || saving}>
        {saving ? 'Salvando...' : 'Salvar produto'}
      </button>
    </Modal>
  )
}
