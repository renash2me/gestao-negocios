import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatBRL } from '../../lib/format'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

interface ProductProfit {
  product_id: number
  product_name: string
  revenue: number
  cost: number
  profit: number
  margin: number
  quantity_sold: number
}

export function ProfitByProduct({ days }: { days: number }) {
  const { data = [], isLoading } = useQuery<ProductProfit[]>({
    queryKey: ['profit-by-product', days],
    queryFn: () => api.get(`/dashboard/profit-by-product?days=${days}&limit=8`).then((r) => r.data),
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-soft)' }}>Carregando...</div>
  if (data.length === 0) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-soft)' }}>Sem dados no período.</div>

  const formatted = data.map((d) => ({
    name: d.product_name.length > 14 ? d.product_name.slice(0, 12) + '…' : d.product_name,
    profit: Number(d.profit),
    margin: Number(d.margin),
    revenue: Number(d.revenue),
    cost: Number(d.cost),
  }))

  const getColor = (margin: number) => {
    if (margin >= 60) return '#2d6a3f'
    if (margin >= 40) return '#4a7c59'
    if (margin >= 20) return '#c8956c'
    return '#b5483f'
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={formatted} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--cream-dark)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'margin') return [`${value.toFixed(1).replace('.', ',')}%`, 'Margem']
              return [formatBRL(value), name === 'profit' ? 'Lucro' : 'Receita']
            }}
            contentStyle={{ borderRadius: '8px', border: '1px solid var(--cream-dark)', fontSize: '13px' }}
          />
          <Bar dataKey="margin" name="margin" radius={[4, 4, 0, 0]}>
            {formatted.map((entry, i) => (
              <Cell key={i} fill={getColor(entry.margin)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px', fontSize: '11px' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#2d6a3f', marginRight: 4 }} />≥ 60%</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#4a7c59', marginRight: 4 }} />≥ 40%</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#c8956c', marginRight: 4 }} />≥ 20%</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#b5483f', marginRight: 4 }} />&lt; 20%</span>
      </div>
    </div>
  )
}
