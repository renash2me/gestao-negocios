import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatBRL } from '../../lib/format'

interface TopCustomer {
  customer_id: number
  customer_name: string
  total_purchases: number
  total_spent: number
  last_purchase: string
}

export function TopCustomersTable({ days }: { days: number }) {
  const { data = [], isLoading } = useQuery<TopCustomer[]>({
    queryKey: ['top-customers', days],
    queryFn: () => api.get(`/dashboard/top-customers?days=${days}&limit=10`).then((r) => r.data),
  })

  if (isLoading) return <div style={s.loading}>Carregando...</div>
  if (data.length === 0) return <div style={s.empty}>Sem dados no período.</div>

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>#</th>
            <th style={s.th}>Cliente</th>
            <th style={s.th}>Compras</th>
            <th style={s.th}>Total gasto</th>
            <th style={s.th}>Última compra</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c, i) => (
            <tr key={c.customer_id}>
              <td style={s.td}>
                <span style={{
                  ...s.rank,
                  background: i === 0 ? '#d4a548' : i === 1 ? '#a8a8a8' : i === 2 ? '#c8956c' : 'var(--cream)',
                  color: i < 3 ? 'var(--white)' : 'var(--ink-soft)',
                }}>
                  {i + 1}
                </span>
              </td>
              <td style={{ ...s.td, fontWeight: 500 }}>{c.customer_name}</td>
              <td style={s.td}>{c.total_purchases}</td>
              <td style={s.td}>{formatBRL(c.total_spent)}</td>
              <td style={s.td}>
                {new Date(c.last_purchase).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--ink-soft)', borderBottom: '1px solid var(--cream-dark)' },
  td: { padding: '10px 12px', fontSize: '13px', color: 'var(--ink)', borderBottom: '1px solid var(--cream)' },
  rank: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '24px', height: '24px', borderRadius: '50%',
    fontSize: '12px', fontWeight: 700,
  },
  loading: { textAlign: 'center', padding: '30px', color: 'var(--ink-soft)' },
  empty: { textAlign: 'center', padding: '30px', color: 'var(--ink-soft)', fontSize: '13px' },
}
