import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { api } from '../lib/api'
import { formatBRL } from '../lib/format'
import { Modal } from './Modal'

interface BreakdownItem {
  ingredient_id: number
  name: string
  unit: string
  quantity: string
  unit_cost: string
  line_cost: string
}

interface CostPoint {
  id: number
  total_cost: number
  cost_per_unit: number
  breakdown: BreakdownItem[]
  reason: string | null
  recorded_at: string
}

// Paleta para diferenciar as linhas de cada insumo
const COLORS = [
  '#7d3c52', '#c8956c', '#4a7c59', '#d4a548', '#a85574',
  '#5c2a3c', '#a8764f', '#b5483f', '#6b5a62', '#d4862a',
]

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const REASON_LABELS: Record<string, string> = {
  edicao: 'Receita editada',
  preco_insumo: 'Preço de insumo',
}

export function RecipeCostHistoryModal({ recipeId, recipeName, onClose }: {
  recipeId: number
  recipeName: string
  onClose: () => void
}) {
  const { data: history = [], isLoading } = useQuery<CostPoint[]>({
    queryKey: ['recipe-cost-history', recipeId],
    queryFn: () => api.get(`/recipes/${recipeId}/cost-history`).then((r) => r.data),
  })

  // Série do custo total
  const totalSeries = history.map((p) => ({
    date: fmtDate(p.recorded_at),
    custo: Number(p.total_cost),
    reason: p.reason,
  }))

  // Conjunto de todos os insumos que já apareceram no histórico
  const ingredientNames = Array.from(
    new Map(
      history.flatMap((p) => p.breakdown.map((b) => [b.ingredient_id, b.name] as const))
    ).values()
  )

  // Série por insumo: cada ponto tem o line_cost de cada insumo naquele instante
  const perIngredientSeries = history.map((p) => {
    const row: Record<string, number | string> = { date: fmtDate(p.recorded_at) }
    for (const name of ingredientNames) {
      const found = p.breakdown.find((b) => b.name === name)
      row[name] = found ? Number(found.line_cost) : 0
    }
    return row
  })

  const latest = history[history.length - 1]
  const first = history[0]
  const delta = latest && first ? Number(latest.total_cost) - Number(first.total_cost) : 0

  return (
    <Modal title={`Histórico de custo — ${recipeName}`} onClose={onClose}>
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-soft)' }}>
          Carregando histórico...
        </div>
      ) : history.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--ink-soft)', fontSize: '14px' }}>
          Ainda não há histórico de custo. Ele é gerado quando a receita é editada
          ou quando muda o preço de um insumo dela.
        </div>
      ) : (
        <>
          <div style={summaryBox}>
            <div>
              <div style={summaryLabel}>Custo atual</div>
              <div style={summaryValue}>{latest ? formatBRL(Number(latest.total_cost)) : '—'}</div>
            </div>
            <div>
              <div style={summaryLabel}>Variação no período</div>
              <div style={{ ...summaryValue, color: delta > 0 ? 'var(--danger)' : delta < 0 ? 'var(--success)' : 'var(--ink)' }}>
                {delta > 0 ? '+' : ''}{formatBRL(delta)}
              </div>
            </div>
            <div>
              <div style={summaryLabel}>Pontos</div>
              <div style={summaryValue}>{history.length}</div>
            </div>
          </div>

          <h3 style={chartTitle}>Custo total da batelada</h3>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={totalSeries} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cream-dark)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={56}
                  tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Line type="monotone" dataKey="custo" name="Custo total"
                  stroke="var(--berry)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h3 style={chartTitle}>Custo por insumo</h3>
          <p style={chartHint}>
            Cada linha é um insumo. A que sobe é a que está empurrando o custo.
          </p>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={perIngredientSeries} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cream-dark)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={56}
                  tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {ingredientNames.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} name={name}
                    stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 2 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {latest?.reason && (
            <div style={chartHint}>
              Último registro: {REASON_LABELS[latest.reason] ?? latest.reason}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}

const summaryBox: React.CSSProperties = {
  display: 'flex', gap: '16px', flexWrap: 'wrap',
  padding: '14px 16px', background: 'var(--cream)',
  borderRadius: 'var(--radius-sm)', marginBottom: '18px',
}
const summaryLabel: React.CSSProperties = { fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '2px' }
const summaryValue: React.CSSProperties = {
  fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--berry-dark)',
}
const chartTitle: React.CSSProperties = {
  fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: '8px 0 4px',
}
const chartHint: React.CSSProperties = {
  fontSize: '12px', color: 'var(--ink-soft)', margin: '0 0 8px',
}
