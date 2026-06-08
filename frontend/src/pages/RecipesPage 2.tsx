import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatBRL } from '../lib/format'
import { Modal, FormField, inputStyle, btnPrimary } from '../components/Modal'
import { NumericInput } from '../components/NumericInput'
import { page } from '../components/adminStyles'
import { TableScroll } from '../components/TableScroll'
import { RecipeCostHistoryModal } from '../components/RecipeCostHistoryModal'

interface RecipeItem {
  ingredient_id: number
  ingredient_name: string
  unit: string
  quantity: number
  unit_cost: number
  line_cost: number
}

interface Recipe {
  id: number
  name: string
  description: string | null
  prep_time_minutes: number
  yield_units: number
  is_active: boolean
  total_cost: number
  cost_per_unit: number
  items: RecipeItem[]
}

interface Ingredient {
  id: number
  name: string
  unit: string
  avg_price_per_unit: number
}

interface ItemInput {
  ingredient_id: number
  quantity: string
}

export function RecipesPage() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Recipe | null>(null)
  const [historyFor, setHistoryFor] = useState<Recipe | null>(null)

  const { data: recipes = [], isLoading } = useQuery<Recipe[]>({
    queryKey: ['recipes'],
    queryFn: () => api.get('/recipes/').then((r) => r.data),
  })

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ['recipes'] })
    qc.invalidateQueries({ queryKey: ['products'] })
    qc.invalidateQueries({ queryKey: ['products-admin'] })
  }

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/recipes/', data),
    onSuccess: () => { invalidateAll(); closeForm() },
  })
  const update = useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown>) => api.put(`/recipes/${id}`, data),
    onSuccess: () => { invalidateAll(); closeForm() },
  })
  const toggle = useMutation({
    mutationFn: (id: number) => api.patch(`/recipes/${id}/toggle`),
    onSuccess: () => invalidateAll(),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/recipes/${id}`),
    onSuccess: () => invalidateAll(),
    onError: (err: any) => alert(err.response?.data?.detail || 'Erro ao excluir'),
  })

  function closeForm() { setFormOpen(false); setEditing(null) }

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <h1 style={page.title}>Receitas / Bateladas</h1>
        <button style={page.addBtn} onClick={() => { setEditing(null); setFormOpen(true) }}>+ Nova receita</button>
      </div>

      {isLoading ? (
        <div style={page.loading}>Carregando...</div>
      ) : recipes.length === 0 ? (
        <div style={page.empty}>Nenhuma receita cadastrada. Cadastre os insumos primeiro e depois crie uma receita.</div>
      ) : (
        <TableScroll><table style={page.table}>
          <thead>
            <tr>
              <th style={page.th}>Receita</th>
              <th style={page.th}>Rendimento</th>
              <th style={page.th}>Tempo</th>
              <th style={page.th}>Custo total</th>
              <th style={page.th}>Custo/unidade</th>
              <th style={page.th}>Status</th>
              <th style={page.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((r) => (
              <tr key={r.id} style={r.is_active ? {} : { opacity: 0.5 }}>
                <td style={page.td}>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  {r.description && <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '2px' }}>{r.description}</div>}
                  <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '4px' }}>
                    {r.items.map((i) => `${i.ingredient_name} (${i.quantity} ${i.unit})`).join(' · ')}
                  </div>
                </td>
                <td style={page.td}>{r.yield_units} un.</td>
                <td style={page.td}>{r.prep_time_minutes} min</td>
                <td style={page.td}>{formatBRL(r.total_cost)}</td>
                <td style={{ ...page.td, fontWeight: 600 }}>{formatBRL(r.cost_per_unit)}</td>
                <td style={page.td}>
                  <button
                    style={{ ...page.badge, ...(r.is_active ? page.badgeActive : page.badgeInactive), cursor: 'pointer', border: 'none' }}
                    onClick={() => toggle.mutate(r.id)}
                  >
                    {r.is_active ? 'Ativa' : 'Inativa'}
                  </button>
                </td>
                <td style={page.td}>
                  <button style={page.actionBtn} onClick={() => { setEditing(r); setFormOpen(true) }}>Editar</button>
                  <button style={page.actionBtn} onClick={() => setHistoryFor(r)}>Histórico</button>
                  <button
                    style={{ ...page.actionBtn, color: 'var(--danger)' }}
                    onClick={() => { if (confirm(`Excluir "${r.name}"?`)) remove.mutate(r.id) }}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></TableScroll>
      )}

      {formOpen && (
        <RecipeForm
          recipe={editing}
          onClose={closeForm}
          onSave={(data) => editing ? update.mutate({ id: editing.id, ...data }) : create.mutate(data)}
          saving={create.isPending || update.isPending}
        />
      )}

      {historyFor && (
        <RecipeCostHistoryModal
          recipeId={historyFor.id}
          recipeName={historyFor.name}
          onClose={() => setHistoryFor(null)}
        />
      )}
    </div>
  )
}

function RecipeForm({ recipe, onClose, onSave, saving }: {
  recipe: Recipe | null
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  saving: boolean
}) {
  const [name, setName] = useState(recipe?.name ?? '')
  const [description, setDescription] = useState(recipe?.description ?? '')
  const [prepTime, setPrepTime] = useState(String(recipe?.prep_time_minutes ?? '0'))
  const [yieldUnits, setYieldUnits] = useState(String(recipe?.yield_units ?? '1'))
  const [items, setItems] = useState<ItemInput[]>(
    recipe?.items.map((i) => ({ ingredient_id: i.ingredient_id, quantity: String(i.quantity) })) ?? []
  )

  const { data: ingredients = [] } = useQuery<Ingredient[]>({
    queryKey: ['ingredients'],
    queryFn: () => api.get('/costs/ingredients').then((r) => r.data),
  })

  function addItem() { setItems([...items, { ingredient_id: 0, quantity: '' }]) }
  function updateItem(idx: number, field: keyof ItemInput, value: string | number) {
    setItems(items.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }
  function removeItem(idx: number) { setItems(items.filter((_, i) => i !== idx)) }

  // Cálculo em tempo real
  const totalCost = items.reduce((sum, item) => {
    const ing = ingredients.find((i) => i.id === Number(item.ingredient_id))
    if (!ing || !item.quantity) return sum
    return sum + Number(item.quantity) * ing.avg_price_per_unit
  }, 0)
  const costPerUnit = Number(yieldUnits) > 0 ? totalCost / Number(yieldUnits) : 0

  function handleSubmit() {
    onSave({
      name,
      description: description || null,
      prep_time_minutes: Number(prepTime),
      yield_units: Number(yieldUnits),
      items: items
        .filter((r) => r.ingredient_id > 0 && Number(r.quantity) > 0)
        .map((r) => ({ ingredient_id: Number(r.ingredient_id), quantity: Number(r.quantity) })),
    })
  }

  return (
    <Modal title={recipe ? 'Editar receita' : 'Nova receita'} onClose={onClose}>
      <FormField label="Nome da receita">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Massa de Brigadeiro" />
      </FormField>
      <FormField label="Descrição">
        <input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
      </FormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <FormField label="Rendimento (unidades)">
          <input style={inputStyle} type="number" min="1" value={yieldUnits} onChange={(e) => setYieldUnits(e.target.value)} />
        </FormField>
        <FormField label="Tempo de preparo (min)">
          <input style={inputStyle} type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
        </FormField>
      </div>

      <div style={{ marginTop: '16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-soft)' }}>Ingredientes</label>
          <button
            style={{ fontSize: '13px', fontWeight: 600, color: 'var(--berry)', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={addItem}
          >
            + Adicionar
          </button>
        </div>

        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
            <select
              style={{ ...inputStyle, flex: 2 }}
              value={item.ingredient_id}
              onChange={(e) => updateItem(idx, 'ingredient_id', Number(e.target.value))}
            >
              <option value={0}>Selecionar...</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
              ))}
            </select>
            <NumericInput
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Qtd"
              value={item.quantity}
              onChange={(v) => updateItem(idx, 'quantity', v)}
              decimals={2}
            />
            <button
              style={{ fontSize: '18px', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
              onClick={() => removeItem(idx)}
            >
              ✕
            </button>
          </div>
        ))}

        {items.length === 0 && (
          <div style={{ fontSize: '13px', color: 'var(--ink-soft)', fontStyle: 'italic', padding: '8px 0' }}>
            Adicione os ingredientes da receita.
          </div>
        )}
      </div>

      {totalCost > 0 && (
        <div style={{ padding: '12px 16px', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '14px' }}>
          <div>Custo da batelada: <strong>{formatBRL(totalCost)}</strong></div>
          <div>Custo por unidade: <strong>{formatBRL(costPerUnit)}</strong> ({yieldUnits} unidades)</div>
        </div>
      )}

      <button style={btnPrimary} onClick={handleSubmit} disabled={!name || !yieldUnits || saving}>
        {saving ? 'Salvando...' : 'Salvar receita'}
      </button>
    </Modal>
  )
}
