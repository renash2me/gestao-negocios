import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatBRL, formatPhone } from '../../lib/format'

interface InactiveCustomer {
  customer_id: number
  customer_name: string
  phone: string | null
  days_inactive: number
  total_spent: number
}

function suggestPromo(c: InactiveCustomer): string {
  if (c.total_spent > 200 && c.days_inactive > 60)
    return '🎁 Cliente VIP sumiu — oferecer desconto exclusivo'
  if (c.total_spent > 100 && c.days_inactive > 30)
    return '💬 Mandar mensagem com novidade ou brinde'
  if (c.days_inactive > 45)
    return '📢 Incluir em promoção geral de reativação'
  return '👋 Lembrete amigável de que estamos por aqui'
}

export function InactiveCustomers({ inactiveDays }: { inactiveDays: number }) {
  const { data = [], isLoading } = useQuery<InactiveCustomer[]>({
    queryKey: ['inactive-customers', inactiveDays],
    queryFn: () => api.get(`/dashboard/inactive-customers?inactive_days=${inactiveDays}`).then((r) => r.data),
  })

  if (isLoading) return <div style={s.loading}>Carregando...</div>
  if (data.length === 0) return <div style={s.empty}>Nenhum cliente inativo no período.</div>

  return (
    <div>
      {data.slice(0, 8).map((c) => (
        <div key={c.customer_id} style={s.card}>
          <div style={s.cardHeader}>
            <div>
              <div style={s.name}>{c.customer_name}</div>
              {c.phone && <div style={s.phone}>{formatPhone(c.phone)}</div>}
            </div>
            <div style={s.stats}>
              <span style={s.badge}>{c.days_inactive} dias</span>
              <span style={s.spent}>{formatBRL(c.total_spent)}</span>
            </div>
          </div>
          <div style={s.suggestion}>{suggestPromo(c)}</div>
        </div>
      ))}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  card: {
    padding: '12px 0',
    borderBottom: '1px solid var(--cream)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: { fontSize: '14px', fontWeight: 600, color: 'var(--ink)' },
  phone: { fontSize: '12px', color: 'var(--ink-soft)', marginTop: '2px' },
  stats: { display: 'flex', alignItems: 'center', gap: '8px' },
  badge: {
    padding: '3px 8px',
    fontSize: '11px',
    fontWeight: 600,
    borderRadius: '999px',
    background: '#fbe9e7',
    color: 'var(--danger)',
  },
  spent: { fontSize: '13px', fontWeight: 500, color: 'var(--ink)' },
  suggestion: {
    marginTop: '6px',
    fontSize: '12px',
    color: 'var(--berry)',
    fontWeight: 500,
  },
  loading: { textAlign: 'center', padding: '30px', color: 'var(--ink-soft)' },
  empty: { textAlign: 'center', padding: '30px', color: 'var(--ink-soft)', fontSize: '13px' },
}
