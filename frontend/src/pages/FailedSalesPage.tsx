import { useState, useEffect } from 'react'
import { getFailedSales, clearFailedSale, retryFailedSale, type FailedSale } from '../lib/db'
import { page } from '../components/adminStyles'

export function FailedSalesPage() {
  const [sales, setSales] = useState<FailedSale[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    setSales(await getFailedSales())
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  async function handleRetry(id: number) {
    await retryFailedSale(id)
    refresh()
  }

  async function handleDismiss(id: number) {
    if (confirm('Descartar esta venda? Os dados serão perdidos.')) {
      await clearFailedSale(id)
      refresh()
    }
  }

  function formatDate(d: Date) {
    return new Date(d).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  function formatPayload(payload: Record<string, unknown>) {
    const items = (payload.items as Array<{ product_id: number; quantity: number }>) || []
    const method = payload.payment_method as string || '?'
    const total = items.reduce((s, i) => s + i.quantity, 0)
    return `${total} itens · ${method}`
  }

  return (
    <div style={page.wrap}>
      <div style={page.header}>
        <h1 style={page.title}>Vendas com falha</h1>
        <button style={page.addBtn} onClick={refresh}>Atualizar</button>
      </div>

      <div style={{ background: 'var(--warning-light)', padding: '14px 18px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '13px', color: 'var(--warning)' }}>
        Vendas que falharam permanentemente (produto removido, erro de validação, etc). Revise e descarte ou reenvie após corrigir o problema.
      </div>

      {loading ? (
        <div style={page.loading}>Carregando...</div>
      ) : sales.length === 0 ? (
        <div style={page.empty}>Nenhuma venda com falha.</div>
      ) : (
        <div>
          {sales.map((s) => (
            <div key={s.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.ref}>Ref: {s.clientRef.slice(0, 8)}...</div>
                  <div style={styles.detail}>{formatPayload(s.payload as Record<string, unknown>)}</div>
                  <div style={styles.dates}>
                    Criada: {formatDate(s.createdAt)} · Falhou: {formatDate(s.failedAt)}
                  </div>
                </div>
                <div style={styles.error}>
                  <span style={styles.errorBadge}>{s.errorStatus || 'NET'}</span>
                  {s.errorMessage}
                </div>
              </div>
              <div style={styles.actions}>
                <button style={styles.retryBtn} onClick={() => handleRetry(s.id!)}>
                  Reenviar
                </button>
                <button style={styles.dismissBtn} onClick={() => handleDismiss(s.id!)}>
                  Descartar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    padding: '16px 20px',
    marginBottom: '12px',
    boxShadow: 'var(--shadow-sm)',
    borderLeft: '4px solid var(--danger)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '12px',
  },
  ref: { fontSize: '13px', fontWeight: 600, color: 'var(--ink)', fontFamily: 'monospace' },
  detail: { fontSize: '14px', color: 'var(--ink)', marginTop: '4px' },
  dates: { fontSize: '12px', color: 'var(--ink-soft)', marginTop: '4px' },
  error: { fontSize: '13px', color: 'var(--danger)', textAlign: 'right', maxWidth: '300px' },
  errorBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 700,
    background: '#fbe9e7',
    color: 'var(--danger)',
    borderRadius: '4px',
    marginRight: '6px',
    fontFamily: 'monospace',
  },
  actions: { display: 'flex', gap: '10px' },
  retryBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--white)',
    background: 'var(--berry)',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
  },
  dismissBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--danger)',
    background: '#fbe9e7',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
  },
}
