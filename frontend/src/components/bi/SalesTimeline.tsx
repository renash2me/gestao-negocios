import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

interface DailySale {
  date: string
  revenue: number
  cost: number
  profit: number
  count: number
}

export function SalesTimeline({ days }: { days: number }) {
  const { data = [], isLoading } = useQuery<DailySale[]>({
    queryKey: ['sales-timeline', days],
    queryFn: () => api.get(`/dashboard/sales-timeline?days=${days}`).then((r) => r.data),
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-soft)' }}>Carregando...</div>
  if (data.length === 0) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-soft)' }}>Sem dados no período.</div>

  const formatted = data.map((d) => ({
    ...d,
    dateLabel: new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    revenue: Number(d.revenue),
    cost: Number(d.cost),
    profit: Number(d.profit),
  }))

  const formatBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={formatted} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7d3c52" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#7d3c52" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4a7c59" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#4a7c59" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--cream-dark)" />
        <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} tickFormatter={formatBRL} width={80} />
        <Tooltip
          formatter={(value: number, name: string) => [formatBRL(value), name === 'revenue' ? 'Receita' : name === 'profit' ? 'Lucro' : 'Custo']}
          labelFormatter={(label) => `Dia ${label}`}
          contentStyle={{ borderRadius: '8px', border: '1px solid var(--cream-dark)', fontSize: '13px' }}
        />
        <Legend formatter={(v) => v === 'revenue' ? 'Receita' : v === 'profit' ? 'Lucro' : 'Custo'} />
        <Area type="monotone" dataKey="revenue" stroke="#7d3c52" fill="url(#gRevenue)" strokeWidth={2} />
        <Area type="monotone" dataKey="profit" stroke="#4a7c59" fill="url(#gProfit)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
