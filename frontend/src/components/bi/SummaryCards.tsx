import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatBRL } from '../../lib/format'

interface Summary {
  total_revenue: number
  total_cost: number
  total_profit: number
  avg_margin: number
  total_sales: number
}

export function SummaryCards({ days }: { days: number }) {
  const { data, isLoading } = useQuery<Summary>({
    queryKey: ['dashboard-summary', days],
    queryFn: () => api.get(`/dashboard/summary?days=${days}`).then((r) => r.data),
  })

  if (isLoading || !data) return <div style={styles.loading}>Carregando...</div>

  const cards = [
    { label: 'Receita', value: formatBRL(data.total_revenue), color: 'var(--berry)' },
    { label: 'Custo total', value: formatBRL(data.total_cost), color: 'var(--caramel-dark)' },
    { label: 'Lucro', value: formatBRL(data.total_profit), color: 'var(--success)' },
    { label: 'Margem média', value: `${Number(data.avg_margin).toFixed(1).replace('.', ',')}%`, color: 'var(--gold)' },
    { label: 'Total de vendas', value: String(data.total_sales), color: 'var(--ink)' },
  ]

  return (
    <div style={styles.grid}>
      {cards.map((c) => (
        <div key={c.label} style={styles.card}>
          <div style={styles.label}>{c.label}</div>
          <div style={{ ...styles.value, color: c.color }}>{c.value}</div>
        </div>
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '14px',
    marginBottom: '24px',
  },
  card: {
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    padding: '18px 20px',
    boxShadow: 'var(--shadow-sm)',
  },
  label: { fontSize: '12px', fontWeight: 600, color: 'var(--ink-soft)', marginBottom: '6px' },
  value: { fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600 },
  loading: { textAlign: 'center', padding: '20px', color: 'var(--ink-soft)' },
}
