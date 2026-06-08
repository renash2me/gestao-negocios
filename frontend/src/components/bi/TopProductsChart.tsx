import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatBRL } from '../../lib/format'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

interface TopProduct {
  product_id: number
  product_name: string
  quantity_sold: number
  revenue: number
  avg_margin: number
}

export function TopProductsChart({ days }: { days: number }) {
  const { data = [], isLoading } = useQuery<TopProduct[]>({
    queryKey: ['top-products', days],
    queryFn: () => api.get(`/dashboard/top-products?days=${days}&limit=8`).then((r) => r.data),
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-soft)' }}>Carregando...</div>
  if (data.length === 0) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-soft)' }}>Sem dados no período.</div>

  const formatted = data.map((d) => ({
    name: d.product_name.length > 14 ? d.product_name.slice(0, 12) + '…' : d.product_name,
    fullName: d.product_name,
    qty: d.quantity_sold,
    revenue: Number(d.revenue),
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--cream-dark)" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} />
        <Tooltip
          formatter={(value: number, name: string) => [
            name === 'qty' ? value : formatBRL(value),
            name === 'qty' ? 'Quantidade' : 'Receita',
          ]}
          contentStyle={{ borderRadius: '8px', border: '1px solid var(--cream-dark)', fontSize: '13px' }}
        />
        <Bar dataKey="qty" fill="#7d3c52" radius={[4, 4, 0, 0]} name="qty" />
      </BarChart>
    </ResponsiveContainer>
  )
}
